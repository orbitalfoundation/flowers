import * as THREE from 'three';

/**
 * Wind.
 *
 * A flower that doesn't move is a plastic flower, so this is not decoration — it's
 * most of what sells the thing as alive. But it has to be *cheap*: a bouquet can be
 * a few hundred flowers, each with dozens of petals, and re-posing that on the CPU
 * every frame would kill the framerate.
 *
 * So the wind lives entirely in the vertex shader. Every stem, petal and leaf gets
 * the same GLSL snippet injected (see `applyWind`), and it bends each vertex by an
 * amount that depends on how far up the plant it is — the stem is anchored at the
 * ground and the bloom at the top swings the most, which is exactly how a real
 * flower behaves (a cantilever, so deflection goes roughly as height²).
 *
 * Three layers, because a single sine reads as a metronome:
 *   sway    a slow, long-wavelength push — the body of the breeze
 *   gust    a slower still envelope that swells and dies, so it isn't uniform
 *   flutter a fast, small, high-frequency jitter on the petals only — the leaf-edge
 *           chatter that makes a real flower look nervous rather than robotic
 *
 * Each plant gets a per-instance phase offset so a whole meadow doesn't sway in
 * lockstep, which is the classic tell of fake foliage.
 */

export const WIND_UNIFORMS = /* glsl */`
  uniform float uTime;
  uniform float uWindStrength;   // 0 = still air, 1 = a stiff breeze
  uniform float uWindSpeed;
  uniform vec2  uWindDir;        // unit vector in the XZ plane
  uniform float uFlutter;        // extra high-frequency chatter (petals only)
  uniform float uPhase;          // per-plant offset, so a bouquet doesn't pulse as one
  uniform float uPlantHeight;    // how tall this plant is, for normalising the bend
`;

/**
 * The bend, applied to `windPos` — the vertex in WORLD space.
 *
 * World space is not a detail; it's the whole trick. The stem, the leaves and the
 * petals are in different object spaces (a petal's frame is rotated every which way
 * by the corolla, and the head's frame is rotated again to the stem's tip tangent),
 * and the wind has to push all of them the same way, by an amount that depends on
 * their height above the *ground*.
 *
 * Doing this in a mesh's own local space is how the head came adrift from the stem:
 * three hands you `transformed` in the instance's local frame, where a petal's y is
 * its own tiny local height, not its height up the plant. Since the bend scales with
 * height², every petal computed a lever of ~zero and the bloom sat perfectly still
 * while the stem swayed underneath it. Taking the vertex all the way out to world
 * space makes the stem tip and the bloom that sits on it evaluate the *same function
 * of the same height* — so they move together and stay attached, with no parenting
 * tricks needed at all.
 */
export const WIND_BEND = /* glsl */`
  {
    // Height above the ground (the plant is rooted at y = 0).
    float h = clamp(windPos.y / max(uPlantHeight, 1e-3), 0.0, 1.0);
    // A cantilever bends as roughly the square of the distance from its anchor: the
    // stem base barely moves, the bloom on top describes a big lazy arc.
    float lever = h * h;

    float t = uTime * uWindSpeed + uPhase;

    // Body of the breeze, plus a slower swelling gust envelope, so it doesn't tick
    // like a metronome.
    float sway = sin(t) * 0.6 + sin(t * 1.73 + 1.3) * 0.25;
    float gust = 0.55 + 0.45 * sin(t * 0.21 + uPhase * 0.7);
    float bend = sway * gust * uWindStrength;

    // Petal chatter: fast, small, keyed to the vertex's own position so neighbouring
    // petals don't move as one rigid sheet.
    float chatter = sin(t * 6.1 + windPos.x * 34.0 + windPos.z * 27.0)
                  * uFlutter * uWindStrength * 0.015 * h;

    windPos.xz += uWindDir * (bend * 0.16 * uPlantHeight * lever + chatter);
    // Leaning over shortens the plant a little; without this the bloom visibly
    // stretches away from the top of its own stem at high wind.
    windPos.y -= abs(bend) * 0.02 * uPlantHeight * lever;
  }
`;

/**
 * Inject the wind into any three material. Call once per material; hands back the
 * uniform block so the caller can drive the clock and the per-plant phase.
 */
export function applyWind(material, shared, { isPetal = false } = {}) {
  material.userData.wind = {
    uTime: shared.time,
    uWindStrength: shared.strength,
    uWindSpeed: shared.speed,
    uWindDir: shared.dir,
    uFlutter: { value: isPetal ? 1.0 : 0.15 },
    uPhase: { value: 0 },
    uPlantHeight: { value: 1 },
  };

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, material.userData.wind);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WIND_UNIFORMS}`)
      .replace(
        '#include <project_vertex>',
        /* glsl */`
        // Out to WORLD space — through the instance matrix AND the model matrix, so
        // the stem, the leaves and every petal of every bloom all land in the same
        // frame with a real height above the ground. Then bend, then straight to the
        // view matrix. (modelViewMatrix would only get us to the mesh's own parent,
        // which is where the head used to get left behind.)
        vec4 windPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          windPos = instanceMatrix * windPos;
        #endif
        windPos = modelMatrix * windPos;
        ${WIND_BEND}
        vec4 mvPosition = viewMatrix * windPos;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
  };
  // Chain onto whatever cache key the material already had. `.call(material)` is
  // load-bearing: three's DEFAULT customProgramCacheKey is a prototype method that
  // reads `this.onBeforeCompile`, so invoking it unbound throws.
  const prevKey = material.customProgramCacheKey;
  material.customProgramCacheKey = () =>
    `${prevKey ? prevKey.call(material) : ''}|wind-${isPetal ? 'petal' : 'stem'}`;
  return material.userData.wind;
}

/** The shared wind clock every material reads. */
export function makeWind() {
  const shared = {
    time: { value: 0 },
    strength: { value: 0.35 },
    speed: { value: 1.1 },
    dir: { value: new THREE.Vector2(1, 0.25).normalize() },
  };
  return {
    shared,
    update(dt) { shared.time.value += dt; },
    set strength(v) { shared.strength.value = v; },
    get strength() { return shared.strength.value; },
    set speed(v) { shared.speed.value = v; },
    get speed() { return shared.speed.value; },
    setDirection(deg) {
      const r = THREE.MathUtils.degToRad(deg);
      shared.dir.value.set(Math.cos(r), Math.sin(r)).normalize();
    },
  };
}
