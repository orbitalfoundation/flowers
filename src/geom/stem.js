import * as THREE from 'three';
import { TAU, GOLDEN_ANGLE, clamp, lerp } from '../core/math.js';
import { buildPetalGeometry, defaultPetal } from './petal.js';

/**
 * The stem, and the leaves on it.
 *
 * The stem is a swept tube along a curve, and the curve matters more than it sounds:
 * a perfectly straight stem is the fastest way to make a flower look like clip art.
 * Real stems lean, arch, and NOD — the bloom tips off vertical, which is why a
 * daffodil looks like it's thinking and a tulip looks like it's standing to
 * attention. `nod` is that angle; `curve` bows the whole shaft; `helix` is the
 * Seussian escape hatch (real, incidentally: a cyclamen coils its peduncle into a
 * tight spring after flowering).
 *
 * The head rides at the curve's end, oriented along its final tangent — so the
 * flower always sits ON the stem no matter how absurd the stem gets. Returned in
 * `tipFrame` so the caller can dock the head there.
 */
export function stemCurve(p) {
  const s = p.stem;
  const H = s.height * p.scale;

  return function at(u, out = new THREE.Vector3()) {
    const uu = clamp(u, 0, 1);
    // A gentle bow, plus an optional helix.
    const bow = s.curve * H * Math.pow(uu, 2) * 0.5;
    const hx = s.helix * H * 0.12 * Math.sin(uu * TAU * s.helixTurns);
    const hz = s.helix * H * 0.12 * Math.cos(uu * TAU * s.helixTurns);
    // The nod: the top of the stem tips over, carrying the bloom with it.
    const nod = s.nod * H * Math.pow(uu, 3) * 0.6;
    return out.set(bow + hx + nod, H * uu, hz);
  };
}

export function buildStem(p, material) {
  const s = p.stem;
  const H = s.height * p.scale;
  if (H <= 0) return { mesh: null, tip: new THREE.Vector3(), tangent: new THREE.Vector3(0, 1, 0) };

  const at = stemCurve(p);
  const segY = 40, segR = 8;
  const pos = [], uvs = [], idx = [];
  const P = new THREE.Vector3(), Pn = new THREE.Vector3();
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segY; i++) {
    const u = i / segY;
    at(u, P);
    at(Math.min(u + 1e-3, 1), Pn);
    T.subVectors(Pn, P).normalize();
    if (T.lengthSq() < 0.5) T.copy(up);
    // A stable frame around the tangent.
    B.crossVectors(T, up);
    if (B.lengthSq() < 1e-6) B.set(1, 0, 0);
    B.normalize();
    N.crossVectors(B, T).normalize();

    const r = s.radius * p.scale * lerp(1, s.taper, u);
    for (let j = 0; j <= segR; j++) {
      const a = (j / segR) * TAU;
      const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      pos.push(
        P.x + B.x * ca + N.x * sa,
        P.y + B.y * ca + N.y * sa,
        P.z + B.z * ca + N.z * sa
      );
      uvs.push(j / segR, u);
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

  const tip = at(1, new THREE.Vector3());
  const tipPrev = at(0.985, new THREE.Vector3());
  const tangent = tip.clone().sub(tipPrev).normalize();

  return { mesh: new THREE.Mesh(g, material), tip, tangent };
}

/**
 * Leaves, arranged up the stem. Phyllotaxis one more time: `alternate` uses the
 * golden angle, `opposite` puts them in pairs, `whorled` rings them. Reusing the
 * petal sheet as a leaf is not laziness — a leaf IS the same warped sheet, and it
 * means every petal slider (ruffle, fold, curl) works on foliage for free.
 */
export function buildLeaves(p, material) {
  const l = p.leaves;
  const n = Math.round(l.count);
  if (n < 1 || l.size <= 0) return null;

  const at = stemCurve(p);
  const H = p.stem.height * p.scale;

  const shape = { ...defaultPetal(), ...l.petal, length: l.size * p.scale };
  const geo = buildPetalGeometry(shape, 14, 9);

  const perNode = l.arrangement === 'opposite' ? 2 : l.arrangement === 'whorled' ? l.whorlCount : 1;
  const nodes = Math.max(1, Math.ceil(n / perNode));
  const total = nodes * perNode;

  const mesh = new THREE.InstancedMesh(geo, material, total);
  mesh.frustumCulled = false;

  const M = new THREE.Matrix4();
  const P = new THREE.Vector3();
  const depths = new Float32Array(total);
  let k = 0;

  for (let i = 0; i < nodes; i++) {
    // Leaves climb the lower part of the stem, thinning toward the flower.
    const u = lerp(l.from, l.to, nodes > 1 ? i / (nodes - 1) : 0.5);
    at(u, P);
    const baseAzim = l.arrangement === 'alternate'
      ? i * GOLDEN_ANGLE
      : i * (Math.PI / 2);   // opposite/whorled nodes rotate 90° each, as they do

    for (let j = 0; j < perNode; j++) {
      if (k >= total) break;
      const a = baseAzim + (j / perNode) * TAU;
      // Leaves are held out and slightly down — a leaf that points up looks like a petal.
      const pitch = l.pitch;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const ca = Math.cos(a), sa = Math.sin(a);
      const d = new THREE.Vector3(sp * ca, cp, sp * sa);
      const nrm = new THREE.Vector3(-cp * ca, sp, -cp * sa);
      const b = new THREE.Vector3().crossVectors(d, nrm).normalize();

      const sc = lerp(1, l.tipScale, nodes > 1 ? i / (nodes - 1) : 0);
      M.makeBasis(b, d, nrm);
      M.scale(new THREE.Vector3(sc, sc, sc));
      M.setPosition(P.x, P.y, P.z);
      mesh.setMatrixAt(k, M);
      depths[k] = 0;
      k++;
    }
  }
  mesh.count = k;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('aDepth', new THREE.InstancedBufferAttribute(depths, 1));
  return mesh;
}
