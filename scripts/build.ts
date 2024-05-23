import path from 'path';
import { build, Format } from 'esbuild';

const filenameByFormat: Omit<Record<Format, string>, 'iife'> = {
  cjs: 'index.js',
  esm: 'index.mjs',
};

(async () => {
  // CommonJS Build
  await build({
    entryPoints: [path.resolve(__dirname, '..', 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    loader: {
      '.ts': 'ts'
    },
    external: ['path', 'fs', 'typescript'],
    outfile: path.resolve(__dirname, '..', 'build', filenameByFormat['cjs']),
    format: 'cjs',
  }).catch((e) => {
    console.error(e);
  });
  // ESModule Build
  await build({
    entryPoints: [path.resolve(__dirname, '..', 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    loader: {
      '.ts': 'ts'
    },
    external: ['path', 'fs', 'typescript'],
    outfile: path.resolve(__dirname, '..', 'build', filenameByFormat['esm']),
    format: 'esm',
  }).catch((e) => {
    console.error(e);
  });
})();