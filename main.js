import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAP_SIZE = 48;

const scene = new TR.Scene();

const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Adjust the camera for isometric view
const aspect = window.innerWidth / window.innerHeight;
const d = MAP_SIZE * 2;
const camera = new TR.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

// Position and rotate the camera for isometric projection
const angle = Math.atan(Math.sqrt(2) / 2); // Approximately 35.264 degrees
camera.position.set(MAP_SIZE, MAP_SIZE, MAP_SIZE);
camera.rotation.order = 'YXZ';
camera.rotation.y = -Math.PI / 4; // Rotate -45 degrees around Y-axis
camera.rotation.x = -angle; // Rotate downwards to look at the scene

// Create a background plane that covers the camera's view
const backgroundScene = new TR.Scene();
const backgroundCamera = new TR.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Load the background texture
const textureLoader = new TR.TextureLoader();
textureLoader.load(
  'assets/snow.png',
  (texture) => {
    texture.encoding = TR.sRGBEncoding;

    const backgroundMaterial = new TR.MeshBasicMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
    });

    const backgroundPlane = new TR.Mesh(new TR.PlaneGeometry(2, 2), backgroundMaterial);

    backgroundPlane.material.depthTest = false;
    backgroundPlane.material.depthWrite = false;
    backgroundScene.add(backgroundPlane);
  },
  undefined,
  (error) => {
    console.error('Error loading background texture:', error);
  }
);

let mixer;

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  'assets/fulmen/fulmen.gltf',
  (gltf) => {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(10, 10, 10);

    model.traverse((node) => {
      if (node.isMesh) {
        node.material = new TR.MeshBasicMaterial({ map: node.material.map });
      }
    });

    scene.add(model);

    mixer = new TR.AnimationMixer(model);

    const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('idle')) || gltf.animations[0];
    const idleAction = mixer.clipAction(idleClip);
    idleAction.play();
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

const clock = new TR.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta(); // Get the time elapsed since the last frame in seconds
  if (mixer) mixer.update(delta);

  renderer.autoClear = false;
  renderer.clear();

  // Render the background scene
  renderer.render(backgroundScene, backgroundCamera);

  // Render the main scene
  renderer.render(scene, camera);
});

// Handle window resize to maintain aspect ratio
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.updateProjectionMatrix();
});
