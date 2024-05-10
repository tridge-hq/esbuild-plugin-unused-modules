import fs from 'fs';
import path from 'path';

import type { PluginBuild } from 'esbuild';
import ts from 'typescript';

const typescriptTargetByEsbuildTarget = {
  esnext: ts.ScriptTarget.ESNext,
  es2022: ts.ScriptTarget.ES2022,
  es2021: ts.ScriptTarget.ES2021,
  es2020: ts.ScriptTarget.ES2020,
  es2019: ts.ScriptTarget.ES2019,
  es2018: ts.ScriptTarget.ES2018,
  es2017: ts.ScriptTarget.ES2017,
  es2016: ts.ScriptTarget.ES2016,
  es2015: ts.ScriptTarget.ES2015,
  es5: ts.ScriptTarget.ES5,
  es6: ts.ScriptTarget.ES2015,
};

const extractUnusedFiles = (
  rootPath: string,
  callback: (unusedFiles: string[]) => void,
  options?: { excludeExp?: RegExp, tsconfigFileName?: string },
) => ({
  name: 'extractUnusedFiles',
  setup(build: PluginBuild) {
    const { excludeExp, tsconfigFileName } = options || {};
    const { initialOptions } = build;
    const validTarget = (
      initialOptions.target
        ? (
          Array.isArray(initialOptions.target)
            ? initialOptions.target[initialOptions.target.length - 1]
            : initialOptions.target
        )
        : 'esnext'
    );
    if (!initialOptions.metafile) {
      initialOptions.metafile = true;
      console.log('[extractUnusedFiles plugin]: `metafile` option of esbuild must be `true`. so metafile option value is changed to true');
    }

    const currentDirectory = ts.sys.getCurrentDirectory();
    const tsconfigFile = ts.findConfigFile(currentDirectory, ts.sys.fileExists, tsconfigFileName);
    const { options: compilerOptions } = ts.parseJsonConfigFileContent(
      JSON.parse(fs.readFileSync(tsconfigFile).toString()),
      ts.sys,
      currentDirectory,
    );

    const getAllFilePaths = (entryPath: string) => {
      const paths: string[] = [];
      const search = (directory) => {
        const files = fs.readdirSync(directory);
        files.forEach((file) => {
          const filePath = path.join(directory, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            search(filePath);
          } else if (!paths.includes(filePath)) {
            paths.push(filePath);
          }
        });
      };
      search(entryPath);
      return paths;
    };
    const getIsModule = (filePath: string) => {
      const sourceFile = ts.createSourceFile(
        filePath,
        fs.readFileSync(filePath).toString(),
        typescriptTargetByEsbuildTarget[validTarget],
      );
      let isModule = false;

      const exportSyntaxis = [
        ts.SyntaxKind.ExportAssignment,
        ts.SyntaxKind.ExportDeclaration,
        ts.SyntaxKind.ExportKeyword,
        ts.SyntaxKind.ExportSpecifier,
      ];
      const importSyntaxis = [
        ts.SyntaxKind.ImportClause,
        ts.SyntaxKind.ImportDeclaration,
        ts.SyntaxKind.ImportEqualsDeclaration,
        ts.SyntaxKind.ImportKeyword,
        ts.SyntaxKind.ImportSpecifier,
        ts.SyntaxKind.ImportType,
      ];

      const search = (node: ts.Node) => {
        if (exportSyntaxis.includes(node.kind) || importSyntaxis.includes(node.kind)) {
          isModule = true;
        } else {
          node.forEachChild((child) => {
            search(child);
          });
        }
      };
      search(sourceFile);
      return isModule;
    };
    const allFilePaths = getAllFilePaths(rootPath);

    build.onEnd((result) => {
      const buildedFilePaths = Object.keys(result.metafile.inputs).filter((filePath) => !filePath.includes('node_modules'));
      const buildedTypescriptFilePaths = buildedFilePaths.filter((filePath) => filePath.match(/\.ts$|\.tsx$/));

      const memoizedFiles = [];
      const getImportedTypescriptFiles = (entryPath: string) => {
        const usedTypescriptFiles: string[] = [entryPath];
        const search = (currentFilePath: string) => {
          const currentFileContent = fs.readFileSync(currentFilePath).toString();
          const { importedFiles } = ts.preProcessFile(currentFileContent);
          importedFiles.forEach(({ fileName: importedFileName }) => {
            const { resolvedModule } = ts.resolveModuleName(importedFileName, currentFilePath, compilerOptions, ts.sys);
            const { resolvedFileName } = resolvedModule || {};
            if (
              resolvedFileName &&
              !buildedTypescriptFilePaths.includes(resolvedFileName) &&
              !memoizedFiles.includes(resolvedFileName) &&
              !resolvedFileName.includes('node_modules')
            ) {
              memoizedFiles.push(resolvedFileName);
              usedTypescriptFiles.push(resolvedFileName);
              search(resolvedFileName);
            }
          });
        };
        search(entryPath);
        return usedTypescriptFiles;
      };

      const usedFileSet = new Set([
        ...buildedFilePaths,
        ...buildedTypescriptFilePaths.map((filePath) => getImportedTypescriptFiles(filePath)).flat(),
      ]);
      const usedFiles = (
        Array.from(usedFileSet.values())
          .map((filePath) => path.resolve(filePath).replace(`${currentDirectory}/`, ''))
      );
      const unusedFiles = (
        allFilePaths.filter((filePath) => !usedFiles.includes(filePath))
          .filter((filePath) => (excludeExp ? !filePath.match(excludeExp) : true))
          .filter((filePath) => (
            filePath.match(/\.ts$|\.tsx$|\.js$|\.jsx$/)
              ? getIsModule(filePath)
              : true
          ))
      );

      callback(unusedFiles);
    });
  },
});

export default extractUnusedFiles;
