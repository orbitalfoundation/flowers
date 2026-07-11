// Headless geometry check: every preset and every adjacent morph must produce finite
// vertices and a sane petal count. Three builds geometry fine without WebGL.
import * as THREE from 'three';
import { SPECIES_ORDER, makeSpecies } from '../src/species/presets.js';
import { morphParams } from '../src/core/params.js';
import { buildPetalGeometry, defaultPetal } from '../src/geom/petal.js';
import { organBudget } from '../src/geom/head.js';
import { buildStem } from '../src/geom/stem.js';

let fail = 0;
const firstNaN = (a) => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return i; return -1; };

function check(label, p) {
  const errs = [];

  // The petal sheet itself.
  const shape = { ...defaultPetal(), ...p.corolla.petal, length: p.corolla.petal.length * p.scale * 0.5 };
  const g = buildPetalGeometry(shape);
  const pos = g.attributes.position.array;
  const nrm = g.attributes.normal.array;
  if (firstNaN(pos) >= 0) errs.push(`NaN petal position @${firstNaN(pos)}`);
  if (firstNaN(nrm) >= 0) errs.push(`NaN petal normal @${firstNaN(nrm)}`);
  g.computeBoundingBox();
  const size = new THREE.Vector3();
  g.boundingBox.getSize(size);
  if (size.length() <= 0) errs.push('petal has zero extent');

  // The doubling slider must conserve the organ budget.
  const b = organBudget(p.corolla);
  if (b.petals < 1) errs.push('no petals');
  if (b.petals > 4000) errs.push(`absurd petal count ${b.petals}`);

  const { mesh, tip } = buildStem(p, new THREE.MeshBasicMaterial());
  if (mesh) {
    const sp = mesh.geometry.attributes.position.array;
    if (firstNaN(sp) >= 0) errs.push('NaN stem position');
  }
  if (!Number.isFinite(tip.x + tip.y + tip.z)) errs.push('NaN stem tip');

  const line = `${String(b.petals).padStart(4)} petals ${String(b.stamens).padStart(4)} stamens ` +
               `${String(Math.round(p.inflorescence.count)).padStart(3)} blooms`;
  if (errs.length) { fail++; console.log(`FAIL ${label.padEnd(24)} ${line}  ${errs.join('; ')}`); }
  else console.log(`ok   ${label.padEnd(24)} ${line}`);
  g.dispose();
}

for (const id of SPECIES_ORDER) check(id, makeSpecies(id));

console.log('\nmorph checks:');
for (let i = 0; i < SPECIES_ORDER.length - 1; i++) {
  const a = makeSpecies(SPECIES_ORDER[i]), b = makeSpecies(SPECIES_ORDER[i + 1]);
  check(`${SPECIES_ORDER[i]} ↔ ${SPECIES_ORDER[i + 1]}`, morphParams(a, b, 0.5));
}

console.log('\nextremes (the silly knobs must not explode):');
const wild = makeSpecies('columbine');
wild.corolla.petal.spur = 8; wild.corolla.double = 1; wild.stem.helix = 2;
check('columbine, maxed', wild);
const dbl = makeSpecies('rose');
dbl.corolla.double = 1; dbl.corolla.stamens = 400;
check('rose, fully double', dbl);

console.log(fail ? `\n${fail} FAILURES` : '\nALL PASS');
process.exit(fail ? 1 : 0);
