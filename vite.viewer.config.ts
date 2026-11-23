import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'src/exporter/generated',
    emptyOutDir: true,
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/viewer/standaloneEntry.ts'),
      name: 'AtmosphereViewer',
      formats: ['iife'],
      fileName: () => 'viewer-runtime.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
