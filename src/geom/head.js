import * as THREE from 'three';
import { TAU, GOLDEN_ANGLE, clamp, lerp, hash1, mulberry32 } from '../core/math.js';
import { buildPetalGeometry, buildSpurGeometry, defaultPetal } from './petal.js';

/**
 * The head: everything above the stem — sepals, corolla, and the centre.
 *
 * Two ideas do most of the work here.
 *
 * 1. THE DOUBLING SLIDER. A double rose is not a rose with extra petals bolted on;
 *    it is a rose whose STAMENS TURNED INTO PETALS (a homeotic conversion — the
 *    organs are in the stamen positions, wearing petal identity). So `double` runs
 *    0→1 and moves organs from the stamen budget into the petal budget, conserving
 *    the total. At 0 you get a wild rose: five petals and a boss of ~100 stamens. At
 *    1 you get an English rose: 100+ petals and no visible centre at all, because
 *    the centre is *what the petals are made of*. It is the single most transforming
 *    knob in the project and it is free, because botany already did the design.
 *
 * 2. PLACEMENT IS PHYLLOTAXIS, AGAIN. Whorled flowers (a lily's 3+3, a buttercup's
 *    5) space their petals evenly and stagger successive whorls. But a rose, a lotus
 *    and a camellia pack petals on the SAME golden-angle spiral a sunflower uses for
 *    its florets — which is exactly why a 100-petal rose looks like a rose and not
 *    like a stack of pentagons. Same generator, one rung out.
 */

export const CENTER_MODES = ['stamens', 'disc', 'boss', 'corona', 'column', 'spadix', 'none'];
export const PETAL_LAYOUTS = ['whorl', 'spiral'];

/** How the doubling slider splits the organ budget between petals and stamens. */
export function organBudget(c) {
  const extra = Math.round(c.stamens * c.double);
  return {
    petals: Math.max(1, Math.round(c.count + extra)),
    stamens: Math.max(0, Math.round(c.stamens * (1 - c.double))),
  };
}

/**
 * Where each petal attaches, and which way it points.
 *
 * pitch is the angle off the flower's axis: 0 = straight up (a closed tube), 90° =
 * horizontal (a flat daisy), 180° = pointing straight down (fully reflexed — the
 * Turk's-cap lily, whose tepals fold back until they nearly touch the pedicel).
 */
function petalPlacements(c, nPetals) {
  const out = [];
  const rnd = mulberry32(c.seed >>> 0 || 7);

  for (let i = 0; i < nPetals; i++) {
    let azim, depth;   // depth: 0 = outermost petal, 1 = innermost

    if (c.layout === 'spiral') {
      // The rose/lotus/camellia case: every petal on the golden-angle spiral.
      azim = i * GOLDEN_ANGLE;
      depth = nPetals > 1 ? i / (nPetals - 1) : 0;
    } else {
      // Whorled: even spacing, and each successive whorl staggered into the gaps of
      // the one outside it, which is how a real 3+3 lily avoids shadowing itself.
      const per = Math.max(1, Math.round(c.count));
      const whorl = Math.floor(i / per);
      const k = i % per;
      const whorls = Math.max(1, Math.ceil(nPetals / per));
      azim = (k / per) * TAU + (whorl * Math.PI) / per;
      depth = whorls > 1 ? whorl / (whorls - 1) : 0;
    }

    // Inner petals are smaller, more upright, and set closer to the axis — that
    // gradient IS the shape of a rose.
    const scale = lerp(1, c.innerScale, Math.pow(depth, c.depthBias));
    const pitch = lerp(c.pitch, c.innerPitch, Math.pow(depth, c.depthBias));
    const radius = lerp(c.attachR, c.attachR * c.innerAttach, depth);
    const lift = c.attachLift * depth;

    const jit = c.jitter;
    out.push({
      azim: azim + (rnd() - 0.5) * jit * 0.5,
      pitch: pitch + (rnd() - 0.5) * jit * 0.5,
      scale: scale * (1 + (rnd() - 0.5) * jit * 0.35),
      radius, lift, depth,
      roll: (rnd() - 0.5) * jit,
    });
  }
  return out;
}

