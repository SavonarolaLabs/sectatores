import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAP_SIZE = 48;

const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const camera = new TR.OrthographicCamera(-MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2, -MAP_SIZE / 2, 0.1, MAP_SIZE * 2);
camera.position.set(0, MAP_SIZE, 0);
camera.lookAt(0, 0, 0);

// Load the ground texture
const textureLoader = new TR.TextureLoader();
textureLoader.load('assets/snow.png', (texture) => {
  texture.encoding = TR.sRGBEncoding;
  const material = new TR.MeshBasicMaterial({ map: texture });
  const geometry = new TR.PlaneGeometry(MAP_SIZE, MAP_SIZE);
  const plane = new TR.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
});

let mixer;

const gltfLoader = new GLTFLoader();
gltfLoader.load('assets/fulmen/fulmen.gltf', (gltf) => {
  const model = gltf.scene;
  model.position.set(0, 10, 10);
  model.rotation.x = -Math.PI / 2;
  model.scale.set(10, 10, 10);

  model.traverse((node) => {
    if (node.isMesh) {
      node.material = new TR.MeshBasicMaterial({ map: node.material.map });
    }
  });

  scene.add(model);

  // Initialize the animation mixer
  mixer = new TR.AnimationMixer(model);

  // Find and play the 'idle' animation, or fallback to the first animation if needed
  const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('idle')) || gltf.animations[0];
  const idleAction = mixer.clipAction(idleClip);
  idleAction.play();
});

const clock = new TR.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // Get the time elapsed since the last frame in seconds
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
});
