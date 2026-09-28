import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs, so the build also works behind /glm-5.3-flash-freebuff/
  // on the Caddy route instead of only at the server root.
  base: './',
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2020' },
});
