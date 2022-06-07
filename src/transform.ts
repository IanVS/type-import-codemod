import { Project, SourceFile } from 'ts-morph';

const typeOnlyDefinitions = ['type', 'interface'];

export interface Options {
  /** Write output to stdout instead of overwriting files. */
  dryRun: boolean;
  /** Glob patterns to .ts or .tsx files. */
  globs: string[];
  /** Path to tsconfig.json file. */
  tsconfigPath: string;
}

function getValueImportDeclaration(sourceFile: SourceFile, moduleSpecifier: string) {
  return sourceFile.getImportDeclaration((declaration) => {
    const isNamespaceImport = Boolean(declaration.getNamespaceImport());
    return !declaration.isTypeOnly() && declaration.getModuleSpecifierValue() === moduleSpecifier && !isNamespaceImport;
  });
}

export default function transform({ dryRun, globs, tsconfigPath }: Options) {
  const project = new Project({
    tsConfigFilePath: tsconfigPath,
    skipFileDependencyResolution: true,
  });
  const sourceFiles = project.addSourceFilesAtPaths(globs);

  sourceFiles.forEach(async (sourceFile) => {
    const importDeclarations = sourceFile.getImportDeclarations();

    importDeclarations.forEach((importDeclaration) => {
      const isTypeImportDeclaration = importDeclaration.isTypeOnly();
      const namedImports = importDeclaration.getNamedImports();
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const matchingValueImportDeclaration = getValueImportDeclaration(sourceFile, moduleSpecifier);

      // Combine type namedImports with value imports (can't combine default type or namespace)
      if (isTypeImportDeclaration && matchingValueImportDeclaration && namedImports.length) {
        namedImports.forEach((namedImport) => {
          namedImport.setIsTypeOnly(true);
          matchingValueImportDeclaration.addNamedImport(namedImport.print());
        });
        importDeclaration.remove();
      }

      // Check named imports for type imports not marked as such
      if (!isTypeImportDeclaration) {
        namedImports.forEach((namedImport) => {
          if (isTypeImportDeclaration) {
            if (matchingValueImportDeclaration) {
            }
          } else {
            // Is this a type or value import?
            const definitions = namedImport.getNameNode().getDefinitions();
            definitions.forEach((definition) => {
              // Set type import specifiers as type import if not already done
              if (typeOnlyDefinitions.includes(definition.getKind()) && !namedImport.isTypeOnly()) {
                namedImport.setIsTypeOnly(true);
              }
            });
          }
        });
      }
    });

    if (dryRun) {
      console.log(sourceFile.print());
    } else {
      await sourceFile.save();
    }
  });
}
