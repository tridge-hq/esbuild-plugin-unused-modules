import path from 'path';
import { build, Format } from 'esbuild';

const formats: Format[] = ['cjs', 'esm'];
const filenameByFormat: Omit<Record<Format, string>, 'iife'> = {
  cjs: 'index.js',
  esm: 'index.mjs',
};

(async () => {
  for (const format of formats) {
    await build({
      entryPoints: [path.resolve(__dirname, '..', 'src', 'index.ts')],
      bundle: true,
      platform: 'node',
      loader: {
        '.ts': 'ts'
      },
      external: ['path', 'fs', 'typescript'],
      outfile: path.resolve(__dirname, '..', 'build', filenameByFormat[format]),
      format,
    }).catch((e) => {
      console.error(e);
    });
  }
})();