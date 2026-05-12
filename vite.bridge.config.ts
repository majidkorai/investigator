import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/** IIFE bundle: no top-level `import` (required for `registerContentScripts`). */
export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: resolve(root, 'dist'),
    lib: {
      entry: resolve(root, 'src/content/bridge.ts'),
      name: 'InvestigatorBridge',
      formats: ['iife'],
      fileName: () => 'bridge.js',
    },
  },
});
