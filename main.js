import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAP_SIZE = 48;

const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const aspect = window.innerWidth / window.innerHeight;
const d = MAP_SIZE * 2;
const camera = new TR.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

const angle = Math.atan(Math.sqrt(2) / 2);
camera.position.set(MAP_SIZE, MAP_SIZE, MAP_SIZE);
camera.rotation.order = 'YXZ';
camera.rotation.y = -Math.PI / 4;
camera.rotation.x = -angle;

const backgroundScene = new TR.Scene();
const backgroundCamera = new TR.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const textureLoader = new TR.TextureLoader();
let backgroundMaterial; // Declare backgroundMaterial globally
textureLoader.load('assets/snow.png', (texture) => {
  texture.encoding = TR.sRGBEncoding;
  backgroundMaterial = new TR.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });
  const backgroundPlane = new TR.Mesh(new TR.PlaneGeometry(2, 2), backgroundMaterial);
  backgroundScene.add(backgroundPlane);
});

let mixer, idleAction, attackAction;
let model; // Declare model globally
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  'assets/fulmen/fulmen.gltf',
  (gltf) => {
    model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(10, 10, 10);

    model.traverse((node) => {
      if (node.isMesh) {
        node.material = new TR.MeshBasicMaterial({ map: node.material.map });
      }
    });

    scene.add(model);

    mixer = new TR.AnimationMixer(model);

    const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('idle'));
    idleAction = mixer.clipAction(idleClip);
    idleAction.play();

    const attackClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('attack'));
    attackAction = mixer.clipAction(attackClip);
    attackAction.loop = TR.LoopOnce;
    attackAction.clampWhenFinished = true;
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// Lightning animation setup
let lightningPlane, lightningTexture;
let currentFrame = 0;
let lastFrameTime = 0;
const totalFrames = 30;
const frameChangeInterval = 70; // Frame duration in ms

textureLoader.load('assets/lightning.png', (texture) => {
  lightningTexture = texture;
  lightningTexture.encoding = TR.sRGBEncoding;
  lightningTexture.wrapS = TR.RepeatWrapping;
  lightningTexture.wrapT = TR.RepeatWrapping;
  lightningTexture.repeat.set(1 / 6, 1 / 5); // Each frame size (6x5 grid)
  lightningTexture.offset.set(0, 1 - 1 / 5); // Start from the first frame

  const lightningMaterial = new TR.MeshBasicMaterial({
    map: lightningTexture,
    transparent: true,
    side: TR.DoubleSide,
    depthTest: false, // Ensures it's rendered in front
  });
  lightningPlane = new TR.Mesh(new TR.PlaneGeometry(50, 50), lightningMaterial);
  lightningPlane.visible = false;
  lightningPlane.renderOrder = 999; // Render on top

  scene.add(lightningPlane);
});

const clock = new TR.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.render(scene, camera);

  if (lightningPlane && lightningPlane.visible) {
    const currentTime = Date.now();
    if (currentTime - lastFrameTime >= frameChangeInterval) {
      lastFrameTime = currentTime;
      const col = currentFrame % 6;
      const row = Math.floor(currentFrame / 6) % 5;
      lightningTexture.offset.set(col / 6, 1 - (row + 1) / 5);
      currentFrame++;
      if (currentFrame >= totalFrames) {
        lightningPlane.visible = false;
        currentFrame = 0;

        // Restore background color when lightning animation ends
        if (backgroundMaterial) {
          backgroundMaterial.color.setRGB(1, 1, 1);
        }
      }
    }
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.updateProjectionMatrix();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'q' && attackAction && idleAction) {
    idleAction.fadeOut(0.1);
    attackAction.reset().fadeIn(0.1).play();

    attackAction.loop = TR.LoopOnce;
    attackAction.clampWhenFinished = true;

    mixer.addEventListener('finished', function restoreIdle(e) {
      if (e.action === attackAction) {
        mixer.removeEventListener('finished', restoreIdle);
        attackAction.stop();
        idleAction.reset().fadeIn(0.1).play();
      }
    });

    setTimeout(() => {
      if (lightningPlane && model) {
        lightningPlane.visible = true;
        currentFrame = 0; // Reset animation
        lastFrameTime = Date.now();

        // Position the plane at the model's position
        lightningPlane.position.copy(model.position);

        // Ensure the plane faces the camera
        lightningPlane.quaternion.copy(camera.quaternion);

        // Darken the background by 90%
        if (backgroundMaterial) {
          backgroundMaterial.color.setRGB(0.1, 0.1, 0.1);
        }
      }
    }, 1000);
  }
});
