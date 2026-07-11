import * as THREE from 'three';
import { TAU, GOLDEN_ANGLE, lerp, mulberry32 } from '../core/math.js';
import { buildCorolla, buildSepals, buildCenter } from './head.js';
import { buildStem, buildLeaves } from './stem.js';

/**
 * One plant: a stem, its leaves, and one or more blooms docked at the top.
 *
 * The head is built once and re-used across an inflorescence, because a foxglove
 * with eighty flowers should cost about what a foxglove with one costs. The blooms
 * are Groups sharing the same instanced geometry, which is cheap.
 */

/** Build a single bloom (sepals + corolla + centre) as its own group, axis = +Y. */
function buildBloom(p, materials) {
  const g = new THREE.Group();
  const sepals = buildSepals(p, materials);
  if (sepals) g.add(sepals);
  g.add(buildCorolla(p, materials));
  g.add(buildCenter(p, materials));
  return g;
}

/**
 * Where the blooms go.
 *
 * raceme — flowers up a spire, on short pedicels, opening BOTTOM-UP: a real foxglove
 *          shows seed capsules at the bottom, open bells in the middle and tight buds
 *          at the tip, all at once. `openSkew` is that gradient, and without it a
 *          foxglove looks like a plastic Christmas tree.
 * umbel  — pedicels radiating from one point to a sphere's surface: an allium.
 * cyme   — a loose branched spray, each flower on its own stalk.
 * bouquet— not botany at all: a handful of stems gathered and fanned, because the
 *          whole point of flowers is that people put them in a vase.
 */
function bloomPlacements(p) {
  const inf = p.inflorescence;
  const n = Math.max(1, Math.round(inf.count));
  const rnd = mulberry32(inf.seed >>> 0 || 5);
  const H = p.stem.height * p.scale;
  const out = [];

  if (inf.mode === 'single' || n === 1) {
    out.push({ pos: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 1, 0), scale: 1, open: 1 });
    return out;
  }

  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0;
    let pos, dir, scale = 1, open = 1;

    if (inf.mode === 'raceme') {
      // Up the spire, spiralling, each on a short outward pedicel.
      const a = i * GOLDEN_ANGLE;
      const y = lerp(-inf.axisLength * H * 0.45, inf.axisLength * H * 0.12, u);
      const r = inf.spread * p.scale * (1 - u * 0.35);
      pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      // Flowers on a raceme hang outward and a little down.
      dir = new THREE.Vector3(Math.cos(a) * 0.85, -0.25, Math.sin(a) * 0.85).normalize();
      // Bottom-up: the top of the spire is still in bud.
      open = 1 - Math.pow(u, 1.0) * inf.openSkew;
      scale = lerp(1, inf.sizeFalloff, u) * open;
    } else if (inf.mode === 'umbel') {
      // A sphere of florets on radiating pedicels — an allium.
      const a = i * GOLDEN_ANGLE;
      const y0 = 1 - 2 * ((i + 0.5) / n);           // a Fibonacci sphere
      const r0 = Math.sqrt(Math.max(1 - y0 * y0, 0));
      const R = inf.spread * H * 0.35;
      dir = new THREE.Vector3(Math.cos(a) * r0, y0, Math.sin(a) * r0).normalize();
      pos = dir.clone().multiplyScalar(R);
      scale = inf.sizeFalloff;
    } else if (inf.mode === 'cyme') {
      const a = i * GOLDEN_ANGLE;
      const r = inf.spread * H * 0.3 * Math.sqrt((i + 0.5) / n);
      const y = (rnd() - 0.3) * inf.axisLength * H * 0.18;
      pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      dir = new THREE.Vector3(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize();
      scale = lerp(1, inf.sizeFalloff, rnd());
    } else { // bouquet
      const a = i * GOLDEN_ANGLE;
      const r = inf.spread * H * 0.4 * Math.sqrt((i + 0.5) / n);
      const y = (rnd() - 0.5) * inf.axisLength * H * 0.12;
      pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      // Fan outward, as a hand-tied bunch does.
      dir = new THREE.Vector3(Math.cos(a) * inf.spread * 0.5, 1, Math.sin(a) * inf.spread * 0.5).normalize();
      scale = lerp(0.85, 1.0, rnd());
    }
    out.push({ pos, dir, scale, open });
  }
  return out;
}

export class Flower extends THREE.Group {
  constructor(params, materials) {
    super();
    this.params = params;
    this.materials = materials;

    const { mesh: stemMesh, tip, tangent } = buildStem(params, materials.stem);
    this.stemTip = tip;
    if (stemMesh) this.add(stemMesh);

    const leaves = buildLeaves(params, materials.leaf);
    if (leaves) this.add(leaves);

    // The head rides at the top of the stem, aligned with its final tangent — so
    // however absurdly the stem curls, the bloom still sits ON it.
    const head = new THREE.Group();
    head.position.copy(tip);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    this.add(head);
    this.head = head;

    this.blooms = [];
    for (const pl of bloomPlacements(params)) {
      const b = buildBloom(params, materials);
      b.position.copy(pl.pos);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pl.dir);
      b.scale.setScalar(pl.scale);
      head.add(b);
      this.blooms.push(b);
    }

    // Every plant gets its own wind phase, so a bouquet doesn't pulse as one object.
    this.windPhase = (params.inflorescence.seed % 17) * 0.37;
  }

  /** The whole plant, roots to bloom. Used to size the sky and the ground. */
  get span() {
    const box = new THREE.Box3().setFromObject(this);
    const size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.y, size.z) || this.params.scale;
  }

  /**
   * The BLOOM — which is the actual subject. Framing on the whole plant put a 26 cm
   * sunflower head on a 1.6 m stalk and dutifully filled the screen with stalk. A
   * flower toy should look at the flower; the stem can run off the bottom of frame,
   * as it does in every photograph of a flower ever taken.
   *
   * For an inflorescence (a foxglove's spire, an allium's globe) the subject is the
   * whole cluster, so this measures the head group rather than a single bloom.
   */
  get headFrame() {
    this.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.head);
    if (box.isEmpty()) {
      return { center: new THREE.Vector3(0, this.stemTip.y, 0), span: this.params.scale };
    }
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { center, span: Math.max(size.x, size.y, size.z, this.params.scale * 0.5) };
  }

  get stats() {
    let petals = 0, tris = 0;
    this.traverse((o) => {
      if (!o.geometry) return;
      const n = o.isInstancedMesh ? o.count : 1;
      if (o.material === this.materials.petal) petals += n;
      const idx = o.geometry.index;
      if (idx) tris += (idx.count / 3) * n;
    });
    return { petals, tris: Math.round(tris), blooms: this.blooms.length };
  }

  dispose() {
    this.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
