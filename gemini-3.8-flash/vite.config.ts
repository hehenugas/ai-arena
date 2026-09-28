import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5174, // choose 5174 to avoid collision if 5173 is used by another model
  },
  build: {
    target: 'es2020',
  },
});
