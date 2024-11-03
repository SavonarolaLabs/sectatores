import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSpriteEffect } from './spells';
import { initializeSpells, spellManager } from './initSpells';
import { gltfModels } from './gltfModels';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

const MAP_SIZE = 48;

// Use the same model for allies and enemies
const allyModelIndex = 3; // Adjust this index to use a different model for allies
const enemyModelIndex = 3; // Adjust this index to use a different model for enemies
const modelScale = 0.1;

// Scene Setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
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
    controls.update(); // Add this line to update the controls
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

// Models and Animations
const models = {};
const mixers = {};
const actions = {};

const gltfLoader = new GLTFLoader();

function loadModel(name, path, options = {}) {
  return /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
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
              node.material = new TR.MeshBasicMaterial({ map: node.material.map });
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
    })
  );
}

// Function to properly clone a GLTF model with animations
function cloneGltf(gltf) {
  const clone = {
    animations: gltf.animations.map((animation) => animation.clone()),
    scene: gltf.scene.clone(true),
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(function (node) {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(function (node) {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }
    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(new TR.Skeleton(orderedCloneBones, skeleton.boneInverses), cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}

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

const posX = 12;
const rowSpacing = 15; // Distance between rows
const columnSpacing = 15; // Distance between units in a row

// Character configurations
const characterConfigs = [
  // Hero
  {
    name: 'ally1',
    path: gltfModels[11],
    position: { x: -posX, y: 0, z: -columnSpacing },
    scale: { x: modelScale * 0.5, y: modelScale * 0.5, z: modelScale * 0.5 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally2',
    path: gltfModels[5],
    position: { x: -posX, y: 0, z: 0 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'hero',
    path: 'assets/fulmen/fulmen.gltf',
    position: { x: -posX, y: 0, z: columnSpacing },
    scale: { x: 3, y: 3, z: 3 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally4',
    path: gltfModels[9],
    position: { x: -posX - rowSpacing, y: 0, z: -columnSpacing },
    scale: { x: modelScale * 0.5, y: modelScale * 0.5, z: modelScale * 0.5 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally5',
    path: gltfModels[10],
    position: { x: -posX - rowSpacing, y: 0, z: 0 },
    scale: { x: modelScale * 0.4, y: modelScale * 0.4, z: modelScale * 0.4 },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally6',
    path: gltfModels[22],
    position: { x: -posX - rowSpacing, y: 0, z: columnSpacing },
    scale: { x: modelScale * 1.2, y: modelScale * 1.2, z: modelScale * 1.2 },
    rotation: { y: Math.PI / 2 },
  },

  // Enemies (6 enemies in two rows)
  {
    name: 'enemy1',
    path: gltfModels[14],
    position: { x: posX, y: 0, z: -columnSpacing },
    scale: { x: modelScale * 80, y: modelScale * 80, z: modelScale * 80 },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy2',
    path: gltfModels[17],
    position: { x: posX, y: 0, z: 0 },
    scale: { x: modelScale * 50, y: modelScale * 50, z: modelScale * 50 },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy3',
    path: gltfModels[enemyModelIndex],
    position: { x: posX, y: 0, z: columnSpacing },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy4',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing, y: 0, z: -columnSpacing },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy5',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing, y: 0, z: 0 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy6',
    path: gltfModels[enemyModelIndex],
    position: { x: posX + rowSpacing, y: 0, z: columnSpacing },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
];

// Load all character models
const loadPromises = characterConfigs.map((config) => loadModel(config.name, config.path, config));

Promise.all(loadPromises).then(() => {
  initializeSpells(textureLoader, scene, camera, TR, 0, null, actions, mixers, models);
});

// Animation Loop
const clock = new TR.Clock();

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
