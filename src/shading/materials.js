import * as THREE from 'three';
import { applyWind } from '../scene/wind.js';

/**
 * Petal optics.
 *
 * This is the part that decides whether the thing looks like a flower or like a
 * plastic flower, and real petals are stranger than you'd guess:
 *
 * TRANSLUCENT. A poppy petal is *three cell layers thick* — two pigmented epidermes
 * around an unpigmented middle — and it's one of the most densely pigmented tissues
 * ever measured, yet still bounces ~35% of the light that hits it. Thin + dense +
 * scattering is exactly the recipe for stained glass, which is why a backlit poppy
 * appears lit from inside. We get that with transmission plus a THICKNESS GRADIENT:
 * thick and dark at the base where the petal attaches, thin and glowing at the
 * margin. That gradient is doing more work than any other line in this file.
 *
 * VELVET. A pansy's blotch is about the blackest surface in botany. The mechanism is
 * conical (papillate) epidermal cells under MIXTA control: little lenses that focus
 * incoming light *into* the pigment and scatter the rest over every angle, so there
 * is almost no specular glare left to lift the black. Mutants with flat cells look
 * visibly paler — and get fewer bee visits. We approximate with sheen (a
 * Fresnel-inverted fuzz that brightens at grazing angles) plus near-zero roughness
 * response.
 *
 * GLOSSY. A buttercup is a mirror. Its upper epidermis is a ~3 µm thin film over an
 * actual AIR LAYER, above a starch layer that throws yellow back diffusely — which
 * roughly doubles the gloss and is why the thing lights up your chin. Clearcoat,
 * with specular that ramps hard with angle.
 *
 * On top of that: the pattern channels that make a flower a *particular* flower —
 * the dark basal eye (poppy, anemone), the spotted throat (foxglove, lily), veins,
 * and the pale nectar-guide well.
 */

const PETAL_PARS = /* glsl */`
  varying vec2 vPetalUv;      // x: across the petal (0..1), y: base → tip
  varying float vDepth;       // 0 = outermost petal, 1 = deep in the heart
  uniform vec3 uBase;         // colour at the petal's base
  uniform vec3 uTip;          // colour at its tip
  uniform vec3 uEye;          // the dark basal blotch
  uniform vec3 uVein;
  uniform vec3 uInner;        // tint for petals buried in the centre of a double
  uniform float uEyeSize;
  uniform float uEyeSoft;
  uniform float uVeins;
  uniform float uSpots;
  uniform float uSpotSize;
  uniform float uInnerMix;
  uniform float uIridescence;

  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1,0)), f.x),
               mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
  }
`;

const PETAL_COLOR = /* glsl */`
  {
    float s = clamp(vPetalUv.y, 0.0, 1.0);          // base → tip
    float t = vPetalUv.x * 2.0 - 1.0;               // -1 → +1 across

    vec3 col = mix(uBase, uTip, smoothstep(0.0, 1.0, s));

    // Veins run from the base out to the tip, fanning as they go. Feeding them into
    // colour AND (below) thickness is the trick: a vein blocks the backlight, so it
    // reads as a dark rib across a glowing petal, which is what you actually see.
    float fan = t * (0.35 + 1.65 * s);
    float vein = abs(fract(fan * 3.0 + 0.5) - 0.5) * 2.0;
    vein = 1.0 - smoothstep(0.0, 0.22, vein);
    float midrib = 1.0 - smoothstep(0.0, 0.06, abs(t));
    col = mix(col, uVein, clamp((vein * 0.55 + midrib) * uVeins, 0.0, 1.0));

    // The dark basal eye — a poppy's black heart, an anemone's, a pansy's blotch.
    float eye = 1.0 - smoothstep(uEyeSize * (1.0 - uEyeSoft), uEyeSize, s);
    col = mix(col, uEye, eye);

    // Spots: a foxglove's speckled throat, a lily's freckles. Each one gets a pale
    // halo, because a real foxglove spot is ringed in white and that ring is most of
    // why it reads as a spot rather than a stain.
    if (uSpots > 0.001) {
      vec2 sp = vec2(t * 3.0, s * 6.0) / max(uSpotSize, 0.05);
      float n = vnoise(floor(sp) * 7.3);
      vec2 cell = fract(sp) - 0.5;
      float d = length(cell) * 2.0;
      float on = step(1.0 - uSpots, n);
      float dot_ = (1.0 - smoothstep(0.35, 0.55, d)) * on;
      float halo = (1.0 - smoothstep(0.55, 0.78, d)) * on - dot_;
      col = mix(col, uEye, dot_ * smoothstep(0.02, 0.35, s));
      col = mix(col, vec3(1.0), clamp(halo, 0.0, 1.0) * 0.55 * smoothstep(0.02, 0.35, s));
    }

    // Petals buried in the heart of a double bloom are usually paler.
    col = mix(col, uInner, vDepth * uInnerMix);

    diffuseColor.rgb *= col;
  }
`;

