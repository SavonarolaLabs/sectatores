import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createSpriteEffect } from './spells';
import { initializeSpells, spellManager } from './initSpells';
import { gltfModels } from './gltfModels';

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

// Enemy positions
const enemyPositions = [
  {
    position: { x: 145, y: -55, z: 0 },
    rotation: { y: -Math.PI * 0.8 },
  },
  {
    position: { x: 160, y: -50, z: 20 },
    rotation: { y: -Math.PI * 0.6 },
  },
  {
    position: { x: 130, y: -60, z: -20 },
    rotation: { y: -Math.PI * 0.9 },
  },
];

// Load models
let koboldGLTF = null;

Promise.all([
  loadModel('hero', 'assets/fulmen/fulmen.gltf', {
    position: { x: 0, y: 0, z: 0 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
  }),
  new Promise((resolve, reject) => {
    gltfLoader.load(
      'assets/kobold/6be5470731a44b14af4cbd44aeaace23_Textured.gltf',
      (gltf) => {
        koboldGLTF = gltf;
        resolve();
      },
      undefined,
      (error) => {
        console.error('Error loading kobold model:', error);
        reject(error);
      }
    );
  }),
]).then(() => {
  // Clone kobold model for each enemy
  enemyPositions.forEach((options, index) => {
    const name = `kobold${index + 1}`;
    const clonedGltf = cloneGltf(koboldGLTF);
    const model = clonedGltf.scene;

    model.position.set(options.position.x, options.position.y, options.position.z);
    model.scale.set(10, 10, 10);
    model.rotation.y = options.rotation.y;

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
    clonedGltf.animations.forEach((clip) => {
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
  });

  // Initialize spells
  initializeSpells(textureLoader, scene, camera, TR, MAP_SIZE, backgroundMaterial, actions, mixers, models);
});

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

// Character configurations
const characterConfigs = [
  // Hero
  {
    name: 'hero',
    path: 'assets/fulmen/fulmen.gltf',
    position: { x: -70, y: 0, z: 0 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  // Allies (6 allies)
  {
    name: 'ally1',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: -50 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally2',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: -30 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally3',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: -10 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally4',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: modelScale },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally5',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: 30 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  {
    name: 'ally6',
    path: gltfModels[allyModelIndex],
    position: { x: -50, y: 0, z: 50 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: Math.PI / 2 },
  },
  // Enemies (6 enemies)
  {
    name: 'enemy1',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: -50 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy2',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: -30 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy3',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: -10 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy4',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: 10 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy5',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: 30 },
    scale: { x: modelScale, y: modelScale, z: modelScale },
    rotation: { y: -Math.PI / 2 },
  },
  {
    name: 'enemy6',
    path: gltfModels[enemyModelIndex],
    position: { x: 50, y: 0, z: 50 },
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
