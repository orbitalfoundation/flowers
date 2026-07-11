import * as THREE from 'three';
import { clamp, lerp, smoothstep, TAU } from '../core/math.js';

/**
 * A petal.
 *
 * The atom of the whole project. A daisy's ray, a tulip's cup, a Turk's-cap lily's
 * back-flipped tepal and an orchid's labellum are ONE warped sheet with different
 * numbers in it, so this is where the expressiveness has to live.
 *
 * The sheet spans (s, t): s runs 0→1 from base (attached to the receptacle) to tip;
 * t runs −1→+1 across the width. Its shape is a stack of independent deformations,
 * each a slider:
 *
 *   outline   half-width along s. `broadAt` slides between ovate (widest low — a
 *             tulip) and spatulate (widest near the tip — a daisy ray).
 *   tip       pointed / rounded / notched / fringed. The notch is the cheapest way
 *             to read as a specific flower: an oxeye daisy's ray really does end in
 *             two or three little teeth, and you miss it until it's gone.
 *   curl      the spine's bend. NEGATIVE cups forward into a bowl (tulip, poppy);
 *             POSITIVE sweeps back (a Turk's-cap lily reflexes ~180°, tips nearly
 *             touching the pedicel). This one number carries most of the corolla
 *             taxonomy, which is why it's an arc integrated along the petal rather
 *             than a cheap lerp — at curl = π the petal has to actually come back
 *             on itself.
 *   cup       transverse gutter across t.
 *   fold      a midrib crease, so the petal has a spine instead of being limp.
 *   twist     rotation about its own long axis — what stops a whorl from looking
 *             like a paper fan.
 *   ruffle    sinusoidal margin waviness (carnations, ruffled orchids). The margin
 *             literally runs longer than the midrib, so it has to buckle.
 *
 * Local frame: base at the origin, growing along +Y, face toward +Z.
 */

export const TIP_SHAPES = ['pointed', 'rounded', 'notched', 'fringed'];

/**
 * Half-width at position s along the petal.
 *
 * `width` is a fraction of the petal's own LENGTH, not a world measurement — so it
 * reads as the inverse of the botanical L:W ratio and a petal keeps its proportions
 * when the bloom is resized. A daisy ray is L:W ≈ 5 (width 0.2); a rose petal is
 * nearly square (0.95); an oriental poppy's is genuinely wider than it is long
 * (1.15), which everyone gets wrong. Forgetting to multiply through by `length`
 * here once made every rose petal 4 cm long and 95 cm wide.
 */
function halfWidthAt(s, p) {
  const W = p.width * p.length;
  if (s <= 0) return W * p.claw * 0.5;
  if (s >= 1) return 1e-5;

  const b = clamp(p.broadAt, 0.05, 0.95);
  const rise = Math.pow(smoothstep(0, b, s), p.baseFill);
  const fall = Math.pow(smoothstep(1, b, s), p.tipFill);
  let w = Math.min(rise, fall);
  w = lerp(p.claw, 1, w) * W * 0.5;

  // Tip treatment narrows the last stretch.
  const near = smoothstep(1 - p.tipSize, 1, s);
  if (p.tip === 'pointed') w *= 1 - near * near;
  else if (p.tip === 'rounded') w *= Math.sqrt(Math.max(1 - near * near, 0));
  else w *= Math.sqrt(Math.max(1 - near * near * 0.5, 0)); // notched / fringed keep more width

  return Math.max(w, 1e-5);
}

/** How far the tip is eaten back at cross-position t (0 = not at all, negative = bitten). */
function tipCut(s, t, p) {
  if (p.notch <= 0) return 0;
  const atTip = smoothstep(1 - p.tipSize * 1.5, 1.0, s);
  if (p.tip === 'notched') {
    // One central bite: the bilobed dip of a cyclamen or a dianthus.
    return -Math.exp(-(t * t) / 0.10) * p.notch * p.tipSize * atTip;
  }
  if (p.tip === 'fringed') {
    // Many small teeth.
    const teeth = 0.5 + 0.5 * Math.cos(t * Math.PI * p.fringeTeeth);
    return -(1 - teeth) * p.notch * p.tipSize * 0.7 * atTip;
  }
  return 0;
}

/**
 * The spine: an arc in the YZ plane whose tangent turns by `curl` radians over the
 * petal's length. Integrated properly, so a fully reflexed tepal really does bend
 * back on itself instead of merely leaning.
 */
