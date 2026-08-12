import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas para que el build funcione tanto en el servidor de
  // desarrollo como empaquetado en Electron (loadFile -> file://).
  base: './',
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
        misiones: 'misiones.html',
        acercade: 'acercade.html',
        licencia: 'licencia.html',
        catastrofes: 'catastrofes.html',
        cuerposmenores: 'cuerpos-menores.html',
        luna: 'luna.html',
        estadisticas: 'estadisticas.html',
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: true,
  },
});
