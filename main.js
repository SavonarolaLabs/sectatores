import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSpriteEffect } from './spells';
import { initializeSpells, spellManager } from './initSpells';
import { gltfModels } from './gltfModels';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Corrected import path

const MAP_SIZE = 48;

// Use the same model for allies and enemies
const allyModelIndex = 3; // Adjust this index to use a different model for allies
const enemyModelIndex = 3; // Adjust this index to use a different model for enemies
const modelScale = 0.1;

// Scene Setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = TR.PCFSoftShadowMap; // Optional: set shadow map type for soft shadows
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

let aspect = window.innerWidth / window.innerHeight;
const d = MAP_SIZE * 2;
const camera = new TR.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

const angle = Math.atan(Math.sqrt(2) / 2);
camera.position.set(MAP_SIZE, MAP_SIZE, MAP_SIZE);
camera.rotation.order = 'YXZ';
camera.rotation.y = -Math.PI / 4;
camera.rotation.x = -angle;

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minZoom = 0.5;
controls.maxZoom = 5;
camera.zoom = 3.5; // Adjust this value for your desired initial zoom level

loadCameraSettings();
camera.updateProjectionMatrix();

controls.addEventListener('change', saveCameraSettings);

function saveCameraSettings() {
  const cameraSettings = {
    position: camera.position.toArray(),
    zoom: camera.zoom,
    target: controls.target.toArray(), // Save the OrbitControls target
  };
  localStorage.setItem('cameraSettings', JSON.stringify(cameraSettings));
}

function loadCameraSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('cameraSettings'));
  if (savedSettings) {
    camera.position.fromArray(savedSettings.position);
    camera.zoom = savedSettings.zoom;
    camera.updateProjectionMatrix();
    controls.target.fromArray(savedSettings.target); // Load the OrbitControls target
    controls.update(); // Update the controls to reflect the loaded settings
  }
}

// Background Setup
const backgroundScene = new TR.Scene();
const backgroundCamera = new TR.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const textureLoader = new TR.TextureLoader();
let backgroundMaterial;
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

// Ground Plane (Invisible but receives shadows)
const groundGeometry = new TR.PlaneGeometry(200, 200);
const groundMaterial = new TR.ShadowMaterial({ opacity: 0.5 }); // Adjust opacity as needed
const ground = new TR.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
ground.position.y = 0; // Place it at y = 0
ground.receiveShadow = true; // Allow the ground to receive shadows
scene.add(ground);

// Add Lights
const directionalLight = new TR.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 50, 0); // Position the light source
directionalLight.castShadow = true; // Enable shadow casting by the light

// Configure shadow properties for better quality
directionalLight.shadow.mapSize.width = 2048; // Increase if necessary
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -200;
directionalLight.shadow.camera.right = 200;
directionalLight.shadow.camera.top = 200;
directionalLight.shadow.camera.bottom = -200;
scene.add(directionalLight);

// Optional: Add an ambient light for general illumination
const ambientLight = new TR.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);

// Models and Animations
const models = {};
const mixers = {};
const actions = {};

const gltfLoader = new GLTFLoader();

function loadModel(name, path, options = {}) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(options.position.x, options.position.y, options.position.z);
        model.scale.set(options.scale.x, options.scale.y, options.scale.z);
        if (options.rotation) {
          model.rotation.y = options.rotation.y;
        }

        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true; // Enable shadow casting for the model
            node.receiveShadow = false; // Models don't receive shadows by default
            // Use original material or create a basic material with texture
            if (node.material.map) {
              node.material = new TR.MeshBasicMaterial({ map: node.material.map });
            } else {
              node.material = new TR.MeshBasicMaterial({ color: node.material.color });
            }
            node.userData.originalMaterial = node.material.clone();
          }
        });

        scene.add(model);

        const mixer = new TR.AnimationMixer(model);
        mixers[name] = mixer;

        const modelActions = {};
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          if (clip.name.toLowerCase().includes('idle')) {
            modelActions.idle = action;
            action.play();
          } else if (clip.name.toLowerCase().includes('attack')) {
            modelActions.attack = action;
            action.loop = TR.LoopOnce;
            action.clampWhenFinished = true;
          } else if (clip.name.toLowerCase().includes('deth')) {
            modelActions.death = action;
            action.loop = TR.LoopOnce;
            action.clampWhenFinished = true;
          }
        });
        actions[name] = modelActions;
        models[name] = model;

        resolve();
      },
      undefined,
      (error) => {
        console.error(`Error loading model ${name}:`, error);
        reject(error);
      }
    );
  });
}

