import { defineConfig } from 'vite';

// Pocket World is served from a model folder behind a local reverse proxy, so a
// relative base keeps the built assets working no matter which path prefixes it.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5104,
  },
  preview: {
    host: true,
    port: 5104,
  },
  build: {
    target: 'es2020',
  },
});
