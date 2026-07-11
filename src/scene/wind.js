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
 * The bend, applied to `objPos` — the vertex in the PLANT's object space.
 *
 * It has to happen after instancing, not before. three's `begin_vertex` hands you
 * `transformed` in the *instance's own* local space, and a petal's local space is
 * rotated every which way by the corolla — pushing along the wind direction there
 * would shove each petal in a different direction and the flower would explode
 * rather than sway. So we take the vertex through `instanceMatrix` first, bend it in
 * the plant's frame where "up" really is up, and only then hand it to the view
 * matrix.
 */
export const WIND_BEND = /* glsl */`
  {
    float h = clamp(objPos.y / max(uPlantHeight, 1e-3), 0.0, 1.0);
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
    float chatter = sin(t * 6.1 + objPos.x * 34.0 + objPos.z * 27.0)
                  * uFlutter * uWindStrength * 0.015 * h;

    objPos.xz += uWindDir * (bend * 0.16 * uPlantHeight * lever + chatter);
    // Leaning over shortens the plant a little; without this the bloom visibly
    // stretches away from the top of its own stem at high wind.
    objPos.y -= abs(bend) * 0.02 * uPlantHeight * lever;
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
        vec4 objPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          objPos = instanceMatrix * objPos;
        #endif
        ${WIND_BEND}
        vec4 mvPosition = modelViewMatrix * objPos;
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
