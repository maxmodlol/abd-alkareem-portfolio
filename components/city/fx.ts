import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type Fx = {
  render: (dt: number, t: number) => void;
  resize: (w: number, h: number, pr: number) => void;
  setNight: (n: number) => void;
  /** Cheaper frames for the walking tour: no bloom, no tilt-shift blur. */
  setLite: (on: boolean) => void;
  /** Quality step from the frame governor: 1 drops ambient occlusion, 2 drops bloom too. */
  setTier: (tier: number) => void;
  /** Compiles every post-effect shader ahead of the first frame, without waiting on the graphics card. */
  warm: (pause: () => Promise<void>) => Promise<void>;
  dispose: () => void;
};

/** Film look: bloom, tilt-shift softness at the top and bottom, a touch of warmth, vignette and grain. */
const GRADE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVig: { value: 0.28 },
    uGrain: { value: 0.015 },
    uAb: { value: 0.0006 },
    uTilt: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes;
    uniform float uVig; uniform float uGrain; uniform float uAb; uniform float uTilt;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float band = smoothstep(0.2, 0.5, abs(c.y)) * uTilt;
      vec2 px = vec2(band * 3.2) / uRes;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      if (band > 0.002) {
        vec3 acc = col;
        acc += texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb;
        acc += texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb;
        acc += texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb;
        acc += texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb;
        acc += texture2D(tDiffuse, vUv + px * 0.7).rgb;
        acc += texture2D(tDiffuse, vUv - px * 0.7).rgb;
        acc += texture2D(tDiffuse, vUv + vec2(px.x, -px.y) * 0.7).rgb;
        acc += texture2D(tDiffuse, vUv - vec2(px.x, -px.y) * 0.7).rgb;
        col = acc / 9.0;
      }
      float ab = uAb * dot(c, c) * 4.0;
      col.r = mix(col.r, texture2D(tDiffuse, vUv + c * ab * 6.0).r, 1.0 - band);
      col.b = mix(col.b, texture2D(tDiffuse, vUv - c * ab * 6.0).b, 1.0 - band);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(1.02, 1.0, 0.98), smoothstep(0.45, 1.0, l));
      col = mix(col, col * vec3(0.9, 1.0, 1.1), 1.0 - smoothstep(0.0, 0.45, l));
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.14);
      col = (col - 0.5) * 1.06 + 0.5;
      float d = length(c * vec2(1.0, 0.92));
      col *= mix(1.0, smoothstep(0.88, 0.25, d), uVig);
      col += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function createFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  o: { samples: number; tilt: number; ao: boolean },
): Fx | null {
  try {
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
      type: THREE.HalfFloatType,
      samples: o.samples,
    });
    const composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(pr);
    composer.setSize(size.x, size.y);
    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.3, 0.5, 0.92);
    const output = new OutputPass();
    const grade = new ShaderPass({
      uniforms: THREE.UniformsUtils.clone(GRADE.uniforms),
      vertexShader: GRADE.vertexShader,
      fragmentShader: GRADE.fragmentShader,
    });
    grade.uniforms.uTilt.value = o.tilt * 0.15;
    grade.uniforms.uRes.value.set(size.x * pr, size.y * pr);
    composer.addPass(renderPass);
    /* ambient occlusion: soft contact shadows where walls meet the ground and under the trees */
    let gtao: GTAOPass | null = null;
    if (o.ao) {
      gtao = new GTAOPass(scene, camera, size.x * pr, size.y * pr);
      gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
      gtao.blendIntensity = 0.85;
      composer.addPass(gtao);
    }
    composer.addPass(bloom);
    composer.addPass(output);
    composer.addPass(grade);
    let lite = false;
    let tier = 0;
    const apply = () => {
      bloom.enabled = !lite && tier < 2;
      if (gtao) gtao.enabled = !lite && tier < 1;
      grade.uniforms.uTilt.value = lite ? 0 : o.tilt * 0.15;
    };
    return {
      async warm(pause) {
        /* the output pass picks its defines on first use; pick them now so the warm shader is the one it uses */
        const out = output as unknown as { _outputColorSpace: string; _toneMapping: number; material: THREE.ShaderMaterial };
        out._outputColorSpace = renderer.outputColorSpace;
        out._toneMapping = renderer.toneMapping;
        out.material.defines = { SRGB_TRANSFER: "" };
        if (renderer.toneMapping === THREE.ACESFilmicToneMapping) out.material.defines.ACES_FILMIC_TONE_MAPPING = "";
        const mats: [THREE.Material, boolean][] = [];
        composer.passes.forEach((pass, i) => {
          /* only the last pass draws to the screen; the composer sets that flag on its first render */
          const screen = i === composer.passes.length - 1;
          for (const v of Object.values(pass)) {
            for (const m of Array.isArray(v) ? v : [v]) if (m instanceof THREE.Material) mats.push([m, screen]);
          }
        });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        for (const [m, screen] of mats) {
          quad.material = m;
          renderer.setRenderTarget(screen ? null : target);
          renderer.compile(quad, cam);
          await pause();
        }
        renderer.setRenderTarget(null);
        quad.geometry.dispose();
        /* with parallel compiling, wait here until the graphics card has finished them */
        const parallel = renderer.extensions.has("KHR_parallel_shader_compile");
        const ready = (m: THREE.Material) =>
          (renderer.properties.get(m) as { currentProgram?: { isReady: () => boolean } }).currentProgram?.isReady() ?? true;
        for (let i = 0; parallel && i < 200 && !mats.every(([m]) => ready(m)); i++) await new Promise((r) => setTimeout(r, 10));
        /* and read their uniforms now rather than inside the first frame */
        for (const [m] of mats) {
          (renderer.properties.get(m) as { currentProgram?: { getUniforms: () => unknown } }).currentProgram?.getUniforms();
          await pause();
        }
      },
      render(dt, t) {
        grade.uniforms.uTime.value = t;
        composer.render(dt);
      },
      resize(w, h, ratio) {
        composer.setPixelRatio(ratio);
        composer.setSize(w, h);
        grade.uniforms.uRes.value.set(w * ratio, h * ratio);
      },
      setLite(on) {
        lite = on;
        apply();
      },
      setTier(t) {
        tier = t;
        apply();
      },
      setNight(n) {
        /* daylight is bright everywhere, so only real lights bloom; at night the windows and lamps do */
        bloom.strength = 0.14 + n * 0.41;
        bloom.threshold = 1.6 - n * 0.74;
      },
      dispose() {
        renderPass.dispose();
        gtao?.dispose();
        bloom.dispose();
        output.dispose();
        grade.dispose();
        composer.dispose();
        target.dispose();
      },
    };
  } catch {
    return null;
  }
}