/**
 * Iridescence is real — diffraction gratings from buckled cuticle striations, in
 * tulips and Hibiscus trionum — but it only READS over a dark, absorbing background;
 * over a pale petal, pigment backscatter washes it out entirely. So we gate it to
 * the dark eye, which is exactly where H. trionum actually puts it.
 */
const PETAL_IRID = /* glsl */`
  {
    float s = clamp(vPetalUv.y, 0.0, 1.0);
    float eye = 1.0 - smoothstep(uEyeSize * (1.0 - uEyeSoft), uEyeSize, s);
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
    vec3 sheenCol = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + fres * 2.2 + s));
    outgoingLight += sheenCol * fres * eye * uIridescence * 0.8;
  }
`;

/**
 * `patterned` is false for leaves and sepals. The eye, the spots and the iridescence
 * belong to the COROLLA — a foxglove's throat is speckled, its leaves are not — and
 * sharing the uniform block meant every lily leaf came out covered in leopard spots.
 */
function petalUniforms(sk, which, patterned = true) {
  const c = (hex) => ({ value: new THREE.Color(hex) });
  return {
    uBase: c(sk[`${which}Base`]),
    uTip: c(sk[`${which}Tip`]),
    uEye: c(patterned ? sk.eyeColor : sk[`${which}Base`]),
    uVein: c(sk.veinColor),
    uInner: c(sk.innerColor),
    uEyeSize: { value: patterned ? sk.eyeSize : 0 },
    uEyeSoft: { value: sk.eyeSoft },
    uVeins: { value: patterned ? sk.veins : 0.25 },
    uSpots: { value: patterned ? sk.spots : 0 },
    uSpotSize: { value: sk.spotSize },
    uInnerMix: { value: patterned ? sk.innerMix : 0 },
    uIridescence: { value: patterned ? sk.iridescence : 0 },
  };
}

/** A petal/sepal/leaf sheet: the full optical stack. */
function sheetMaterial(sk, which, wind, opts = {}) {
  const patterned = opts.patterned !== false;
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: opts.roughness ?? sk.roughness,
    // Buttercup gloss: a thin film over an air layer. Clearcoat is the cheap version.
    clearcoat: opts.gloss ?? sk.gloss,
    clearcoatRoughness: 0.08,
    // Pansy velvet: conical cells scatter the specular away into a grazing fuzz.
    //
    // three's sheen is an ADDITIVE lobe, so a white one at full strength doesn't
    // read as velvet — it frosts the flower and turns a deep-purple pansy into pale
    // lavender, which is the exact opposite of the real effect. Real velvet is
    // *darker* than a flat petal: the conical cells focus light INTO the pigment.
    // So tint the sheen toward the petal's own colour and keep it modest; the depth
    // comes from the high roughness and the absence of a specular highlight.
    sheen: (opts.velvet ?? sk.velvet) * 0.55,
    sheenColor: new THREE.Color(sk[`${which}Tip`] ?? 0xffffff),
    sheenRoughness: 0.9,
    // Poppy glow: thin, densely pigmented, strongly scattering.
    transmission: opts.translucency ?? sk.translucency,
    thickness: 0.6,
    ior: 1.42,
    side: THREE.DoubleSide,   // a petal has two faces and you see both
    transparent: false,
  });

  mat.userData.uniforms = petalUniforms(sk, which, patterned);
  mat.userData.patterned = patterned;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec2 vPetalUv;
        varying float vDepth;
        #ifdef USE_INSTANCING
          attribute float aDepth;
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPetalUv = uv;
        #ifdef USE_INSTANCING
          vDepth = aDepth;
        #else
          vDepth = 0.0;
        #endif`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PETAL_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${PETAL_COLOR}`)
      .replace('#include <opaque_fragment>', `${PETAL_IRID}\n#include <opaque_fragment>`);

    // The thickness gradient that makes the backlight work. A petal is thick and
    // opaque where it attaches and tissue-thin at the margin, so the rim lights up
    // first — and the veins stay dark against it.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <transmission_fragment>',
      `
      #ifdef USE_TRANSMISSION
        {
          float edge = 1.0 - abs(vPetalUv.x * 2.0 - 1.0);
          float thin = smoothstep(0.0, 0.55, vPetalUv.y) * smoothstep(0.0, 0.45, edge);
          material.thickness *= mix(2.2, 0.18, thin);
        }
      #endif
      #include <transmission_fragment>`
    );
  };
  mat.customProgramCacheKey = () => `flower-sheet-${which}-${patterned ? 'pat' : 'plain'}`;

  if (wind) applyWind(mat, wind, { isPetal: true });
  return mat;
}

