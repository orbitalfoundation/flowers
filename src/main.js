import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

import { makeSpecies, SPECIES, SPECIES_ORDER } from './species/presets.js';
import { morphParams, clone } from './core/params.js';
import { Flower } from './geom/flower.js';
import { CENTER_MODES, PETAL_LAYOUTS } from './geom/head.js';
import { TIP_SHAPES } from './geom/petal.js';
import { makeMaterials, applySkin } from './shading/materials.js';
import { buildSky } from './scene/sky.js';
import { buildLensFlare } from './scene/lensflare.js';
import { makeWind } from './scene/wind.js';
import { encodeGenome, encodeGenomeSync, decodeGenome } from './genome.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.005, 800);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.autoRotateSpeed = 0.8;
controls.minDistance = 0.02;
controls.maxDistance = 60;

const sky = buildSky(scene, renderer);
const flare = buildLensFlare(renderer);
const wind = makeWind();

// The meadow the flowers stand in.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1, 64),
  new THREE.MeshStandardMaterial({ color: 0x5f8442, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let params = makeSpecies('sunflower');
let genomeBase = { s: 'sunflower' };
let currentSpecies = 'sunflower';
let materials = makeMaterials(params, wind.shared);
let flower = null;

const ui = {
  blendTo: 'poppy',
  morph: 0,
  autoRotate: false,
  windStrength: 0.35,
  windSpeed: 1.1,
  windDir: 0,
  flare: true,
  sunElevation: 22,
  sunAzimuth: 135,
  exposure: 1.0,
};

function frameCamera(preserve = false) {
  // Look at the BLOOM, not the whole plant — the stem is allowed to run out of frame.
  const { center, span: bloom } = flower.headFrame;
  const plant = flower.span;
  const dist = bloom * 2.1 + 0.05;

  if (!preserve) {
    // A shallow look-down (~17°): enough to open up a sunflower's disc, but not so
    // steep that the view falls into the ground hemisphere and loses the sky. Look
    // down 35° and the whole background turns green — the flower needs blue behind
    // it, which means the camera stays near the bloom's own height.
    const off = new THREE.Vector3(0.45, 0.3, 1.0).normalize().multiplyScalar(dist);
    camera.position.copy(center).add(off);
    controls.target.copy(center);
  } else {
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1);
    controls.target.copy(center);
    camera.position.copy(controls.target).addScaledVector(dir.normalize(), dist);
  }

  // The sky is sized to the plant, and the far plane put safely beyond it — a fixed
  // dome radius meant a small flower's far plane clipped the sky away entirely.
  const domeR = sky.setScale(plant);
  camera.near = Math.max(0.002, bloom * 0.01);
  camera.far = domeR * 2.5;
  camera.updateProjectionMatrix();
  ground.scale.setScalar(Math.max(plant * 6, 1));
}

function rebuild(preserveCamera = true) {
  if (flower) { scene.remove(flower); flower.dispose(); }
  applySkin(materials, params);
  flower = new Flower(params, materials);
  scene.add(flower);

  // Every material's wind block needs to know how tall this plant is, so the bend
  // scales with the plant rather than being a fixed number of metres.
  const H = Math.max(params.stem.height * params.scale, 1e-3);
  for (const m of Object.values(materials)) {
    if (m.userData.wind) {
      m.userData.wind.uPlantHeight.value = H;
      m.userData.wind.uPhase.value = flower.windPhase;
    }
  }

  frameCamera(preserveCamera);
  updateLabels();
}

function updateLabels() {
  document.getElementById('species-name').textContent = params.displayName;
  const c = params.corolla;
  const bits = [`${(params.scale * 100).toFixed(0)} cm bloom`];
  if (c.double > 0.02) bits.push(`${Math.round(c.double * 100)}% double`);
  bits.push(params.center.mode === 'none' ? 'no centre' : params.center.mode);
  if (params.inflorescence.mode !== 'single') {
    bits.push(`${params.inflorescence.mode} ×${Math.round(params.inflorescence.count)}`);
  }
  document.getElementById('mode-line').textContent = bits.join(' · ');
}

// ---- GUI ----------------------------------------------------------------------
const gui = new GUI({ title: '🌸 flowers' });
gui.domElement.id = 'gui-panel';
if (gui.$title) gui.$title.style.display = 'none';

function syncInto(target, source) {
  for (const k of Object.keys(target)) if (!(k in source)) delete target[k];
  for (const k of Object.keys(source)) {
    const sv = source[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      syncInto(target[k], sv);
    } else {
      target[k] = Array.isArray(sv) ? clone(sv) : sv;
    }
  }
}
const refreshControllers = () => { for (const c of gui.controllersRecursive()) c.updateDisplay(); };

function setSpecies(id) {
  currentSpecies = id;
  ui.morph = 0;
  genomeBase = { s: id };
  syncInto(params, makeSpecies(id));
  rebuild(false);
  highlightSpecies(id);
  refreshControllers();
  scheduleUrlUpdate();
}

function applyMorph() {
  const a = makeSpecies(currentSpecies);
  const b = makeSpecies(ui.blendTo);
  genomeBase = ui.morph > 0 ? { s: currentSpecies, b: ui.blendTo, t: ui.morph } : { s: currentSpecies };
  syncInto(params, morphParams(a, b, ui.morph));
  rebuild(true);
  refreshControllers();
  scheduleUrlUpdate();
}

let structuralPending = false;
const structural = () => { structuralPending = true; };
const onSkin = () => applySkin(materials, params);

// -- Explore
const fExplore = gui.addFolder('explore');
const LABELS = {
  sunflower: 'Sunflower', rose: 'Rose', tulip: 'Tulip', daisy: 'Daisy', poppy: 'Poppy',
  lily: 'Lily', morningglory: 'Morning', foxglove: 'Foxglove', daffodil: 'Daffodil',
  columbine: 'Columbine', passionflower: 'Passion', fuchsia: 'Fuchsia', lotus: 'Lotus',
  allium: 'Allium', anthurium: 'Anthurium', pansy: 'Pansy', protea: 'Protea',
  snapdragon: 'Snapdragon', buttercup: 'Buttercup',
};
const chips = {};
const highlightSpecies = (id) => {
  for (const k in chips) chips[k].classList.toggle('active', k === id);
};
(function buildChips() {
  const bar = document.createElement('div');
  bar.className = 'species-chips';
  for (const id of SPECIES_ORDER) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = LABELS[id] || id;
    b.addEventListener('click', () => setSpecies(id));
    chips[id] = b;
    bar.appendChild(b);
  }
  const c = fExplore.$children || fExplore.domElement;
  c.insertBefore(bar, c.firstChild);
})();
fExplore.add(ui, 'blendTo', SPECIES_ORDER).name('blend toward');
fExplore.add(ui, 'morph', 0, 1, 0.001).name('blend amount').onChange(applyMorph).listen();

