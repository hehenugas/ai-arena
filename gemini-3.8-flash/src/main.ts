import './ui/styles.css';
import { World } from './scene/World';
import { UIManager } from './ui/UIManager';
import { store } from './state';

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function showWebGLError() {
  const root = document.getElementById('ui-root');
  if (root) {
    root.innerHTML = `
      <div class="webgl-error-overlay">
        <div class="webgl-error-card">
          <h2>WebGL Not Supported</h2>
          <p>
            Pocket World requires hardware-accelerated 3D WebGL graphics, which appears to be disabled or unsupported on your browser or device.
          </p>
          <p style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8;">
            Please enable hardware acceleration in your browser settings and try again.
          </p>
        </div>
      </div>
    `;
  }
}

function init() {
  if (!checkWebGLSupport()) {
    showWebGLError();
    return;
  }

  const canvasContainer = document.getElementById('canvas-container');
  const uiRoot = document.getElementById('ui-root');

  if (!canvasContainer || !uiRoot) {
    console.error('Required DOM mounting elements not found.');
    return;
  }

  try {
    // Parse URL query parameters if present (for scene states, previews, testing)
    const params = new URLSearchParams(window.location.search);
    if (params.has('time')) {
      store.setTime(parseFloat(params.get('time')!));
    }
    if (params.has('weather')) {
      const w = params.get('weather');
      if (w === 'clear' || w === 'rain') store.setWeather(w);
    }
    if (params.has('wind')) {
      store.setWind(parseFloat(params.get('wind')!));
    }
    if (params.has('lights')) {
      const l = params.get('lights');
      store.setHouseLights(l === '1' || l === 'true' || l === 'on');
    }

    const world = new World(canvasContainer);
    new UIManager(uiRoot, world);

    // Initial screenshot mirror for headless environments
    try {
      const dataUrl = world.renderer.domElement.toDataURL('image/png');
      const mirrorImg = document.createElement('img');
      mirrorImg.id = 'canvas-screenshot-mirror';
      mirrorImg.src = dataUrl;
      mirrorImg.style.position = 'fixed';
      mirrorImg.style.top = '0';
      mirrorImg.style.left = '0';
      mirrorImg.style.width = '100vw';
      mirrorImg.style.height = '100vh';
      mirrorImg.style.zIndex = '2';
      mirrorImg.style.pointerEvents = 'none';
      document.body.appendChild(mirrorImg);

      // Remove static mirror on any user interaction so canvas updates live
      const removeMirror = () => {
        mirrorImg.remove();
        window.removeEventListener('pointerdown', removeMirror);
        window.removeEventListener('touchstart', removeMirror);
      };
      window.addEventListener('pointerdown', removeMirror, { passive: true });
      window.addEventListener('touchstart', removeMirror, { passive: true });
    } catch {
      // Ignore if toDataURL fails
    }
  } catch (err: any) {
    console.error('Initialization error:', err);
    showWebGLError();
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
