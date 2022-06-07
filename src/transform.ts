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

function getAllValueImportDeclarations(sourceFile: SourceFile, moduleSpecifier: string) {
  return sourceFile.getImportDeclarations().filter((declaration) => {
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

    // Combine multiple duplicate value declarations first
    const declarationsToRemove = [];
    const processedModuleSpecifiers = new Set();
    importDeclarations.forEach((importDeclaration) => {
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      // Only handle module specifiers once, as a group
      if (processedModuleSpecifiers.has(moduleSpecifier)) return;
      processedModuleSpecifiers.add(moduleSpecifier);

      const allMatchingValueImports = getAllValueImportDeclarations(sourceFile, moduleSpecifier);

      if (allMatchingValueImports.length > 1) {
        const targetDeclaration = allMatchingValueImports[0];
        allMatchingValueImports.forEach((dec, idx) => {
          // Skip the first, we'll move the others into this one
          if (idx === 0) return;

          // Might need to move over a default import
          const defaultImport = dec.getDefaultImport();
          if (defaultImport && !targetDeclaration.getDefaultImport()) {
            targetDeclaration.setDefaultImport(defaultImport.print());
            dec.removeDefaultImport();
          }

          const namedImports = dec.getNamedImports();
          namedImports.forEach((namedImport) => {
            targetDeclaration.addNamedImport(namedImport.print());
            namedImport.remove();
          });

          // If there's no remaining default import, remove the whole thing;
          if (!dec.getDefaultImport()) {
            declarationsToRemove.push(dec);
          }
        });
      }
    });

    // Remove empty declarations outside of loop
    declarationsToRemove.forEach((dec) => {
      dec.remove();
    });

    const deduplicatedImportDeclarations = sourceFile.getImportDeclarations();

    deduplicatedImportDeclarations.forEach((importDeclaration) => {
      const isTypeImportDeclaration = importDeclaration.isTypeOnly();
      const namedImports = importDeclaration.getNamedImports();
      const moduleSpecifier = importDeclaration.getModuleSpecifierValue();
      const allMatchingValueImports = getAllValueImportDeclarations(sourceFile, moduleSpecifier);
      const targetDeclaration = allMatchingValueImports[0];

      // Combine type namedImports with value imports (can't combine default type or namespace)
      if (isTypeImportDeclaration && targetDeclaration && namedImports.length) {
        namedImports.forEach((namedImport) => {
          namedImport.setIsTypeOnly(true);
          targetDeclaration.addNamedImport(namedImport.print());
        });
        importDeclaration.remove();
      }

      // Check named imports for type imports not marked as such
      if (!isTypeImportDeclaration) {
        namedImports.forEach((namedImport) => {
          // Is this a type or value import?
          const definitions = namedImport.getNameNode().getDefinitions();
          definitions.forEach((definition) => {
            // Set type import specifiers as type import if not already done
            if (typeOnlyDefinitions.includes(definition.getKind()) && !namedImport.isTypeOnly()) {
              namedImport.setIsTypeOnly(true);
            }
          });
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
