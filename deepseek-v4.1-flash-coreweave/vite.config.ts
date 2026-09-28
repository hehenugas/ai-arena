import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the production build can be served from any sub-path or file host.
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
});