export function makeMaterials(p, wind) {
  const sk = p.skin;

  const petal = sheetMaterial(sk, 'petal', wind);
  const sepal = sheetMaterial(sk, 'sepal', wind, {
    translucency: sk.translucency * 0.4, gloss: sk.gloss * 0.3, velvet: sk.velvet * 0.5,
    patterned: false,
  });
  const leaf = sheetMaterial(sk, 'leaf', wind, {
    translucency: 0.25, gloss: 0.15, velvet: 0.1, roughness: 0.75, patterned: false,
  });

  const solid = (hex, rough = 0.6, extra = {}) => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex), roughness: rough, ...extra,
    });
    if (wind) applyWind(m, wind, { isPetal: false });
    return m;
  };

  return {
    petal, sepal, leaf,
    spur: sheetMaterial(sk, 'petal', wind, { translucency: sk.translucency * 0.7 }),
    stem: solid(sk.stemColor, 0.8),
    filament: solid(sk.filamentColor, 0.55),
    // Anthers are usually the most saturated thing in the whole flower — a lily's
    // rust-orange, a tulip's near-black. A touch of emissive keeps them from going
    // muddy in the shade of their own petals.
    anther: solid(sk.antherColor, 0.45, {
      emissive: new THREE.Color(sk.antherColor), emissiveIntensity: 0.12,
    }),
    floret: solid(sk.discColor, 0.7),
    capsule: solid(sk.capsuleColor, 0.6),
    stigma: solid(sk.stigmaColor, 0.5),
    corona: sheetMaterial(sk, 'corona', wind, { translucency: sk.translucency * 0.5, patterned: false }),
    column: solid(sk.columnColor, 0.25, { clearcoat: 0.8 }),
    spadix: solid(sk.spadixColor, 0.5),
  };
}

/** Push live parameter edits into the materials without rebuilding geometry. */
export function applySkin(mats, p) {
  const sk = p.skin;

  for (const [name, which] of [['petal', 'petal'], ['sepal', 'sepal'], ['leaf', 'leaf'],
    ['spur', 'petal'], ['corona', 'corona']]) {
    const u = mats[name].userData.uniforms;
    if (!u) continue;
    const pat = mats[name].userData.patterned !== false;
    u.uBase.value.set(sk[`${which}Base`]);
    u.uTip.value.set(sk[`${which}Tip`]);
    u.uEye.value.set(pat ? sk.eyeColor : sk[`${which}Base`]);
    u.uVein.value.set(sk.veinColor);
    u.uInner.value.set(sk.innerColor);
    u.uEyeSize.value = pat ? sk.eyeSize : 0;
    u.uEyeSoft.value = sk.eyeSoft;
    u.uVeins.value = pat ? sk.veins : 0.25;
    u.uSpots.value = pat ? sk.spots : 0;
    u.uSpotSize.value = sk.spotSize;
    u.uInnerMix.value = pat ? sk.innerMix : 0;
    u.uIridescence.value = pat ? sk.iridescence : 0;
  }

  mats.petal.transmission = sk.translucency;
  mats.petal.clearcoat = sk.gloss;
  mats.petal.sheen = sk.velvet * 0.55;
  mats.petal.sheenColor.set(sk.petalTip);
  mats.petal.roughness = sk.roughness;

  mats.stem.color.set(sk.stemColor);
  mats.filament.color.set(sk.filamentColor);
  mats.anther.color.set(sk.antherColor);
  mats.anther.emissive.set(sk.antherColor);
  mats.floret.color.set(sk.discColor);
  mats.capsule.color.set(sk.capsuleColor);
  mats.stigma.color.set(sk.stigmaColor);
  mats.column.color.set(sk.columnColor);
  mats.spadix.color.set(sk.spadixColor);

  for (const m of Object.values(mats)) m.needsUpdate = true;
}
