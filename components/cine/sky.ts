import * as THREE from "three";

/**
 * A physically flavoured sky for the last hour of daylight: Rayleigh blue overhead, a warm Mie glow
 * around the sun and a hazy band at the horizon, darkening into the blue hour as the sun sets. The same
 * shader also draws the environment map that every reflective surface in the city mirrors.
 */

const GOLD = {
  zenith: new THREE.Color(0x24467a),
  mid: new THREE.Color(0x6f93be),
  horizon: new THREE.Color(0xf0b384),
  sun: new THREE.Color(0xffc98a),
};
const BLUE = {
  zenith: new THREE.Color(0x060c1f),
  mid: new THREE.Color(0x1a2b52),
  horizon: new THREE.Color(0x6e5a6e),
  sun: new THREE.Color(0xd77a4e),
};

export function skyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: GOLD.zenith.clone() },
      uMid: { value: GOLD.mid.clone() },
      uHorizon: { value: GOLD.horizon.clone() },
      uSun: { value: GOLD.sun.clone() },
      uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
      uNight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSun;
      uniform vec3 uSunDir; uniform float uNight;
      varying vec3 vDir;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float y = max(d.y, 0.0);
        float mu = dot(d, normalize(uSunDir));
        /* sky gradient: a broad haze band at the horizon, a deep zenith */
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, y));
        col = mix(col, uZenith, smoothstep(0.12, 0.85, y));
        /* the horizon is warmer towards the sun */
        float toward = smoothstep(-0.2, 1.0, mu);
        col += uSun * toward * (1.0 - smoothstep(0.0, 0.35, y)) * 0.55;
        /* Mie glow around the sun and its disc */
        col += uSun * pow(max(mu, 0.0), 12.0) * 0.6;
        col += uSun * pow(max(mu, 0.0), 300.0) * 3.0 * (1.0 - uNight);
        col += vec3(1.0, 0.92, 0.8) * smoothstep(0.99965, 0.99985, mu) * 30.0 * (1.0 - uNight);
        /* below the horizon: haze, then the dark of the ground */
        col = mix(col, uHorizon * 0.35, smoothstep(0.0, -0.12, d.y));
        /* a few stars once the sun is down */
        vec2 sp = floor(d.xz / max(d.y, 0.05) * 220.0);
        float star = step(0.9985, h(sp)) * smoothstep(0.15, 0.6, y) * smoothstep(0.55, 1.0, uNight);
        col += vec3(star) * 0.9;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Sets the sky colours for a time of day: 0 golden hour, 1 blue hour. */
export function setSky(m: THREE.ShaderMaterial, night: number, sunDir: THREE.Vector3) {
  const u = m.uniforms;
  (u.uZenith.value as THREE.Color).lerpColors(GOLD.zenith, BLUE.zenith, night);
  (u.uMid.value as THREE.Color).lerpColors(GOLD.mid, BLUE.mid, night);
  (u.uHorizon.value as THREE.Color).lerpColors(GOLD.horizon, BLUE.horizon, night);
  (u.uSun.value as THREE.Color).lerpColors(GOLD.sun, BLUE.sun, night);
  (u.uSunDir.value as THREE.Vector3).copy(sunDir);
  u.uNight.value = night;
}

/** The haze colour for a time of day, matched to the sky's horizon. */
export function hazeColor(night: number, out: THREE.Color) {
  return out.lerpColors(GOLD.horizon, BLUE.horizon, night).lerp(night < 0.5 ? GOLD.mid : BLUE.mid, 0.35);
}