// -- The corolla: the heart of the toy
const fCor = gui.addFolder('petals');
fCor.add(params, 'scale', 0.01, 0.6, 0.005).name('bloom size (m)').onChange(structural);
fCor.add(params.corolla, 'count', 1, 60, 1).name('petals per whorl').onChange(structural);
// The single best knob in the project: a double rose is a rose whose stamens became
// petals, so this conserves the organ budget and eats the centre as it fills in.
fCor.add(params.corolla, 'double', 0, 1, 0.01).name('★ doubling (stamens→petals)').onChange(structural);
fCor.add(params.corolla, 'stamens', 0, 400, 1).name('stamen budget').onChange(structural);
fCor.add(params.corolla, 'layout', PETAL_LAYOUTS).name('layout').onChange(structural);
fCor.add(params.corolla, 'pitch', 0, 3.14, 0.01).name('pitch (tube→flat→reflex)').onChange(structural);
fCor.add(params.corolla, 'innerPitch', 0, 3.14, 0.01).name('inner pitch').onChange(structural);
fCor.add(params.corolla, 'innerScale', 0.05, 1.2, 0.01).name('inner size').onChange(structural);
fCor.add(params.corolla, 'attachR', 0.0, 0.8, 0.01).name('attach radius').onChange(structural);
fCor.add(params.corolla, 'jitter', 0, 1, 0.01).name('disorder').onChange(structural);
fCor.open();

// -- Petal shape
const fP = gui.addFolder('petal shape');
const pp = params.corolla.petal;
fP.add(pp, 'length', 0.1, 3, 0.01).name('length').onChange(structural);
fP.add(pp, 'width', 0.05, 2, 0.01).name('width').onChange(structural);
fP.add(pp, 'claw', 0.02, 1, 0.01).name('base width').onChange(structural);
fP.add(pp, 'broadAt', 0.05, 0.95, 0.01).name('widest at').onChange(structural);
fP.add(pp, 'tip', TIP_SHAPES).name('tip').onChange(structural);
fP.add(pp, 'notch', 0, 1, 0.01).name('notch depth').onChange(structural);
fP.add(pp, 'curl', -2, 6, 0.02).name('curl (cup ↔ reflex)').onChange(structural);
fP.add(pp, 'cup', -1, 1.5, 0.01).name('cupping').onChange(structural);
fP.add(pp, 'fold', -1, 1, 0.01).name('midrib fold').onChange(structural);
fP.add(pp, 'twist', -2, 2, 0.02).name('twist').onChange(structural);
fP.add(pp, 'ruffle', 0, 1.5, 0.01).name('ruffle').onChange(structural);
fP.add(pp, 'ruffleFreq', 1, 14, 0.5).name('ruffle frequency').onChange(structural);
// Columbine runs 0 to 16 cm of spur inside one genus. There is no reason to stop there.
fP.add(pp, 'spur', 0, 8, 0.05).name('★ nectar spur').onChange(structural);
fP.add(pp, 'spurCurl', -3, 3, 0.05).name('spur curl').onChange(structural);
fP.close();