/** Orient a petal: +Y along its growth direction, +Z its face. */
function petalMatrix(pl, headR, M) {
  const { azim: a, pitch: P } = pl;
  const cp = Math.cos(P), sp = Math.sin(P);
  const ca = Math.cos(a), sa = Math.sin(a);

  // Growth direction, and the face normal perpendicular to it in the same meridian.
  const d = new THREE.Vector3(sp * ca, cp, sp * sa);
  const n = new THREE.Vector3(-cp * ca, sp, -cp * sa);
  const b = new THREE.Vector3().crossVectors(d, n).normalize();

  // Roll about the petal's own axis, so a whorl isn't a flat fan.
  if (pl.roll) {
    const q = new THREE.Quaternion().setFromAxisAngle(d, pl.roll);
    n.applyQuaternion(q); b.applyQuaternion(q);
  }

  M.makeBasis(b, d, n);
  M.scale(new THREE.Vector3(pl.scale, pl.scale, pl.scale));
  M.setPosition(ca * pl.radius * headR, pl.lift * headR, sa * pl.radius * headR);
  return M;
}

export function buildCorolla(p, materials) {
  const c = p.corolla;
  const { petals: nPetals } = organBudget(c);
  const headR = p.scale * 0.5;

  const petalShape = { ...defaultPetal(), ...c.petal, length: c.petal.length * headR };
  const geo = buildPetalGeometry(petalShape, c.segS, c.segT);

  const mesh = new THREE.InstancedMesh(geo, materials.petal, nPetals);
  mesh.frustumCulled = false;

  // The depth attribute lets the shader tint inner petals differently — a real rose
  // is paler at the heart, and a double flower's inner petals are often a different
  // colour entirely.
  const depths = new Float32Array(nPetals);

  const placements = petalPlacements(c, nPetals);
  const M = new THREE.Matrix4();
  for (let i = 0; i < nPetals; i++) {
    petalMatrix(placements[i], headR, M);
    mesh.setMatrixAt(i, M);
    depths[i] = placements[i].depth;
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depths, 1));

  const group = new THREE.Group();
  group.add(mesh);

  // Spurs: one per petal of the outermost whorl, running backwards. Columbine.
  if (petalShape.spur > 0) {
    const spurGeo = buildSpurGeometry(petalShape);
    if (spurGeo) {
      const outer = placements.filter((pl) => pl.depth < 0.5);
      const spurs = new THREE.InstancedMesh(spurGeo, materials.spur, outer.length);
      spurs.frustumCulled = false;
      for (let i = 0; i < outer.length; i++) {
        petalMatrix(outer[i], headR, M);
        spurs.setMatrixAt(i, M);
      }
      spurs.instanceMatrix.needsUpdate = true;
      group.add(spurs);
    }
  }

  return group;
}

