import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { csp } from './scripts/vite-csp.ts';

const monacoEsm = fileURLToPath(new URL('./node_modules/monaco-editor/esm/vs', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [preact(), csp()],
  resolve: { alias: [{ find: /^@monaco\//, replacement: monacoEsm + '/' }] },
  worker: { format: 'es' },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
  optimizeDeps: { exclude: ['pyodide'] },
});
