import './styles.css';
import { App } from './app';

function showFallback(message: string): void {
  const fallback = document.getElementById('fallback');
  const text = document.getElementById('fallbackMessage');
  const canvas = document.getElementById('scene');
  if (text) text.textContent = message;
  if (fallback instanceof HTMLElement) fallback.hidden = false;
  if (canvas instanceof HTMLElement) canvas.style.display = 'none';
}

function boot(): void {
  const canvas = document.getElementById('scene');
  if (!(canvas instanceof HTMLCanvasElement)) {
    showFallback('The page is missing its rendering surface, so Pocket World cannot start.');
    return;
  }

  // WebGL2 is required by current Three.js builds.
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2');
  if (!gl) {
    showFallback(
      'Pocket World needs WebGL 2, which appears to be unavailable in this browser or was disabled by your settings.',
    );
    return;
  }
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  try {
    const app = new App(canvas);
    app.start();
    window.addEventListener('pagehide', () => app.dispose(), { once: true });
  } catch (error) {
    console.error('Pocket World failed to start:', error);
    const detail = error instanceof Error ? ` (${error.message})` : '';
    showFallback(`Something went wrong while starting the 3D scene${detail}.`);
  }
}

boot();