export function buildSepals(p, materials) {
  const s = p.sepals;
  if (s.count < 1) return null;
  const headR = p.scale * 0.5;
  const shape = { ...defaultPetal(), ...s.petal, length: s.petal.length * headR };
  const geo = buildPetalGeometry(shape, 12, 7);
  const mesh = new THREE.InstancedMesh(geo, materials.sepal, Math.round(s.count));
  mesh.frustumCulled = false;
  const M = new THREE.Matrix4();
  const n = Math.round(s.count);
  for (let i = 0; i < n; i++) {
    petalMatrix({
      azim: (i / n) * TAU + s.offset, pitch: s.pitch,
      scale: 1, radius: s.attachR, lift: 0, roll: 0, depth: 0,
    }, headR, M);
    mesh.setMatrixAt(i, M);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aDepth',
    new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
  return mesh;
}

// ── the centre ───────────────────────────────────────────────────────────────
// Usually the most colourful, most textured, most *characterful* part of a flower,
// and the thing amateur flower models always skip. A lily is its rust-orange
// anthers; a poppy is a black boss on scarlet; a daffodil IS its corona.

/** A stamen: a slim filament with an anther on top. Returned as two instanced meshes. */
function buildStamens(p, materials, count, group) {
  if (count < 1) return;
  const ct = p.center;
  const headR = p.scale * 0.5;

  const filGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 5, 1);
  filGeo.translate(0, 0.5, 0);                        // base at the origin
  const antGeo = new THREE.SphereGeometry(0.5, 8, 6);
  antGeo.scale(0.45, 1.0, 0.35);                      // an anther is a flattened sac

  const fil = new THREE.InstancedMesh(filGeo, materials.filament, count);
  const ant = new THREE.InstancedMesh(antGeo, materials.anther, count);
  fil.frustumCulled = ant.frustumCulled = false;

  const rnd = mulberry32((ct.seed >>> 0) || 3);
  const M = new THREE.Matrix4(), A = new THREE.Matrix4();
  const S = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Golden angle again — a rose's stamen boss and a poppy's are packed, not ranked.
    const a = i * GOLDEN_ANGLE;
    const rr = ct.radius * headR * Math.sqrt((i + 0.5) / count);
    const len = ct.filament * headR * (0.75 + rnd() * 0.5);
    // Stamens splay outward as they rise; `spread` is what turns a tight column
    // (hibiscus) into a shaggy boss (poppy) into a chandelier (Turk's-cap lily,
    // whose stamens hang right out of the flower).
    const tilt = ct.spread * (0.35 + 0.65 * (rr / Math.max(ct.radius * headR, 1e-5)));
    const cp = Math.cos(tilt), sp = Math.sin(tilt);
    const ca = Math.cos(a), sa = Math.sin(a);

    const d = new THREE.Vector3(sp * ca, cp, sp * sa);
    const n = new THREE.Vector3(-cp * ca, sp, -cp * sa);
    const b = new THREE.Vector3().crossVectors(d, n).normalize();

    M.makeBasis(b, d, n);
    S.set(headR * 0.06, len, headR * 0.06);
    M.scale(S);
    M.setPosition(ca * rr, ct.lift * headR, sa * rr);
    fil.setMatrixAt(i, M);

    // The anther rides on the filament's tip.
    A.makeBasis(b, d, n);
    A.scale(S.set(ct.anther * headR, ct.anther * headR * 1.7, ct.anther * headR));
    A.setPosition(ca * rr + d.x * len, ct.lift * headR + d.y * len, sa * rr + d.z * len);
    ant.setMatrixAt(i, A);
  }
  fil.instanceMatrix.needsUpdate = true;
  ant.instanceMatrix.needsUpdate = true;
  group.add(fil, ant);
}

/**
 * A capitulum's disc — the sunflower's thousand florets on Vogel's spiral
 * (r = c·√n, θ = n·137.5°). The head isn't flat and it isn't uniform: florets open
 * from the RIM INWARD, so a real sunflower wears a moving annulus of gold pollen a
 * floret or two wide, with unopened dark buds inside it. That gradient is the whole
 * look, and it's one extra attribute.
 */
function buildDisc(p, materials, group) {
  const ct = p.center;
  const n = Math.round(ct.florets);
  if (n < 1) return;
  const headR = p.scale * 0.5;
  const R = ct.radius * headR;

  const geo = new THREE.CylinderGeometry(0.5, 0.32, 1, 5, 1);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, materials.floret, n);
  mesh.frustumCulled = false;

  const openness = new Float32Array(n); // 0 = a closed bud, 1 = open with pollen
  const M = new THREE.Matrix4();
  const S = new THREE.Vector3();
  const c = R / Math.sqrt(n);

  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN_ANGLE;
    const r = c * Math.sqrt(i + 0.5);
    const u = r / Math.max(R, 1e-6);              // 0 at the centre, 1 at the rim

    // The disc is a shallow dome, not a disc.
    const y = ct.lift * headR + ct.domeHeight * headR * (1 - u * u);
    const size = lerp(ct.floretSize * 0.75, ct.floretSize, u) * headR;

    // Florets open from the rim inward. `bloom` slides that wave.
    openness[i] = clamp((u - (1 - ct.bloom)) / 0.18, 0, 1);

    M.identity();
    S.set(size, size * (1 + openness[i] * 0.9), size);
    M.scale(S);
    M.setPosition(Math.cos(a) * r, y, Math.sin(a) * r);
    mesh.setMatrixAt(i, M);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aOpen', new THREE.InstancedBufferAttribute(openness, 1));
  group.add(mesh);
}

/** The poppy's boss: a fine dark stamen thicket around a flat capsule whose top is
 *  printed with radiating stigmatic rays, like a bicycle wheel. */
