import { defaultParams } from '../core/params.js';
import { defaultPetal } from '../geom/petal.js';

/**
 * Eighteen flowers chosen to span the morphospace rather than the florist's shop.
 *
 * Numbers are real where the botany gave real ones: a sunflower head carries
 * 700–3000 disc florets on the golden-angle spiral with 20–40 ray florets round the
 * rim; an oxeye daisy's ray really does end in two or three little teeth; a
 * Turk's-cap lily reflexes about 180° until its tepal tips nearly touch the pedicel,
 * throwing its rust-orange anthers right out of the flower on 3 cm filaments; a
 * columbine has FIVE spurs. Colours are calibrated from reference imagery.
 *
 * Where the model can only approximate — a snapdragon's hinged two-lipped mouth, a
 * bird of paradise's fused blue arrow — the preset says so rather than pretending.
 */

const P = (o) => ({ ...defaultPetal(), ...o });

// ── flat and radial ──────────────────────────────────────────────────────────

/** Sunflower: not one flower but a thousand. The rays are sterile ligules; the disc
 *  is 700–3000 tiny florets on the 137.5° spiral, opening from the rim inward, so a
 *  real head wears a moving annulus of gold pollen with dark buds inside it. */
function sunflower() {
  const p = defaultParams();
  p.id = 'sunflower'; p.displayName = 'Sunflower';
  p.scale = 0.26;
  p.corolla = {
    ...p.corolla,
    count: 30, stamens: 0, double: 0, layout: 'whorl',
    pitch: 1.42, innerPitch: 1.35, innerScale: 1.0, innerAttach: 1.0,
    attachR: 0.42, jitter: 0.1, seed: 4,
    petal: P({ length: 0.95, width: 0.30, claw: 0.35, broadAt: 0.62, tip: 'notched',
      notch: 0.35, tipSize: 0.18, curl: -0.25, cup: 0.35, fold: 0.25 }),
  };
  p.sepals = { ...p.sepals, count: 16, pitch: 2.3, attachR: 0.44,
    petal: P({ length: 0.4, width: 0.22, tip: 'pointed', curl: 0.4 }) };
  p.center = { ...p.center, mode: 'disc', radius: 0.44, florets: 900,
    floretSize: 0.028, domeHeight: 0.05, bloom: 0.4 };
  // A sunflower faces outward, not up — a mature head hangs toward the horizon (and
  // toward the east). Tipping it is what turns a disc seen edge-on into a face.
  p.stem = { ...p.stem, height: 6.0, radius: 0.06, taper: 0.8, curve: 0.06, nod: 0.7 };
  p.leaves = { ...p.leaves, count: 5, size: 1.0, arrangement: 'alternate', pitch: 1.75,
    petal: P({ width: 0.75, broadAt: 0.35, tip: 'pointed', curl: 0.35, cup: 0.2, ruffle: 0.1 }) };
  Object.assign(p.skin, {
    petalBase: 0xf5a81b, petalTip: 0xffc21e, sepalBase: 0x5e7f35, sepalTip: 0x6e8f45,
    eyeColor: 0xb8791a, veinColor: 0xe0ae2c, veins: 0.25, eyeSize: 0.18, eyeSoft: 0.8,
    discColor: 0x4a2a1c, antherColor: 0xd8a521, stemColor: 0x4e7b33,
    leafBase: 0x3e6b2e, leafTip: 0x4e7b33,
    translucency: 0.42, velvet: 0.12, gloss: 0.1, roughness: 0.6,
  });
  return p;
}

/** Oxeye daisy: white rays with the little teeth at the tip that everyone forgets,
 *  and a flat pure-yellow disc with no dark bud zone (unlike a sunflower). */
function daisy() {
  const p = defaultParams();
  p.id = 'daisy'; p.displayName = 'Oxeye Daisy';
  p.scale = 0.05;
  p.corolla = {
    ...p.corolla,
    count: 26, stamens: 0, double: 0, layout: 'whorl',
    pitch: 1.5, innerPitch: 1.45, innerScale: 1, innerAttach: 1,
    attachR: 0.3, jitter: 0.08, seed: 2,
    petal: P({ length: 1.0, width: 0.2, claw: 0.4, broadAt: 0.7, tip: 'fringed',
      notch: 0.22, tipSize: 0.12, fringeTeeth: 3, curl: -0.15, cup: 0.3, fold: 0.3 }),
  };
  p.sepals = { ...p.sepals, count: 12, pitch: 2.4, attachR: 0.3,
    petal: P({ length: 0.3, width: 0.14, tip: 'pointed' }) };
  p.center = { ...p.center, mode: 'disc', radius: 0.3, florets: 260,
    floretSize: 0.04, domeHeight: 0.045, bloom: 1.0 };
  p.stem = { ...p.stem, height: 8.0, radius: 0.06, curve: 0.1 };
  p.leaves = { ...p.leaves, count: 3, size: 0.7, pitch: 2.0 };
  Object.assign(p.skin, {
    petalBase: 0xe4e7e0, petalTip: 0xfdfdf5, discColor: 0xf5c71a,
    antherColor: 0xf5c71a, veins: 0.1, eyeSize: 0.05,
    sepalBase: 0x5d7a3b, sepalTip: 0x6d8a4b, stemColor: 0x5d7a3b,
    translucency: 0.55, velvet: 0.1, gloss: 0.12, roughness: 0.5,
  });
  return p;
}