// -- The centre
const fC = gui.addFolder('centre');
fC.add(params.center, 'mode', CENTER_MODES).name('type').onChange(structural);
fC.add(params.center, 'radius', 0.01, 1, 0.01).name('radius').onChange(structural);
fC.add(params.center, 'filament', 0.02, 2, 0.01).name('stamen length').onChange(structural);
fC.add(params.center, 'anther', 0.005, 0.3, 0.005).name('anther size').onChange(structural);
fC.add(params.center, 'spread', 0, 1.57, 0.01).name('spread').onChange(structural);
fC.add(params.center, 'stamens', 0, 600, 1).name('boss stamens').onChange(structural);
fC.add(params.center, 'florets', 0, 3000, 1).name('disc florets').onChange(structural);
fC.add(params.center, 'bloom', 0, 1, 0.01).name('florets open (rim→in)').onChange(structural);
fC.add(params.center, 'coronaLength', 0, 3, 0.02).name('corona/trumpet').onChange(structural);
fC.close();

// -- Inflorescence: bunches
const fI = gui.addFolder('bunches & arrangements');
fI.add(params.inflorescence, 'mode', ['single', 'raceme', 'umbel', 'cyme', 'bouquet'])
  .name('arrangement').onChange(structural);
fI.add(params.inflorescence, 'count', 1, 300, 1).name('how many blooms').onChange(structural);
fI.add(params.inflorescence, 'spread', 0, 3, 0.02).name('spread').onChange(structural);
fI.add(params.inflorescence, 'sizeFalloff', 0.1, 1.2, 0.01).name('size falloff').onChange(structural);
fI.add(params.inflorescence, 'openSkew', 0, 1, 0.01).name('open bottom-up').onChange(structural);
fI.open();

// -- Stem & leaves
const fS = gui.addFolder('stem & leaves');
fS.add(params.stem, 'height', 0, 60, 0.2).name('stem height').onChange(structural);
fS.add(params.stem, 'radius', 0.002, 0.2, 0.002).name('stem thickness').onChange(structural);
fS.add(params.stem, 'curve', -1, 1, 0.01).name('bow').onChange(structural);
fS.add(params.stem, 'nod', -2, 3, 0.02).name('★ nod').onChange(structural);
fS.add(params.stem, 'helix', 0, 2, 0.02).name('★ Seuss (helix)').onChange(structural);
fS.add(params.stem, 'helixTurns', 0.5, 8, 0.5).name('helix turns').onChange(structural);
fS.add(params.leaves, 'count', 0, 20, 1).name('leaves').onChange(structural);
fS.add(params.leaves, 'size', 0.1, 4, 0.05).name('leaf size').onChange(structural);
fS.add(params.leaves, 'arrangement', ['alternate', 'opposite', 'whorled']).name('leaf phyllotaxis').onChange(structural);
fS.close();

// -- Optics
const fO = gui.addFolder('petal optics');
fO.add(params.skin, 'translucency', 0, 1, 0.01).name('translucency (poppy)').onChange(onSkin);
fO.add(params.skin, 'velvet', 0, 1, 0.01).name('velvet (pansy)').onChange(onSkin);
fO.add(params.skin, 'gloss', 0, 1, 0.01).name('gloss (buttercup)').onChange(onSkin);
fO.add(params.skin, 'roughness', 0.03, 1, 0.01).name('roughness').onChange(onSkin);
fO.add(params.skin, 'iridescence', 0, 1, 0.01).name('iridescence').onChange(onSkin);
fO.add(params.skin, 'veins', 0, 1, 0.01).name('veins').onChange(onSkin);
fO.add(params.skin, 'spots', 0, 1, 0.01).name('spots (foxglove)').onChange(onSkin);
fO.add(params.skin, 'eyeSize', 0, 1, 0.01).name('dark eye').onChange(onSkin);
fO.addColor(params.skin, 'petalBase').name('petal (base)').onChange(onSkin);
fO.addColor(params.skin, 'petalTip').name('petal (tip)').onChange(onSkin);
fO.addColor(params.skin, 'eyeColor').name('eye / spots').onChange(onSkin);
fO.addColor(params.skin, 'antherColor').name('anther').onChange(onSkin);
fO.close();