function buildBoss(p, materials, group) {
  const ct = p.center;
  const headR = p.scale * 0.5;
  buildStamens(p, materials, Math.round(ct.stamens), group);

  const capR = ct.capsule * headR;
  if (capR > 0) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(capR, capR * 0.82, capR * 0.75, 20, 1),
      materials.capsule
    );
    cap.position.y = ct.lift * headR + capR * 0.35;
    group.add(cap);

    // The stigmatic rays.
    const rays = Math.max(3, Math.round(ct.rays));
    const rayGeo = new THREE.BoxGeometry(1, 1, 1);
    const rayMesh = new THREE.InstancedMesh(rayGeo, materials.stigma, rays);
    const M = new THREE.Matrix4();
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU;
      M.makeRotationY(-a);
      M.scale(new THREE.Vector3(capR * 0.86, capR * 0.06, capR * 0.12));
      M.setPosition(Math.cos(a) * capR * 0.43, ct.lift * headR + capR * 0.74, Math.sin(a) * capR * 0.43);
      rayMesh.setMatrixAt(i, M);
    }
    rayMesh.instanceMatrix.needsUpdate = true;
    group.add(rayMesh);
  }
}

/** A corona — the daffodil's trumpet. Not petals at all: an outgrowth of the
 *  receptacle, which is why it can be a completely different colour. Lathed, with a
 *  frilled rim, because a smooth-rimmed trumpet reads as plastic. */
function buildCorona(p, materials, group) {
  const ct = p.center;
  const headR = p.scale * 0.5;
  const L = ct.coronaLength * headR;
  if (L <= 0) return;

  const segY = 16, segR = 32;
  const pos = [], uvs = [], idx = [];
  for (let i = 0; i <= segY; i++) {
    const v = i / segY;
    // Flares from a narrow throat to a wide mouth.
    const r = ct.radius * headR * lerp(0.45, ct.coronaFlare, Math.pow(v, ct.coronaCurve));
    for (let j = 0; j <= segR; j++) {
      const a = (j / segR) * TAU;
      // The rim frills; the throat doesn't.
      const frill = 1 + ct.coronaFrill * Math.sin(a * ct.coronaTeeth) * Math.pow(v, 3);
      pos.push(Math.cos(a) * r * frill, ct.lift * headR + L * v, Math.sin(a) * r * frill);
      // UVs are NOT optional here: the sheet shader reads uv.y as "base → tip" to run
      // the colour gradient. Without them every fragment sampled at s = 0, which is
      // inside the basal-eye mask — so the whole trumpet came out blotch-coloured,
      // i.e. a black daffodil.
      uvs.push(j / segR, v);
    }
  }
  for (let i = 0; i < segY; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * (segR + 1) + j, b = a + 1, c = a + (segR + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, materials.corona);
  group.add(mesh);

  // Anthers glinting down inside the tube.
  buildStamens(p, materials, Math.round(ct.stamens), group);
}

/** An orchid's column, or a spadix: one waxy finger. The orchid's is stamens and
 *  style FUSED into a single organ, which is a large part of why an orchid reads as
 *  having a little face. */
function buildColumn(p, materials, group, spadix = false) {
  const ct = p.center;
  const headR = p.scale * 0.5;
  const L = (spadix ? ct.spadixLength : ct.columnLength) * headR;
  if (L <= 0) return;
  const r = ct.radius * headR * (spadix ? 0.5 : 0.34);
  const geo = new THREE.CylinderGeometry(r * (spadix ? 0.75 : 0.55), r, L, 16, 1);
  geo.translate(0, L * 0.5, 0);
  const mesh = new THREE.Mesh(geo, spadix ? materials.spadix : materials.column);
  mesh.position.y = ct.lift * headR;
  // A spadix stands proud; an orchid's column tips forward over the lip.
  if (!spadix) mesh.rotation.x = ct.columnTilt;
  group.add(mesh);
}

export function buildCenter(p, materials) {
  const group = new THREE.Group();
  const ct = p.center;
  const { stamens } = organBudget(p.corolla);

  switch (ct.mode) {
    case 'stamens': buildStamens(p, materials, stamens, group); break;
    case 'disc': buildDisc(p, materials, group); break;
    case 'boss': buildBoss(p, materials, group); break;
    case 'corona': buildCorona(p, materials, group); break;
    case 'column': buildColumn(p, materials, group, false); break;
    case 'spadix': buildColumn(p, materials, group, true); break;
    case 'none': default: break;
  }
  return group;
}
