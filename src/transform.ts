/* eslint-disable import/no-default-export, unicorn/no-array-callback-reference */
import { API, FileInfo, ASTPath, ImportDeclaration } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const ast = j(file.source);

  // Collect a map of source to nodePath
  const typeImportMap = new Map<string, ASTPath<ImportDeclaration>>();

  // Find type imports
  ast
    .find(j.ImportDeclaration, {
      importKind: 'type',
    })
    .forEach((nodePath) => {
      const { node } = nodePath;
      const source = node.source.value;
      if (typeof source === 'string') {
        if (typeImportMap.has(source)) {
          // Add specifiers to what's already in the map for this source
          const prev = typeImportMap.get(source);
          prev.node.specifiers.push(...node.specifiers);
        } else {
          typeImportMap.set(source, nodePath);
        }
      }
    });

  // Look for value imports with the same source as a type import
  ast
    .find(j.ImportDeclaration, {
      importKind: 'value',
    })
    .forEach((nodePath) => {
      const { node } = nodePath;
      const source = node.source.value;

      // Cannot combine with namespace imports
      const isNamespaceImport = node.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier');
      if (isNamespaceImport) return;

      if (typeof source === 'string' && typeImportMap.has(source)) {
        const otherNode = typeImportMap.get(source);

        const typeSpecifiers = otherNode.node.specifiers.map((s) => {
          // @ts-expect-error
          s.importKind = 'type';
          return s;
        });

        // Add type imports to the end
        node.specifiers.push(...typeSpecifiers);
        typeImportMap.delete(source);
      }
    });

  // Remove type imports that we combined into value imports, return results
  return ast
    .find(j.ImportDeclaration, {
      importKind: 'type',
    })
    .filter((nodePath) => {
      const { node } = nodePath;
      const source = node.source.value;
      return typeof source === 'string' && !typeImportMap.has(source);
    })
    .remove()
    .toSource();
}