function spineAt(u, p, out) {
  const k = p.curl;
  const L = p.length;
  if (Math.abs(k) < 1e-4) {
    out.set(0, L * u, 0);
  } else {
    // ∫₀^u (cos(k·x), −sin(k·x)) dx · L
    out.set(0, (L / k) * Math.sin(k * u), (-L / k) * (1 - Math.cos(k * u)));
  }
  return out;
}

export function buildPetalGeometry(p, segS = 20, segT = 11) {
  const pos = [], uvs = [], idx = [];
  const P = new THREE.Vector3();

  for (let i = 0; i <= segS; i++) {
    const s = i / segS;
    const halfW = halfWidthAt(s, p);
    const ruffPhase = s * p.ruffleFreq * TAU;

    for (let j = 0; j <= segT; j++) {
      const t = (j / segT) * 2 - 1;

      // The tip cut shortens this column of the sheet.
      const u = clamp(s + tipCut(s, t, p), 0, 1);
      spineAt(u, p, P);

      // The spine's local frame at u: tangent T, and normal N perpendicular to it in
      // the YZ plane (the petal's "up" — the direction cup/fold/ruffle push).
      const a = p.curl * u;
      const nY = Math.sin(a), nZ = Math.cos(a);

      const x = halfW * t;
      const cup = p.cup * halfW * (t * t) * 1.2;                                  // gutter
      const fold = p.fold * halfW * (1 - Math.abs(t)) * 0.9;                      // midrib
      const ruffle = Math.sin(ruffPhase + t * 2.2) * p.ruffle * halfW * Math.abs(t) * 0.55;
      let off = cup + fold + ruffle;

      // Twist about the petal's own long axis mixes the width and normal axes.
      const tw = p.twist * s;
      const cw = Math.cos(tw), sw = Math.sin(tw);
      const wx = x * cw - off * sw;
      off = x * sw + off * cw;

      pos.push(wx, P.y + nY * off, P.z + nZ * off);
      uvs.push((t + 1) / 2, s);
    }
  }

  const row = segT + 1;
  for (let i = 0; i < segS; i++) {
    for (let j = 0; j < segT; j++) {
      const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A nectar spur: a tapered horn running BACKWARD from the petal's base.
 *  Columbine has five of them, and the genus spans ~0 mm to 16 cm — a hundredfold
 *  range in one genus, chased by bees, then hummingbirds, then hawkmoths. It is the
 *  single most rewarding thing in this project to push past its botanical range. */
export function buildSpurGeometry(p, segS = 14, segR = 8) {
  const pos = [], idx = [];
  const L = p.spur * p.length;
  if (L <= 0) return null;

  for (let i = 0; i <= segS; i++) {
    const s = i / segS;
    const r = p.spurWidth * p.length * Math.pow(1 - s, 0.6) * (1 - 0.85 * s * s);
    // The spur curves as it goes, and a long one hooks — otherwise a metre-long spur
    // is just a straight spike, which is much less funny.
    const a = p.spurCurl * s * s;
    const y = -L * s * Math.cos(a) * 0.35;
    const z = -L * s * (0.9 + 0.1 * Math.sin(a));
    for (let j = 0; j <= segR; j++) {
      const th = (j / segR) * TAU;
      pos.push(Math.cos(th) * r, y + Math.sin(th) * r * 0.9, z);
    }
  }
  for (let i = 0; i < segS; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * (segR + 1) + j, b = a + 1, c = a + (segR + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function defaultPetal() {
  return {
    length: 1.0,
    width: 0.55,
    claw: 0.3,        // width at the very base, as a fraction of `width`
    broadAt: 0.55,    // where it's widest: 0 = base (ovate), 1 = tip (spatulate)
    baseFill: 1.0,
    tipFill: 1.2,
    tip: 'rounded',
    tipSize: 0.3,
    notch: 0.0,
    fringeTeeth: 7,
    curl: -0.35,      // < 0 cups forward into a bowl; > 0 reflexes back
    cup: 0.25,
    fold: 0.1,
    twist: 0.0,
    ruffle: 0.0,
    ruffleFreq: 3.0,
    spur: 0.0,        // nectar spur length, in petal lengths
    spurWidth: 0.07,
    spurCurl: 0.6,
  };
}