// Function to properly clone a GLTF model with animations (if needed)
function cloneGltf(gltf) {
  // ... [your existing cloneGltf function, if used] ...
}

// Animation Loop
const clock = new TR.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  Object.values(mixers).forEach((mixer) => mixer.update(delta));

  // Update spells
  spellManager.update(delta);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.render(scene, camera);
});

const offsetX = 8.5;
const offsetZ = 11;

const posX = 9;
const rowSpacing = 12; // Distance between rows
const columnSpacing = 15; // Distance between units in a row

// Character configurations
const characterConfigs = [
  {
    name: 'ally1',
    path: gltfModels[11],
    position: { x: -posX + offsetX, y: 0, z: -columnSpacing + offsetZ },
    scale: { x: modelScale * 0.5, y: modelScale * 0.5, z: modelScale * 0.5 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally2',
    path: gltfModels[5],
    position: { x: -posX + offsetX, y: 0, z: 0 + offsetZ },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'hero',
    path: 'assets/fulmen/fulmen.gltf',
    position: { x: -posX + offsetX, y: 0, z: columnSpacing + offsetZ },
    scale: { x: 3, y: 3, z: 3 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally4',
    path: gltfModels[9],
    position: { x: -posX - rowSpacing + offsetX, y: 0, z: -columnSpacing + offsetZ },
    scale: { x: modelScale * 0.5, y: modelScale * 0.5, z: modelScale * 0.5 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally5',
    path: gltfModels[10],
    position: { x: -posX - rowSpacing + offsetX, y: 0, z: 0 + offsetZ },
    scale: { x: modelScale * 0.4, y: modelScale * 0.4, z: modelScale * 0.4 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally6',
    path: gltfModels[22],
    position: { x: -posX - rowSpacing + offsetX, y: 0, z: columnSpacing + offsetZ },
    scale: { x: modelScale * 1.2, y: modelScale * 1.2, z: modelScale * 1.2 },
    rotation: { y: Math.PI / 2 },
  },

  // Enemies (6 enemies in two rows)
  {
    name: 'enemy1',
    path: gltfModels[14],
    position: { x: posX + offsetX, y: 0, z: -columnSpacing + offsetZ },
    scale: { x: modelScale * 80, y: modelScale * 80, z: modelScale * 80 },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy2',
    path: gltfModels[17],
    position: { x: posX + offsetX, y: 0, z: 0 + offsetZ },
    scale: { x: modelScale * 50, y: modelScale * 50, z: modelScale * 50 },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy3',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + offsetX, y: 0, z: columnSpacing + offsetZ },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy4',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing + offsetX, y: 0, z: -columnSpacing + offsetZ },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy5',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing + offsetX, y: 0, z: 0 + offsetZ },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy6',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing + offsetX, y: 0, z: columnSpacing + offsetZ },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
];

// Load all character models
const loadPromises = characterConfigs.map((config) => loadModel(config.name, config.path, config));

Promise.all(loadPromises).then(() => {
  initializeSpells(textureLoader, scene, camera, TR, 0, null, actions, mixers, models);
});

// Event Listeners
window.addEventListener('keydown', (event) => {
  if (event.key === 't') {
    Object.keys(models).forEach((name) => {
      const modelActions = actions[name];
      if (modelActions.death && modelActions.idle) {
        modelActions.death.reset().play();
        modelActions.idle.reset().play();
      }

      const model = models[name];
      model.traverse((node) => {
        if (node.isMesh && node.userData.originalMaterial) {
          node.material.copy(node.userData.originalMaterial);
        }
      });
    });
  } else {
    spellManager.castSpellByKey(event.key);
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.updateProjectionMatrix();
});
