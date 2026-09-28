import './styles/main.css';
import { AppState } from './state/AppState';
import { World } from './scene/World';
import { Controls } from './ui/Controls';

function initApp(): void {
  const sceneContainer = document.getElementById('scene-container');
  const uiContainer = document.getElementById('ui-container');

  if (!sceneContainer || !uiContainer) {
    console.error('Root containers missing from DOM');
    return;
  }

  try {
    const appState = new AppState();
    const world = new World(sceneContainer, appState);
    new Controls(uiContainer, appState, world);

    (window as any).pocketWorld = { world, appState };

    // Support query parameters for headless verification and automated screenshots
    const params = new URLSearchParams(window.location.search);
    if (params.has('time')) {
      appState.setTimeOfDay(parseFloat(params.get('time')!));
    }
    if (params.has('weather')) {
      appState.setWeather(params.get('weather') as any);
    }
    if (params.has('wind')) {
      appState.setWindStrength(parseFloat(params.get('wind')!));
    }
    if (params.has('lights')) {
      appState.setHouseLights(params.get('lights') === '1');
    }

    if (params.has('snapshot')) {
      const dataUrl = world.captureSnapshot();
      let img = document.getElementById('headless-snapshot-img') as HTMLImageElement;
      if (!img) {
        img = document.createElement('img');
        img.id = 'headless-snapshot-img';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.pointerEvents = 'none';
        img.style.zIndex = '1';
        sceneContainer.appendChild(img);
      }
      img.src = dataUrl;
      console.log('SNAPSHOT_READY_SYNCHRONOUS');
    }
  } catch (error) {
    console.error('Pocket World initialization error:', error);
    showWebGLError(sceneContainer, error instanceof Error ? error.message : 'Unknown initialization error');
  }
}

function showWebGLError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div class="webgl-error-overlay">
      <div class="webgl-error-card">
        <h2 class="webgl-error-title">WebGL Not Available</h2>
        <p class="webgl-error-desc">
          Pocket World requires WebGL to render the interactive 3D miniature diorama.<br><br>
          ${message}<br><br>
          Please check your browser settings or hardware acceleration to enjoy this experience.
        </p>
      </div>
    </div>
  `;
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
