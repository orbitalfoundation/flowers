import { lerpTree, lerpHex, clone } from './math.js';
import { defaultPetal } from '../geom/petal.js';

/**
 * A flower IS this tree.
 *
 * Where fruit was a body of revolution wearing three fields, a flower is a set of
 * CONCENTRIC WHORLS on a receptacle — sepals, petals, stamens, carpels, outside in —
 * and almost every flower in the world is that plan with different counts, different
 * fusions and different degrees of exaggeration. So the tree follows the botany:
 * sepals, corolla, centre, stem, leaves, and the inflorescence that groups them.
 *
 * The one non-obvious knob is `corolla.double`. A double rose is not a rose with
 * petals added; it's a rose whose STAMENS BECAME PETALS. So `double` moves organs
 * from the stamen budget into the petal budget and conserves the total — turn it up
 * and the flower fills in and its centre disappears, because the centre is what the
 * new petals are made of. It's free, it's correct, and it's the best knob here.
 */
export function defaultParams() {
  return {
    id: 'daisy',
    displayName: 'Generic Daisy',
    scale: 0.09,           // the bloom's diameter, in metres

    corolla: {
      count: 8,            // petals per whorl (or the base count before doubling)
      stamens: 40,         // the stamen budget — doubling eats into this
      double: 0.0,         // 0 = single (stamens visible), 1 = fully double (no centre)
      layout: 'whorl',     // 'whorl' | 'spiral' (a rose/lotus packs on the golden angle)
      pitch: 1.35,         // radians off the flower's axis. 0 = a closed tube,
                           // π/2 = a flat daisy, π = fully reflexed (Turk's-cap lily)
      innerPitch: 1.0,     // inner whorls stand more upright
      innerScale: 0.65,    // ...and are smaller
      innerAttach: 0.5,
      depthBias: 1.0,
      attachR: 0.12,       // how far out from the axis the petals attach
      attachLift: 0.0,
      jitter: 0.06,
      seed: 7,
      segS: 20,
      segT: 11,
      petal: defaultPetal(),
    },

    sepals: {
      count: 5,
      pitch: 2.1,          // sepals usually fold back under the flower
      attachR: 0.1,
      offset: 0.4,
      petal: { ...defaultPetal(), length: 0.55, width: 0.3, tip: 'pointed', curl: 0.5 },
    },

    center: {
      mode: 'stamens',     // see geom/head.js CENTER_MODES
      radius: 0.16,        // as a fraction of the bloom's radius
      lift: 0.0,
      filament: 0.22,      // stamen length
      anther: 0.05,
      spread: 0.35,        // 0 = a tight column (hibiscus), high = a shaggy boss (poppy)
      stamens: 60,         // used by 'boss' — the poppy's hundreds of fine dark filaments
      seed: 3,

      florets: 400,        // 'disc': a real sunflower runs 700–3000
      floretSize: 0.045,
      domeHeight: 0.03,
      bloom: 0.35,         // florets open from the rim inward; this slides that wave

      capsule: 0.11,       // 'boss': the poppy's flat-topped capsule…
      rays: 10,            // …printed with radiating stigmatic rays, like a wheel

      coronaLength: 0.5,   // 'corona': the daffodil's trumpet, which is NOT petals
      coronaFlare: 1.0,
      coronaCurve: 2.0,
      coronaFrill: 0.12,
      coronaTeeth: 12,

      columnLength: 0.3,   // 'column': an orchid's fused stamens-and-style
      columnTilt: 0.5,
      spadixLength: 1.2,   // 'spadix': anthurium, calla
    },

    stem: {
      height: 4.0,         // in bloom diameters
      radius: 0.035,
      taper: 0.75,
      curve: 0.05,         // a gentle bow
      nod: 0.0,            // the bloom tips off vertical — a daffodil nods, a tulip doesn't
      helix: 0.0,          // the Seussian escape hatch
      helixTurns: 2.0,
    },

    leaves: {
      count: 4,
      size: 0.9,
      arrangement: 'alternate',  // 'alternate' (golden angle) | 'opposite' | 'whorled'
      whorlCount: 3,
      pitch: 1.9,
      from: 0.12,
      to: 0.62,
      tipScale: 0.7,
      petal: { ...defaultPetal(), width: 0.35, tip: 'pointed', curl: 0.3, cup: 0.15 },
    },

    // How flowers group. A sunflower is solitary; a foxglove is a one-sided spire of
    // eighty; an allium is a sphere of hundreds.
    inflorescence: {
      mode: 'single',      // 'single' | 'raceme' | 'umbel' | 'cyme' | 'bouquet'
      count: 1,
      spread: 0.35,
      axisLength: 1.0,
      sizeFalloff: 0.85,
      openSkew: 0.6,       // a raceme opens bottom-up, so the top is still in bud
      seed: 11,
    },

    skin: {
      petalBase: 0xffd166,
      petalTip: 0xf5a81b,
      sepalBase: 0x5e7f35,
      sepalTip: 0x6e8f45,
      leafBase: 0x3e6b2e,
      leafTip: 0x4e7b33,
      coronaBase: 0xf6a61e,
      coronaTip: 0xe8721c,

      eyeColor: 0x3b2416,     // the dark basal blotch
      veinColor: 0xd8a521,
      innerColor: 0xfff0c0,   // petals deep inside a double
      discColor: 0x4a2a1c,
      filamentColor: 0xf0e4c0,
      antherColor: 0xd8a521,
      capsuleColor: 0xc9d19a,
      stigmaColor: 0x8fa34e,
      columnColor: 0xf4efe6,
      spadixColor: 0xf4e06a,
      stemColor: 0x4e7b33,

      eyeSize: 0.0,
      eyeSoft: 0.6,
      veins: 0.15,
      spots: 0.0,
      spotSize: 0.5,
      innerMix: 0.3,

      // The three optical classes, straight from the botany.
      translucency: 0.45,  // poppy: three cell layers thick, lit from within
      velvet: 0.15,        // pansy: conical cells, the blackest surface in botany
      gloss: 0.15,         // buttercup: a thin film over an air layer — a mirror
      roughness: 0.55,
      iridescence: 0.0,    // real (tulips, Hibiscus trionum) but only over a dark eye
    },
  };
}

