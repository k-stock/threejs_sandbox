import * as THREE from 'three';
import {TextGeometry} from 'three/examples/jsm/Addons.js';
import {FontLoader} from 'three/examples/jsm/loaders/FontLoader.js';
import helvetikerFont from 'three/examples/fonts/helvetiker_regular.typeface.json';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const reflectiveScene = new THREE.Scene();
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 5, 2);
reflectiveScene.add(light);

const objects: THREE.Object3D[] = [];

const loader = new FontLoader();
const font = loader.parse(helvetikerFont);
const pos_num = 1;
for (let i = 0; i < 6; i++) {
  const sign = i % 2;
  const xyz = i >> 1;
  const pos_upd: number = pos_num * (sign === 0 ? 1 : -1);
  const geometry = new TextGeometry(`${i}`, {
    font: font,
    size: 1,
    curveSegments: 12,
    bevelEnabled: false,
    depth: 0.1,
  });
  let col = 0;
  const pos = new THREE.Vector3();
  if (sign === 0) {
    col |= 0xff0000;
  }
  if (xyz === 0) {
    col |= 0x7f00ff;
    pos.set(pos_upd, 0, 0);
  } else if (xyz === 1) {
    col |= 0x7fff00;
    pos.set(0, pos_upd, 0);
  } else if (xyz === 2) {
    col |= 0x7fffff;
    pos.set(0, 0, pos_upd);
  }
  const material = new THREE.MeshBasicMaterial({color: col});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(pos);
  objects.push(mesh);
  reflectiveScene.add(mesh);
}

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
  format: THREE.RGBAFormat,
  type: THREE.UnsignedByteType,
  generateMipmaps: true,
});
const cubeCamera = new THREE.CubeCamera(0.01, 1000, cubeRenderTarget);
cubeCamera.position.set(0, 0, 0);
reflectiveScene.add(cubeCamera);

cubeCamera.update(renderer, reflectiveScene);

const fisheyeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    envMap: {value: cubeRenderTarget.texture},
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform samplerCube envMap;
    varying vec2 vUv;

    void main() {
      float lon = atan(vUv.y - 0.5, vUv.x - 0.5);
      float r = 0.5 - length(vUv - vec2(0.5, 0.5));
      float lat = r * 3.1415926;

      vec3 dir;
      dir.x = cos(lat) * sin(lon);
      dir.y = sin(lat);
      dir.z = cos(lat) * cos(lon);

      vec4 color = textureCube(envMap, normalize(dir));
      if (r < 0.0) {
        color = vec4(0.5, 0.5, 0.5, 1.0); // 赤
      }

      gl_FragColor = color;
    }
  `,
  side: THREE.DoubleSide,
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), fisheyeMaterial);
scene.add(plane);

function animate() {
  requestAnimationFrame(animate);
  for (const idx in objects) {
    objects[idx].rotation.x += 0.001;
    objects[idx].rotation.y += 0.005;
  }
  cubeCamera.rotation.x += 0.0001;
  cubeCamera.rotation.z += 0.0003;
  cubeCamera.update(renderer, reflectiveScene);
  renderer.render(scene, camera);
}
animate();
