import './style.css';
import { Store } from './state';
import { Panel } from './ui/panel';
import { detectQuality, PocketWorld } from './world';

function showFatal(title: string, detail: string): void {
  const app = document.getElementById('app') ?? document.body;
  const box = document.createElement('div');
  box.className = 'fatal';
  box.setAttribute('role', 'alert');
  box.innerHTML = `<div class="fatal__card"><h1>${title}</h1><p>${detail}</p></div>`;
  app.appendChild(box);
}

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

function boot(): void {
  const stage = document.getElementById('stage');
  const ui = document.getElementById('ui');
  if (!stage || !ui) return;

  if (!supportsWebGL2()) {
    showFatal(
      'Pocket World can’t start',
      'This browser or device doesn’t provide WebGL 2, which is needed to draw the island. ' +
        'Try a recent version of Chrome, Firefox, Safari or Edge, and make sure hardware acceleration is enabled.',
    );
    return;
  }

  const store = new Store();
  let world: PocketWorld | null = null;
  const panel = new Panel(ui, store, {
    onReset: () => world?.resetView(),
    onLayout: (insets) => world?.setInsets(insets),
  });

  try {
    world = new PocketWorld(stage, store, detectQuality(), panel.insets());
    world.start();
  } catch (err) {
    console.error(err);
    panel.root.remove();
    showFatal(
      'Pocket World couldn’t start',
      'The 3D renderer failed to initialise on this device. Reloading the page or enabling hardware acceleration may help.',
    );
    return;
  }

  stage.addEventListener('pocketworld:contextlost', () => {
    showFatal('The island drifted away', 'The graphics context was lost. Reload the page to bring it back.');
  });
}

boot();
