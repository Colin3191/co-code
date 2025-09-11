import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: '../webview-ui-dist/',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    cors: {
      origin: '*',
      methods: '*',
      allowedHeaders: '*',
    },
  },
});
