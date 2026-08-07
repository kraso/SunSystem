import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        planetario: 'planetario.html',
        constelaciones: 'constelaciones.html',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true,
  },
});