// -- Sky & wind
const fW = gui.addFolder('sky & wind');
fW.add(ui, 'windStrength', 0, 1.5, 0.01).name('wind').onChange((v) => (wind.strength = v));
fW.add(ui, 'windSpeed', 0, 4, 0.05).name('wind speed').onChange((v) => (wind.speed = v));
fW.add(ui, 'windDir', 0, 360, 1).name('wind direction').onChange((v) => wind.setDirection(v));
fW.add(ui, 'sunElevation', -5, 88, 0.5).name('sun elevation').onChange(applySky);
fW.add(ui, 'sunAzimuth', 0, 360, 1).name('sun azimuth').onChange(applySky);
fW.add(ui, 'exposure', 0.3, 2, 0.01).name('exposure').onChange(applySky);
fW.add(ui, 'flare').name('lens flare');
fW.add(ui, 'autoRotate').name('turntable').onChange((v) => (controls.autoRotate = v));
fW.open();

function applySky() {
  sky.params.elevation = ui.sunElevation;
  sky.params.azimuth = ui.sunAzimuth;
  sky.params.exposure = ui.exposure;
  sky.apply();
}

gui.add({ share: shareFlower }, 'share').name('🔗 copy link to this flower');

// ---- shareable URL ------------------------------------------------------------
let urlTimer = 0, urlSeq = 0;
function scheduleUrlUpdate() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(async () => {
    const seq = ++urlSeq;
    const code = await encodeGenome(params, genomeBase);
    if (seq === urlSeq) history.replaceState(null, '', `${location.origin}${location.pathname}#flower=${code}`);
  }, 500);
}
function shareFlower() {
  const fast = encodeGenomeSync(params, genomeBase);
  if (fast !== null) copyShareUrl(fast);
  else encodeGenome(params, genomeBase).then(copyShareUrl);
}
function copyShareUrl(code) {
  const url = `${location.origin}${location.pathname}#flower=${code}`;
  history.replaceState(null, '', url);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(
      () => toast('link copied — share your flower!'),
      () => toast('copy failed — the URL is in the address bar')
    );
  } else toast('URL updated — copy it from the address bar');
}
async function loadGenomeFromHash() {
  const m = location.hash.match(/#flower=(.+)/);
  if (!m) return false;
  try {
    const { params: tree, base } = await decodeGenome(m[1]);
    syncInto(params, tree);
    genomeBase = base ?? { s: SPECIES[params.id] ? params.id : 'sunflower' };
    return true;
  } catch (e) { console.warn('bad flower code in URL', e); return false; }
}
let toastTimer = 0;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:30;padding:9px 16px;border-radius:999px;background:rgba(28,44,66,.92);color:#eaf2ff;font:600 12px ui-sans-serif,system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);transition:opacity .3s;backdrop-filter:blur(6px);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
}
gui.onChange(scheduleUrlUpdate);

// ---- panel --------------------------------------------------------------------
const panelTab = document.getElementById('panel-tab');
gui.domElement.addEventListener('click', (e) => e.stopPropagation());
panelTab?.addEventListener('click', () => document.body.classList.toggle('panel-open'));
if (innerWidth > 560) document.body.classList.add('panel-open');

// ---- boot ---------------------------------------------------------------------
(async () => {
  const shared = await loadGenomeFromHash();
  if (shared) {
    currentSpecies = genomeBase.s;
    if (genomeBase.b != null) { ui.blendTo = genomeBase.b; ui.morph = genomeBase.t; }
  }
  wind.strength = ui.windStrength;
  wind.speed = ui.windSpeed;
  applySky();
  rebuild(false);
  highlightSpecies(currentSpecies);
  refreshControllers();
  document.getElementById('loader').style.opacity = '0';
  setTimeout(() => document.getElementById('loader')?.remove(), 700);
  animate();
})();

// ---- loop ---------------------------------------------------------------------
const hud = document.getElementById('hud');
const clock = new THREE.Clock();
let frames = 0, fpsT = 0, fps = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (structuralPending) { structuralPending = false; rebuild(true); }

  wind.update(dt);
  controls.update();
  renderer.render(scene, camera);

  // The flare composites over the finished frame, and the flower occludes it.
  if (ui.flare) flare.render(camera, sky.sun, [flower], dt);
  else flare.enabled = false;

  frames++; fpsT += dt;
  if (fpsT >= 0.5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
  const s = flower.stats;
  hud.textContent = `${params.id}  ·  ${s.petals} petals  ·  ${s.blooms} bloom${s.blooms === 1 ? '' : 's'}  ·  ${(s.tris / 1000).toFixed(0)}k tris  ·  ${fps} fps`;
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.FLOWERS = {
  get params() { return params; },
  flower: () => flower,
  setSpecies,
  share: shareFlower,
  encode: () => encodeGenome(params, genomeBase),
  setWind(v) { ui.windStrength = v; wind.strength = v; refreshControllers(); },
  rebuild: () => rebuild(true),
};
