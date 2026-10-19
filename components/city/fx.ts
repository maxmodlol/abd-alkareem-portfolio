import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type Fx = {
  render: (dt: number, t: number) => void;
  resize: (w: number, h: number, pr: number) => void;
  setNight: (n: number) => void;
  dispose: () => void;
};

/** Film look: bloom, tilt-shift softness at the top and bottom, warm highlights, vignette and grain. */
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
      col = mix(col, col * vec3(1.07, 1.0, 0.92), smoothstep(0.45, 1.0, l));
      col = mix(col, col * vec3(0.9, 1.0, 1.1), 1.0 - smoothstep(0.0, 0.45, l));
      col = (col - 0.5) * 1.02 + 0.5;
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
  o: { samples: number; tilt: number },
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
    grade.uniforms.uTilt.value = o.tilt * 0.4;
    grade.uniforms.uRes.value.set(size.x * pr, size.y * pr);
    composer.addPass(renderPass);
    composer.addPass(bloom);
    composer.addPass(output);
    composer.addPass(grade);
    return {
      render(dt, t) {
        grade.uniforms.uTime.value = t;
        composer.render(dt);
      },
      resize(w, h, ratio) {
        composer.setPixelRatio(ratio);
        composer.setSize(w, h);
        grade.uniforms.uRes.value.set(w * ratio, h * ratio);
      },
      setNight(n) {
        bloom.strength = 0.25 + n * 0.3;
        bloom.threshold = 0.92 - n * 0.06;
      },
      dispose() {
        renderPass.dispose();
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
