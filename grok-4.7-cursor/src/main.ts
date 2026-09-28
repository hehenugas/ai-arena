import "./style.css";
import * as THREE from "three";
import { bindHousePicking, createCameraRig } from "./interaction/controls";
import { detectQuality } from "./quality";
import { createState } from "./state";
import { createWorld } from "./scene/world";
import { createPanel } from "./ui/panel";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const overlay = document.querySelector<HTMLElement>("#overlay");

if (!canvas || !overlay) {
  throw new Error("Pocket World is missing its page structure.");
}

const view: HTMLCanvasElement = canvas;
const hud: HTMLElement = overlay;

let running = true;

function showFallback(message: string, view: HTMLCanvasElement, hud: HTMLElement): void {
  running = false;
  view.style.display = "none";
  hud.replaceChildren();
  const fallback = document.querySelector<HTMLElement>("#fallback");
  if (!fallback) return;
  fallback.hidden = false;
  fallback.replaceChildren();
  const title = document.createElement("h1");
  title.textContent = "Pocket World";
  const copy = document.createElement("p");
  copy.textContent = message;
  fallback.append(title, copy);
}

function boot(): void {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  if (!gl) {
    showFallback("Pocket World needs WebGL to draw the island. Try another browser, or turn on hardware acceleration.", view, hud);
    return;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: view,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.error(error);
    showFallback("Pocket World could not start a graphics context. Try another browser, or turn on hardware acceleration.", view, hud);
    return;
  }

  if (!renderer.getContext()) {
    showFallback("Pocket World needs WebGL to draw the island. This browser could not start a graphics context.", view, hud);
    return;
  }

  const quality = detectQuality();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor("#d7e6f2");

  const state = createState();
  const rig = createCameraRig(view);
  const world = createWorld(renderer, rig.camera, quality);
  let elapsed = 0;

  const panel = createPanel(hud, state, {
    onHour: (hour) => {
      state.hour = hour;
    },
    onWeather: (weather) => {
      state.weather = weather;
    },
    onWind: (wind) => {
      state.wind = wind;
    },
    onLights: (lightsOn) => {
      state.lightsOn = lightsOn;
    },
    onReset: () => {
      state.reset();
      rig.reset();
      world.update(0, elapsed, state, true);
      panel.sync();
    },
  });

  bindHousePicking(view, rig.camera, world.floating, () => {
    state.lightsOn = !state.lightsOn;
    panel.sync();
  });

  const resize = () => {
    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, 1);
    rig.camera.aspect = width / height;
    rig.camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap));
    renderer.setSize(width, height, false);
  };
  resize();
  window.addEventListener("resize", resize);

  view.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      showFallback("The graphics context was lost. Reload the page to bring the island back.", view, hud);
    },
    { once: true },
  );

  let last = performance.now();
  world.update(0, 0, state, true);
  renderer.render(world.scene, rig.camera);
  document.body.dataset.ready = "true";

  const frame = (now: number) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    rig.update();
    world.update(dt, elapsed, state);
    renderer.render(world.scene, rig.camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (error) {
  console.error(error);
  showFallback("Pocket World could not start. Reload the page to try again.", view, hud);
}
