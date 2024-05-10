# esbuild-plugin-unused
esbuild plugin for extracting unused `module` file list.

## Installation
```
npm install -D esbuild-plugin-unused
```

## Usage
```typescript
import fs from 'fs';
import { build } from 'esbuild';
import extractUnusedFiles from 'esbuild-plugin-unused';

build({
  ...options,
  plugins: [
    extractUnusedFiles('./src', (unusedFiles) => {
      // print unused file list in console
      console.log(unusedFiles);

      // write unused file list in any file
      fs.writeFileSync('unusedFiles.json', JSON.stringify(unusedFiles));

      /* ex) remove unused files, ...etc */
    })
  ],
});
```

## Configuration
```typescript
const extractUnusedFiles: (rootPath: string, callback: (unusedFiles: string[]) => void, options?: {
    excludeExp?: RegExp;
    tsconfigFileName?: string;
}) => {
    name: string;
    setup(build: PluginBuild): void;
};
```
- `excludeExp`: RegExp for excluding in unusedFiles
- `tsconfigFileName`: TypeScript config file name, 
If you are using a TypeScript config file name other than tsconfig.json, you need that option. (default: 'tsconfig.json')