/** Blend two flowers. Numbers lerp, colours lerp in colour space, enums snap. */
export function morphParams(a, b, t) {
  const out = lerpTree(a, b, t);
  for (const k of Object.keys(a.skin)) {
    if (typeof a.skin[k] === 'number' && k.toLowerCase().includes('color')) {
      out.skin[k] = lerpHex(a.skin[k], b.skin[k], t);
    }
  }
  const snap = (path, key) => { out[path][key] = t < 0.5 ? a[path][key] : b[path][key]; };
  snap('corolla', 'layout');
  snap('corolla', 'petal');
  snap('center', 'mode');
  snap('leaves', 'arrangement');
  snap('inflorescence', 'mode');
  out.corolla.petal = lerpTree(a.corolla.petal, b.corolla.petal, t);
  out.corolla.petal.tip = t < 0.5 ? a.corolla.petal.tip : b.corolla.petal.tip;

  for (const [g, k] of [['corolla', 'count'], ['corolla', 'stamens'], ['sepals', 'count'],
    ['center', 'florets'], ['center', 'stamens'], ['center', 'rays'],
    ['leaves', 'count'], ['inflorescence', 'count']]) {
    out[g][k] = Math.round(out[g][k]);
  }

  out.id = t < 0.5 ? a.id : b.id;
  out.displayName = t <= 0 ? a.displayName : t >= 1 ? b.displayName
    : `${a.displayName} ↔ ${b.displayName}`;
  return out;
}

export { clone };