/** Buttercup: the gloss flower. Its epidermis is a ~3 µm thin film over an actual
 *  air layer above a starch reflector — a genuine mirror, which is why it lights up
 *  your chin. Clearcoat all the way up. */
function buttercup() {
  const p = defaultParams();
  p.id = 'buttercup'; p.displayName = 'Buttercup';
  p.scale = 0.025;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 65, double: 0, layout: 'whorl',
    pitch: 1.15, innerPitch: 1.0, attachR: 0.14, jitter: 0.05, seed: 9,
    petal: P({ length: 1.0, width: 0.95, claw: 0.22, broadAt: 0.62, tip: 'rounded',
      curl: -0.55, cup: 0.4, fold: 0.05 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.5, attachR: 0.12 };
  p.center = { ...p.center, mode: 'stamens', radius: 0.2, filament: 0.2,
    anther: 0.045, spread: 0.5 };
  p.stem = { ...p.stem, height: 10, radius: 0.08, curve: 0.15 };
  p.leaves = { ...p.leaves, count: 3, size: 0.9, pitch: 2.0 };
  Object.assign(p.skin, {
    petalBase: 0xefd86e, petalTip: 0xf7d31a, veinColor: 0xe8c318, veins: 0.12,
    antherColor: 0xe8b41a, filamentColor: 0xf0c818, stemColor: 0x5e8446,
    translucency: 0.3, velvet: 0.0, gloss: 1.0, roughness: 0.06,
  });
  return p;
}

// ── cupped and bowled ────────────────────────────────────────────────────────

/** Tulip: six free tepals in a goblet, and a centre of extreme contrast — six
 *  flattened near-black anthers around a stout trigonal ovary. */
function tulip() {
  const p = defaultParams();
  p.id = 'tulip'; p.displayName = 'Tulip';
  p.scale = 0.075;
  p.corolla = {
    ...p.corolla,
    count: 6, stamens: 6, double: 0, layout: 'whorl',
    pitch: 0.42, innerPitch: 0.3, innerScale: 0.95, innerAttach: 0.85,
    attachR: 0.12, jitter: 0.05, seed: 3,
    petal: P({ length: 1.5, width: 0.85, claw: 0.35, broadAt: 0.55, tip: 'rounded',
      curl: -0.5, cup: 0.55, fold: 0.1 }),
  };
  // Six tepals: the 3+3 monocot plan, flattened into one staggered whorl.
  p.sepals = { ...p.sepals, count: 0 };  // a tulip's "sepals" ARE tepals; it has none
  p.center = { ...p.center, mode: 'stamens', radius: 0.1, filament: 0.4,
    anther: 0.09, spread: 0.16, lift: 0.02 };
  p.stem = { ...p.stem, height: 6.0, radius: 0.08, curve: 0.05, nod: 0.0 };
  p.leaves = { ...p.leaves, count: 3, size: 1.8, arrangement: 'alternate', pitch: 1.55,
    from: 0.02, to: 0.35, petal: P({ width: 0.22, broadAt: 0.4, tip: 'pointed',
      curl: 0.55, cup: 0.35, fold: 0.3 }) };
  Object.assign(p.skin, {
    petalBase: 0xf2c34a, petalTip: 0xe0313e, eyeColor: 0x171316, eyeSize: 0.1, eyeSoft: 0.5,
    veinColor: 0xc02030, veins: 0.12, antherColor: 0x2b2320, filamentColor: 0xf0e4c0,
    stemColor: 0x6e8b4a, leafBase: 0x8fa97a, leafTip: 0x9fb98a,
    translucency: 0.5, velvet: 0.15, gloss: 0.35, roughness: 0.35,
    iridescence: 0.25,   // tulips really do have cuticle diffraction gratings
  });
  return p;
}

/** Oriental poppy: petals WIDER than they are long (a trait everyone gets wrong),
 *  crepe-textured, and a black boss of hundreds of fine stamens around a flat capsule
 *  printed with radiating stigmatic rays. Nearly all the drama is the centre. */
function poppy() {
  const p = defaultParams();
  p.id = 'poppy'; p.displayName = 'Oriental Poppy';
  p.scale = 0.13;
  p.corolla = {
    ...p.corolla,
    count: 4, stamens: 0, double: 0, layout: 'whorl',
    pitch: 0.95, innerPitch: 0.8, innerScale: 0.9, innerAttach: 0.8,
    attachR: 0.1, jitter: 0.12, seed: 6,
    petal: P({ length: 0.95, width: 1.15, claw: 0.3, broadAt: 0.55, tip: 'rounded',
      curl: -0.7, cup: 0.35, fold: 0.02, ruffle: 0.18, ruffleFreq: 4 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'boss', radius: 0.2, stamens: 220,
    filament: 0.17, anther: 0.028, spread: 0.55, capsule: 0.13, rays: 12 };
  p.stem = { ...p.stem, height: 5.5, radius: 0.03, curve: 0.12, nod: 0.03 };
  p.leaves = { ...p.leaves, count: 3, size: 1.0, pitch: 2.1,
    petal: P({ width: 0.4, tip: 'pointed', ruffle: 0.4, ruffleFreq: 6, curl: 0.3 }) };
  Object.assign(p.skin, {
    // The base is a deep red, not black — the BLOTCH does the black, and confining it
    // to the eye keeps the petal from reading as a dark skirt from below.
    petalBase: 0xc4321e, petalTip: 0xe8482a, eyeColor: 0x2e1218,
    eyeSize: 0.2, eyeSoft: 0.5, veinColor: 0x9e2a18, veins: 0.25,
    antherColor: 0x191014, filamentColor: 0x2a1c22,
    capsuleColor: 0xc9d19a, stigmaColor: 0x8fa34e, stemColor: 0x7e8f5c,
    // The archetypal lit-from-within flower. Three cell layers thick.
    translucency: 0.95, velvet: 0.2, gloss: 0.05, roughness: 0.65,
  });
  return p;
}

/** Lotus: 20–30 free tepals on a spiral (not whorls), around a flat-topped yellow
 *  receptacle — a showerhead, pitted with embedded carpels. Nothing else looks like
 *  it. Cultivated forms reach 1000+ petals, so it's also the doubling slider's home. */
function lotus() {
  const p = defaultParams();
  p.id = 'lotus'; p.displayName = 'Sacred Lotus';
  p.scale = 0.22;
  p.corolla = {
    ...p.corolla,
    count: 24, stamens: 300, double: 0.02, layout: 'spiral',
    pitch: 0.85, innerPitch: 0.42, innerScale: 0.55, innerAttach: 0.35,
    depthBias: 0.9, attachR: 0.1, jitter: 0.08, seed: 15,
    petal: P({ length: 1.1, width: 0.62, claw: 0.25, broadAt: 0.5, tip: 'pointed',
      tipSize: 0.35, curl: -0.55, cup: 0.5, fold: 0.15 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'boss', radius: 0.16, stamens: 260,
    filament: 0.28, anther: 0.035, spread: 0.28, capsule: 0.17, rays: 0, lift: 0.02 };
  p.stem = { ...p.stem, height: 5.5, radius: 0.03, curve: 0.05 };
  p.leaves = { ...p.leaves, count: 2, size: 1.6, pitch: 1.5,
    petal: P({ width: 1.5, broadAt: 0.5, tip: 'rounded', curl: -0.3, cup: 0.5 }) };
  Object.assign(p.skin, {
    petalBase: 0xfbf3f5, petalTip: 0xf2a8c0, veinColor: 0xe88aac, veins: 0.35,
    innerColor: 0xfde8ee, innerMix: 0.5,
    capsuleColor: 0xc6d46a, filamentColor: 0xf2e3a8, antherColor: 0xe8c860,
    stigmaColor: 0x8fa34e, stemColor: 0x5e7a3e, leafBase: 0x4e7a4e, leafTip: 0x6e9a6e,
    translucency: 0.55, velvet: 0.25, gloss: 0.12, roughness: 0.5,
  });
  return p;
}

// ── doubled ──────────────────────────────────────────────────────────────────

/** Rose: the doubling slider made flesh. A wild rose is five petals and ~120
 *  stamens; a garden rose is those stamens CONVERTED into petals. Spiral packing —
 *  which is exactly why a 100-petal rose reads as a rose and not a stack of pentagons. */
function rose() {
  const p = defaultParams();
  p.id = 'rose'; p.displayName = 'Garden Rose';
  p.scale = 0.09;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 120, double: 0.78, layout: 'spiral',
    pitch: 1.15, innerPitch: 0.22, innerScale: 0.42, innerAttach: 0.22,
    depthBias: 1.35, attachR: 0.16, attachLift: 0.1, jitter: 0.12, seed: 21,
    petal: P({ length: 1.0, width: 0.95, claw: 0.3, broadAt: 0.6, tip: 'rounded',
      curl: -0.75, cup: 0.5, fold: 0.05, twist: 0.15, ruffle: 0.12 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.5, attachR: 0.16,
    petal: P({ length: 0.6, width: 0.2, tip: 'pointed', curl: 0.6 }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.1, filament: 0.14,
    anther: 0.035, spread: 0.4 };
  p.stem = { ...p.stem, height: 6.5, radius: 0.06, curve: 0.08 };
  p.leaves = { ...p.leaves, count: 5, size: 0.75, arrangement: 'alternate', pitch: 1.95,
    petal: P({ width: 0.5, tip: 'pointed', curl: 0.2, cup: 0.15, ruffle: 0.25, ruffleFreq: 8 }) };
  Object.assign(p.skin, {
    petalBase: 0xd94a78, petalTip: 0xb0132a, innerColor: 0xe87a9c, innerMix: 0.45,
    eyeColor: 0xf2d06b, eyeSize: 0.1, eyeSoft: 0.9, veinColor: 0x8e1024, veins: 0.1,
    antherColor: 0xe8c34a, filamentColor: 0xf5eeda,
    sepalBase: 0x4a6b2f, sepalTip: 0x5a7b3f, stemColor: 0x4a6b2f,
    leafBase: 0x2f5a28, leafTip: 0x3f6a38,
    translucency: 0.35, velvet: 0.55, gloss: 0.1, roughness: 0.62,
  });
  return p;
}

// ── reflexed ─────────────────────────────────────────────────────────────────

/** Turk's-cap lily: tepals reflex ~180° until their tips nearly touch the pedicel,
 *  which throws the six stamens right OUT of the flower on long filaments — a
 *  chandelier. The centre is outside the flower, which is the whole point. */
function lily() {
  const p = defaultParams();
  p.id = 'lily'; p.displayName = "Turk's-cap Lily";
  p.scale = 0.075;
  p.corolla = {
    ...p.corolla,
    count: 6, stamens: 6, double: 0, layout: 'whorl',
    pitch: 1.95, innerPitch: 1.9, innerScale: 0.95, innerAttach: 0.9,
    attachR: 0.14, jitter: 0.06, seed: 12,
    // Positive curl = swept back. This is the big one: ~2.6 rad of reflex.
    petal: P({ length: 1.5, width: 0.5, claw: 0.35, broadAt: 0.45, tip: 'pointed',
      tipSize: 0.3, curl: 1.85, cup: 0.3, fold: 0.25, twist: 0.1 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'stamens', radius: 0.06, filament: 0.85,
    anther: 0.1, spread: 0.42, lift: -0.02 };
  p.stem = { ...p.stem, height: 7.0, radius: 0.10, curve: 0.06, nod: 0.55 };
  p.leaves = { ...p.leaves, count: 9, size: 0.8, arrangement: 'whorled', whorlCount: 3,
    pitch: 1.85, petal: P({ width: 0.3, tip: 'pointed', curl: 0.3 }) };
  p.inflorescence = { ...p.inflorescence, mode: 'single', count: 1 };
  Object.assign(p.skin, {
    petalBase: 0xd9a0b0, petalTip: 0xb4657d, eyeColor: 0x4a1c2e,
    eyeSize: 0.0, spots: 0.35, spotSize: 0.22, veinColor: 0x8e4a60, veins: 0.15,
    antherColor: 0xc2531b, filamentColor: 0xc6a87e, stigmaColor: 0x9daf6b,
    stemColor: 0x4e6b3a, leafBase: 0x3e5b2a, leafTip: 0x4e6b3a,
    translucency: 0.5, velvet: 0.3, gloss: 0.2, roughness: 0.5,
  });
  return p;
}

/** Fuchsia: a pendant ballerina — four sepals reflexed past vertical over a skirt of
 *  petals, with stamens and style dangling far BELOW the flower. The whole
 *  composition hangs, so the stem nods hard. */
function fuchsia() {
  const p = defaultParams();
  p.id = 'fuchsia'; p.displayName = 'Fuchsia';
  p.scale = 0.05;
  p.corolla = {
    ...p.corolla,
    count: 4, stamens: 8, double: 0, layout: 'whorl',
    pitch: 0.55, innerPitch: 0.45, innerScale: 0.9, innerAttach: 0.8,
    attachR: 0.14, jitter: 0.07, seed: 18,
    petal: P({ length: 0.95, width: 0.62, claw: 0.4, broadAt: 0.55, tip: 'rounded',
      curl: -0.65, cup: 0.5, fold: 0.1, ruffle: 0.2 }),
  };
  // The sepals are the showy part, and they flip back past 90°.
  p.sepals = { ...p.sepals, count: 4, pitch: 1.15, attachR: 0.1,
    petal: P({ length: 1.5, width: 0.32, claw: 0.5, broadAt: 0.4, tip: 'pointed',
      tipSize: 0.35, curl: 1.9, cup: 0.3, fold: 0.25 }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.07, filament: 0.95,
    anther: 0.05, spread: 0.2 };
  p.stem = { ...p.stem, height: 4.5, radius: 0.025, curve: 0.1, nod: 1.6 };
  p.leaves = { ...p.leaves, count: 4, size: 0.8, arrangement: 'opposite', pitch: 2.0 };
  Object.assign(p.skin, {
    petalBase: 0x7a3aa8, petalTip: 0x5c2a8c, sepalBase: 0xe8557e, sepalTip: 0xd91e4a,
    veinColor: 0x4a1a6a, veins: 0.2, innerColor: 0x8e5ac0, innerMix: 0.3,
    antherColor: 0xc08aa8, filamentColor: 0xe0577e, stigmaColor: 0xf5d0dc,
    stemColor: 0x7e3b4a, leafBase: 0x3a6b3a, leafTip: 0x4a7b4a,
    translucency: 0.6, velvet: 0.3, gloss: 0.15, roughness: 0.5,
  });
  return p;
}

// ── tubes, trumpets and bells ────────────────────────────────────────────────

/** Morning glory: five petals FUSED into a funnel, so what you see is a pentagon
 *  disc with five darker seams (the midpetaline rays) marking where the fusion is,
 *  over a glowing white-and-butter throat. The throat is the signature. */
function morningglory() {
  const p = defaultParams();
  p.id = 'morningglory'; p.displayName = 'Morning Glory';
  p.scale = 0.10;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 5, double: 0, layout: 'whorl',
    pitch: 1.05, innerPitch: 0.95, attachR: 0.05, jitter: 0.02, seed: 5,
    // Broad and overlapping, cupped into a funnel — the closest this rig gets to
    // true sympetaly without modelling the fused tube outright.
    petal: P({ length: 1.05, width: 1.35, claw: 0.12, broadAt: 0.72, tip: 'rounded',
      baseFill: 1.6, curl: -0.35, cup: 0.55, fold: 0.02 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.5, attachR: 0.06,
    petal: P({ length: 0.35, width: 0.2, tip: 'pointed' }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.05, filament: 0.28,
    anther: 0.035, spread: 0.12, lift: -0.05 };
  p.stem = { ...p.stem, height: 5, radius: 0.02, curve: 0.2, helix: 0.15, helixTurns: 2 };
  p.leaves = { ...p.leaves, count: 4, size: 0.9, pitch: 1.9,
    petal: P({ width: 0.9, broadAt: 0.35, tip: 'pointed', curl: 0.2, cup: 0.2 }) };
  Object.assign(p.skin, {
    petalBase: 0xfbf0b8, petalTip: 0x4e7fd4, eyeColor: 0xfffdf0,
    eyeSize: 0.42, eyeSoft: 0.75,          // the pale throat well
    veinColor: 0x7fa8e6, veins: 0.45,      // the five midpetaline rays
    antherColor: 0xf2e9cf, filamentColor: 0xfffdf0,
    stemColor: 0x4e7a3a, leafBase: 0x3e7a3a, leafTip: 0x4e8a4a,
    translucency: 0.75, velvet: 0.15, gloss: 0.1, roughness: 0.45,
  });
  return p;
}

/** Foxglove: a one-sided spire of 20–80 thimbles opening bottom-up, so a real stem
 *  shows seed capsules below, open bells in the middle and tight buds at the tip all
 *  at once. The throat is the hero: magenta spots each ringed in white. */
function foxglove() {
  const p = defaultParams();
  p.id = 'foxglove'; p.displayName = 'Foxglove';
  p.scale = 0.062;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 4, double: 0, layout: 'whorl',
    pitch: 0.35, innerPitch: 0.28, innerScale: 0.9,
    attachR: 0.16, jitter: 0.05, seed: 8,
    petal: P({ length: 1.6, width: 0.85, claw: 0.55, broadAt: 0.75, tip: 'rounded',
      baseFill: 1.8, curl: -0.5, cup: 0.75, fold: 0.05 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.6, attachR: 0.12,
    petal: P({ length: 0.4, width: 0.2, tip: 'pointed' }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.06, filament: 0.5,
    anther: 0.05, spread: 0.1, lift: 0.05 };
  p.stem = { ...p.stem, height: 15, radius: 0.16, taper: 0.5, curve: 0.06 };
  p.leaves = { ...p.leaves, count: 6, size: 1.6, arrangement: 'alternate', pitch: 2.0,
    from: 0.02, to: 0.3, petal: P({ width: 0.5, tip: 'pointed', ruffle: 0.2, curl: 0.3 }) };
  p.inflorescence = { ...p.inflorescence, mode: 'raceme', count: 42, spread: 0.75,
    axisLength: 0.9, sizeFalloff: 0.62, openSkew: 0.72, seed: 3 };
  Object.assign(p.skin, {
    petalBase: 0xf7eff3, petalTip: 0xc86faf, eyeColor: 0x6e1e45,
    eyeSize: 0.06, eyeSoft: 0.7,
    spots: 0.5, spotSize: 0.4,             // the ringed throat spots
    veinColor: 0xb85ba0, veins: 0.12,
    antherColor: 0xf0e8d8, filamentColor: 0xf7efe3,
    stemColor: 0x7e8f63, leafBase: 0x4a6b3a, leafTip: 0x5a7b4a,
    translucency: 0.6, velvet: 0.35, gloss: 0.08, roughness: 0.6,
  });
  return p;
}

/** Daffodil: six tepals in a star PLUS a corona — a trumpet that is not petals at
 *  all but an outgrowth, which is exactly why it can be a completely different
 *  colour. Corona length vs tepal length is the whole Narcissus taxonomy. */
function daffodil() {
  const p = defaultParams();
  p.id = 'daffodil'; p.displayName = 'Daffodil';
  p.scale = 0.07;
  p.corolla = {
    ...p.corolla,
    count: 6, stamens: 6, double: 0, layout: 'whorl',
    pitch: 1.4, innerPitch: 1.35, innerScale: 0.95, innerAttach: 0.95,
    attachR: 0.14, jitter: 0.05, seed: 14,
    petal: P({ length: 1.0, width: 0.62, claw: 0.3, broadAt: 0.55, tip: 'pointed',
      tipSize: 0.28, curl: -0.2, cup: 0.3, fold: 0.2 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'corona', radius: 0.36, coronaLength: 0.62,
    coronaFlare: 1.15, coronaCurve: 2.4, coronaFrill: 0.16, coronaTeeth: 14,
    stamens: 6, filament: 0.3, anther: 0.05, spread: 0.12 };
  p.stem = { ...p.stem, height: 7, radius: 0.10, curve: 0.05, nod: 0.85 };
  p.leaves = { ...p.leaves, count: 3, size: 2.2, arrangement: 'alternate', pitch: 1.5,
    from: 0.0, to: 0.2, petal: P({ width: 0.12, broadAt: 0.5, tip: 'pointed', curl: 0.4, fold: 0.4 }) };
  Object.assign(p.skin, {
    petalBase: 0xf6e96b, petalTip: 0xfaf7ec, coronaBase: 0xf6a61e, coronaTip: 0xe8721c,
    veinColor: 0xe8d060, veins: 0.18, antherColor: 0xe0b23a, filamentColor: 0xf0e4c0,
    stemColor: 0x5f8a45, leafBase: 0x6e9160, leafTip: 0x7ea170,
    translucency: 0.5, velvet: 0.2, gloss: 0.2, roughness: 0.45,
  });
  return p;
}

// ── the strange ──────────────────────────────────────────────────────────────

/** Columbine: FIVE nectar spurs, one per petal, running backwards out of the flower.
 *  Aquilegia spans ~0 mm to 16 cm of spur within a single genus — bee, then
 *  hummingbird, then hawkmoth — so this preset is the doorway to the silliest slider
 *  in the project. */
function columbine() {
  const p = defaultParams();
  p.id = 'columbine'; p.displayName = 'Columbine';
  p.scale = 0.07;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 60, double: 0, layout: 'whorl',
    pitch: 0.75, innerPitch: 0.7, attachR: 0.14, jitter: 0.04, seed: 22,
    petal: P({ length: 0.85, width: 0.55, claw: 0.5, broadAt: 0.8, tip: 'rounded',
      baseFill: 1.5, curl: -0.35, cup: 0.5, fold: 0.05,
      spur: 1.15, spurWidth: 0.09, spurCurl: 0.9 }),
  };
  // The five flat "petals" you see first are actually petaloid SEPALS.
  p.sepals = { ...p.sepals, count: 5, pitch: 1.45, attachR: 0.13, offset: 0.63,
    petal: P({ length: 1.35, width: 0.5, claw: 0.25, broadAt: 0.5, tip: 'pointed',
      tipSize: 0.3, curl: -0.1, cup: 0.25, fold: 0.15 }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.07, filament: 0.55,
    anther: 0.035, spread: 0.16, lift: 0.02 };
  p.stem = { ...p.stem, height: 7, radius: 0.05, curve: 0.15, nod: 0.5 };
  p.leaves = { ...p.leaves, count: 4, size: 0.8, pitch: 2.0,
    petal: P({ width: 0.7, tip: 'notched', notch: 0.4, tipSize: 0.5, curl: 0.2 }) };
  Object.assign(p.skin, {
    petalBase: 0xf5f5f2, petalTip: 0xf5f5f2, sepalBase: 0x6e77c4, sepalTip: 0x4e58a8,
    eyeColor: 0x6e77c4, eyeSize: 0.0, veinColor: 0xc8cbe8, veins: 0.2,
    antherColor: 0xe8c24a, filamentColor: 0xefd470, stigmaColor: 0x9ab86e,
    stemColor: 0x6e8455, leafBase: 0x7e9e77, leafTip: 0x8eae87,
    translucency: 0.55, velvet: 0.2, gloss: 0.15, roughness: 0.5,
  });
  return p;
}

/** Passionflower: a flat wheel of ten tepals under a CORONA of 100+ radiating
 *  filaments in coloured bands, with the stamens and styles held up on a stalk above
 *  it all. One of the few flowers where the reproductive parts are the sculpture. */
function passionflower() {
  const p = defaultParams();
  p.id = 'passionflower'; p.displayName = 'Passionflower';
  p.scale = 0.09;
  p.corolla = {
    ...p.corolla,
    count: 10, stamens: 0, double: 0, layout: 'whorl',
    pitch: 1.52, innerPitch: 1.5, innerScale: 1, innerAttach: 1,
    attachR: 0.16, jitter: 0.04, seed: 30,
    petal: P({ length: 1.0, width: 0.32, claw: 0.5, broadAt: 0.5, tip: 'rounded',
      curl: -0.12, cup: 0.2, fold: 0.1 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  // The corona: hundreds of fine filaments, nearly flat, in ranks. `spread` near π/2
  // lays them out in the plane of the flower, which is what makes the wheel.
  p.center = { ...p.center, mode: 'stamens', radius: 0.5, stamens: 160,
    filament: 0.75, anther: 0.015, spread: 1.5, lift: 0.02 };
  p.stem = { ...p.stem, height: 4, radius: 0.025, curve: 0.15, helix: 0.2, helixTurns: 3 };
  p.leaves = { ...p.leaves, count: 3, size: 1.0, pitch: 1.9,
    petal: P({ width: 0.9, tip: 'fringed', notch: 0.5, tipSize: 0.6, fringeTeeth: 5 }) };
  Object.assign(p.skin, {
    petalBase: 0xf2f0e6, petalTip: 0xe8e4f0, veinColor: 0xc8c0d8, veins: 0.15,
    antherColor: 0xc7b378, filamentColor: 0x3b4ca8, stigmaColor: 0x7e9b4a,
    stemColor: 0x7ea352, leafBase: 0x2f6b33, leafTip: 0x3f7b43,
    translucency: 0.55, velvet: 0.2, gloss: 0.2, roughness: 0.45,
    iridescence: 0.15,
  });
  return p;
}

/** Allium: a sphere of hundreds of little star-flowers on radiating pedicels. The
 *  umbel is the point — a single allium floret is nothing. */
function allium() {
  const p = defaultParams();
  p.id = 'allium'; p.displayName = 'Allium';
  p.scale = 0.02;
  p.corolla = {
    ...p.corolla,
    count: 6, stamens: 6, double: 0, layout: 'whorl',
    pitch: 1.1, innerPitch: 1.0, attachR: 0.12, jitter: 0.08, seed: 40,
    petal: P({ length: 1.2, width: 0.35, claw: 0.3, broadAt: 0.5, tip: 'pointed',
      curl: -0.3, cup: 0.3, fold: 0.25 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'stamens', radius: 0.08, filament: 0.55,
    anther: 0.07, spread: 0.3 };
  p.stem = { ...p.stem, height: 30, radius: 0.35, taper: 0.85, curve: 0.03 };
  p.leaves = { ...p.leaves, count: 2, size: 4, arrangement: 'alternate', pitch: 1.7,
    from: 0.0, to: 0.12, petal: P({ width: 0.15, tip: 'pointed', curl: 0.5, fold: 0.4 }) };
  p.inflorescence = { ...p.inflorescence, mode: 'umbel', count: 90, spread: 0.32,
    sizeFalloff: 1.0, seed: 9 };
  Object.assign(p.skin, {
    petalBase: 0xc8a8e8, petalTip: 0x8e5ac8, veinColor: 0x6e3aa8, veins: 0.35,
    antherColor: 0xe8d878, filamentColor: 0xe8dcf0,
    stemColor: 0x6e8f52, leafBase: 0x6e8f52, leafTip: 0x7e9f62,
    translucency: 0.6, velvet: 0.2, gloss: 0.15, roughness: 0.5,
  });
  return p;
}

/** Anthurium: a spathe and a spadix. The "flower" is a single glossy waxy BRACT —
 *  the shiniest thing in the set — and the actual flowers are hundreds of tiny ones
 *  tiled on the club. */
function anthurium() {
  const p = defaultParams();
  p.id = 'anthurium'; p.displayName = 'Anthurium';
  p.scale = 0.13;
  p.corolla = {
    ...p.corolla,
    count: 1, stamens: 0, double: 0, layout: 'whorl',
    pitch: 1.35, innerPitch: 1.35, attachR: 0.02, jitter: 0, seed: 50,
    petal: P({ length: 1.1, width: 1.0, claw: 0.35, broadAt: 0.42, tip: 'pointed',
      tipSize: 0.35, baseFill: 0.8, curl: -0.25, cup: 0.3, fold: 0.25 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'spadix', radius: 0.12, spadixLength: 1.0, lift: 0.0 };
  p.stem = { ...p.stem, height: 4, radius: 0.03, curve: 0.08, nod: 0.2 };
  p.leaves = { ...p.leaves, count: 2, size: 1.6, pitch: 1.7,
    petal: P({ width: 0.9, broadAt: 0.4, tip: 'pointed', curl: 0.2, cup: 0.25 }) };
  Object.assign(p.skin, {
    petalBase: 0x9e1430, petalTip: 0xc81e3c, veinColor: 0x8e1028, veins: 0.4,
    spadixColor: 0xf4e06a, stemColor: 0x4e7a3e, leafBase: 0x1f5e30, leafTip: 0x2f6e40,
    // The waxiest, glossiest surface in the whole set.
    translucency: 0.08, velvet: 0.0, gloss: 1.0, roughness: 0.05,
  });
  return p;
}

/** Pansy: the velvet flower. Its blotch is about the blackest surface in botany —
 *  conical epidermal cells focusing light INTO the pigment, leaving no specular to
 *  lift the black. Plus the whiskers converging on a golden eye: a face. */
function pansy() {
  const p = defaultParams();
  p.id = 'pansy'; p.displayName = 'Pansy';
  p.scale = 0.07;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 0, double: 0, layout: 'whorl',
    pitch: 1.45, innerPitch: 1.4, attachR: 0.1, jitter: 0.06, seed: 33,
    petal: P({ length: 0.9, width: 1.05, claw: 0.25, broadAt: 0.62, tip: 'rounded',
      curl: -0.3, cup: 0.35, fold: 0.05, ruffle: 0.15 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.5, attachR: 0.1 };
  p.center = { ...p.center, mode: 'none' };
  p.stem = { ...p.stem, height: 4, radius: 0.025, curve: 0.25, nod: 0.5 };
  p.leaves = { ...p.leaves, count: 4, size: 0.8, pitch: 2.0 };
  Object.assign(p.skin, {
    petalBase: 0x120c16, petalTip: 0x4b2e83, eyeColor: 0x120c16,
    eyeSize: 0.45, eyeSoft: 0.35,
    veinColor: 0x1a1220, veins: 0.55,       // the whiskers
    innerColor: 0xf2a01e, innerMix: 0.0,
    stemColor: 0x4e7038, leafBase: 0x3e6b33, leafTip: 0x4e7b43,
    // Velvet: high sheen, no gloss, near-total absorption in the blotch.
    translucency: 0.12, velvet: 1.0, gloss: 0.0, roughness: 0.95,
  });
  return p;
}

/** Protea: a chalice of ~100 stiff silky BRACTS (not petals) around a furry dome of
 *  hundreds of true flowers, each springing a wiry style. A velvet pincushion. */
function protea() {
  const p = defaultParams();
  p.id = 'protea'; p.displayName = 'King Protea';
  p.scale = 0.22;
  p.corolla = {
    ...p.corolla,
    count: 100, stamens: 0, double: 0, layout: 'spiral',
    pitch: 0.95, innerPitch: 0.45, innerScale: 0.5, innerAttach: 0.3,
    depthBias: 1.1, attachR: 0.16, attachLift: 0.05, jitter: 0.1, seed: 44,
    petal: P({ length: 1.05, width: 0.28, claw: 0.45, broadAt: 0.45, tip: 'pointed',
      tipSize: 0.3, curl: -0.45, cup: 0.35, fold: 0.2 }),
  };
  p.sepals = { ...p.sepals, count: 0 };
  p.center = { ...p.center, mode: 'boss', radius: 0.3, stamens: 300,
    filament: 0.3, anther: 0.022, spread: 0.55, capsule: 0.0, rays: 0, lift: 0.02 };
  p.stem = { ...p.stem, height: 3.2, radius: 0.05, curve: 0.05 };
  p.leaves = { ...p.leaves, count: 5, size: 0.7, arrangement: 'alternate', pitch: 1.8,
    petal: P({ width: 0.45, tip: 'rounded', curl: 0.15 }) };
  Object.assign(p.skin, {
    petalBase: 0xf2d4dc, petalTip: 0xc4506e, innerColor: 0xf5dce2, innerMix: 0.5,
    veinColor: 0xd06888, veins: 0.2,
    filamentColor: 0xf7eedc, antherColor: 0x8a5a4a, capsuleColor: 0xe0c8b4,
    stemColor: 0x6e5a3e, leafBase: 0x4e6b4a, leafTip: 0x5e7b5a,
    translucency: 0.25, velvet: 0.75, gloss: 0.08, roughness: 0.7,
  });
  return p;
}

/** Snapdragon: a spire of two-lipped mouths. The real thing is a hinged, personate
 *  corolla that a bee has to lever open — we approximate the LOOK (a bulging lower
 *  lip with a bearded orange palate under a hooded upper) without the mechanism. */
function snapdragon() {
  const p = defaultParams();
  p.id = 'snapdragon'; p.displayName = 'Snapdragon';
  p.scale = 0.04;
  p.corolla = {
    ...p.corolla,
    count: 5, stamens: 4, double: 0, layout: 'whorl',
    pitch: 0.85, innerPitch: 0.5, innerScale: 0.8, innerAttach: 0.6,
    attachR: 0.16, jitter: 0.22, seed: 55,   // the jitter is doing the zygomorphy
    petal: P({ length: 1.2, width: 0.9, claw: 0.5, broadAt: 0.7, tip: 'rounded',
      baseFill: 1.7, curl: -0.85, cup: 0.7, fold: 0.05, ruffle: 0.15 }),
  };
  p.sepals = { ...p.sepals, count: 5, pitch: 2.4, attachR: 0.12,
    petal: P({ length: 0.35, width: 0.18, tip: 'pointed' }) };
  p.center = { ...p.center, mode: 'stamens', radius: 0.06, filament: 0.3,
    anther: 0.05, spread: 0.15, lift: 0.02 };
  p.stem = { ...p.stem, height: 13, radius: 0.18, taper: 0.55, curve: 0.05 };
  p.leaves = { ...p.leaves, count: 6, size: 1.4, arrangement: 'opposite', pitch: 2.0,
    from: 0.02, to: 0.35, petal: P({ width: 0.28, tip: 'pointed' }) };
  p.inflorescence = { ...p.inflorescence, mode: 'raceme', count: 30, spread: 0.7,
    axisLength: 0.85, sizeFalloff: 0.6, openSkew: 0.68, seed: 6 };
  Object.assign(p.skin, {
    petalBase: 0xf2a33c, petalTip: 0xe24c8b, eyeColor: 0xf2a33c,
    eyeSize: 0.3, eyeSoft: 0.6, veinColor: 0xb4205e, veins: 0.2,
    innerColor: 0xfff6dc, innerMix: 0.4,
    antherColor: 0xe8dcb4, filamentColor: 0xf5eeda,
    stemColor: 0x4e7038, leafBase: 0x39642f, leafTip: 0x49743f,
    translucency: 0.4, velvet: 0.7, gloss: 0.05, roughness: 0.75,
  });
  return p;
}

export const SPECIES = {
  sunflower, rose, tulip, daisy, lily, poppy, morningglory, foxglove, daffodil,
  columbine, passionflower, fuchsia, lotus, allium, anthurium, pansy, protea,
  snapdragon, buttercup,
};

export const SPECIES_ORDER = [
  'sunflower', 'rose', 'tulip', 'daisy', 'poppy', 'lily', 'morningglory', 'foxglove',
  'daffodil', 'columbine', 'passionflower', 'fuchsia', 'lotus', 'allium', 'anthurium',
  'pansy', 'protea', 'snapdragon', 'buttercup',
];

export function makeSpecies(id) {
  const f = SPECIES[id] || SPECIES.sunflower;
  return f();
}
