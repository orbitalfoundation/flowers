import * as THREE from 'three';

/**
 * A big beautiful daytime sky, and the sun that lights everything.
 *
 * This is where the fun lives. The fish rig had its underwater god-rays; fruit had
 * its studio. Flowers get the opposite of a studio — a warm outdoor afternoon, a
 * gradient sky with a bright sun, a soft haze at the horizon, and (below) a green
 * meadow falling away. It is deliberately a little idealised: a flower toy should
 * feel like the best ten minutes of a spring day.
 *
 * The sun direction is shared out so the lens flare and the god-ray sheen can line
 * up with it. Everything is authored in world units at roughly human scale — a
 * flower is ~0.1–1 m and the camera lives a metre or two away.
 */
export function buildSky(scene, renderer) {
  const sun = new THREE.Vector3();
  const params = {
    elevation: 22,   // degrees above the horizon — low sun = long warm light
    azimuth: 135,    // degrees around
    turbidity: 3.0,  // haze
    exposure: 1.0,
  };

  function sunDir() {
    const phi = THREE.MathUtils.degToRad(90 - params.elevation);
    const theta = THREE.MathUtils.degToRad(params.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    return sun;
  }
  sunDir();

  // A large gradient dome. A physically-based sky shader would be prettier, but a
  // hand-tuned three-stop gradient with a sun disc and a horizon glow is cheaper,
  // never fizzles on software GL (the screenshot harness), and is easy to push
  // toward "unreal postcard", which is the brief.
  const uniforms = {
    uSunDir: { value: sun },
    uZenith: { value: new THREE.Color(0x2b6fd6) },
    uHorizon: { value: new THREE.Color(0xbfe0ff) },
    uGround: { value: new THREE.Color(0x6f8f4a) },
    uSunColor: { value: new THREE.Color(0xfff4d6) },
    uTurbidity: { value: params.turbidity },
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uSunDir, uZenith, uHorizon, uGround, uSunColor;
      uniform float uTurbidity;
      void main(){
        vec3 dir = normalize(vDir);
        float h = dir.y;

        // Sky gradient: deep zenith → pale horizon → green ground below.
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.55));
        sky = mix(sky, uGround, smoothstep(0.0, -0.15, h));

        // Warm the whole sky toward the sun, and pile haze onto the horizon near it.
        float sunAngle = max(dot(dir, normalize(uSunDir)), 0.0);
        sky += uSunColor * pow(sunAngle, 4.0) * 0.35 / uTurbidity;                 // broad glow
        sky = mix(sky, uHorizon * 1.15, smoothstep(0.25, 0.0, abs(h)) * 0.5);      // horizon haze

        // The sun disc itself, with a soft corona.
        float disc = smoothstep(0.9975, 0.9992, sunAngle);
        float corona = pow(sunAngle, 900.0);
        sky += uSunColor * (disc * 6.0 + corona * 2.0);

        gl_FragColor = vec4(sky, 1.0);
      }`,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), skyMat);
  dome.scale.setScalar(400);
  dome.renderOrder = -2;
  dome.frustumCulled = false;
  scene.add(dome);
  // The dome has to be rescaled per plant, not left at a fixed radius: the camera's
  // far plane is sized to the subject, so a small flower pushed a fixed-radius dome
  // straight through the far plane and the sky simply turned black. Sizing it to the
  // scene keeps it inside the frustum AND keeps the near/far ratio sane.
  const DOME_R = 60;

  // The light rig: a warm key from the sun, a cool sky fill from straight up, and a
  // soft ambient so shadowed petal backs still glow rather than going to mud.
  const key = new THREE.DirectionalLight(0xfff2d0, 2.8);
  const fill = new THREE.HemisphereLight(0xbfe0ff, 0x5a7a3a, 0.7);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(key, fill, ambient);

  // A PMREM of the sky so petals and leaves have a real environment to reflect and
  // to transmit — this is what makes the subsurface glow read as daylight.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skyMat.clone()));
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;

  function apply() {
    sunDir();
    key.position.copy(sun).multiplyScalar(50);
    uniforms.uTurbidity.value = params.turbidity;
    renderer.toneMappingExposure = params.exposure;
  }
  apply();

  return {
    params, sun, apply, key,
    /** Size the sky (and the sun's distance) to the subject. Returns the dome's
     *  world radius so the caller can put its far plane safely beyond it. */
    setScale(span) {
      const r = Math.max(span * DOME_R, 5);
      dome.scale.setScalar(r);
      key.position.copy(sun).multiplyScalar(r * 0.5);
      return r;
    },
    dispose() { pmrem.dispose(); envRT.dispose(); },
  };
}
