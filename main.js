// Main Script
import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Map, Tile } from './MapGenerator.js';

// Constants
const MAP_SIZE = 96;
const TILE_SIZE = 1;

// Scene Setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TR.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Camera Setup
const aspect = window.innerWidth / window.innerHeight;
const d = (MAP_SIZE * TILE_SIZE) / 2;
const camera = new TR.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);

// Set fixed isometric angle
const angle = Math.atan(Math.sqrt(2));
const centerX = (MAP_SIZE * TILE_SIZE) / 2;
const centerZ = (MAP_SIZE * TILE_SIZE) / 2;

// Set camera position and rotation
camera.position.set(centerX, d, centerZ);
camera.rotation.order = 'YXZ';
camera.rotation.y = -Math.PI / 4;
camera.rotation.x = -angle;

loadCameraSettings();
camera.updateProjectionMatrix();

// Implement custom panning controls
let isPanning = false;
let panStart = new TR.Vector2();
let panEnd = new TR.Vector2();
let panDelta = new TR.Vector2();

function onMouseDown(event) {
  isPanning = true;
  panStart.set(event.clientX, event.clientY);
}

function onMouseMove(event) {
  if (isPanning) {
    panEnd.set(event.clientX, event.clientY);
    panDelta.subVectors(panEnd, panStart);

    // Calculate pan movement
    const panSpeed = 0.005 * camera.zoom;
    const deltaX = -panDelta.x * panSpeed;
    const deltaY = panDelta.y * panSpeed;

    // Adjust camera position
    const panOffset = new TR.Vector3();
    panOffset.set(deltaX, 0, deltaY);
    panOffset.applyMatrix4(new TR.Matrix4().extractRotation(camera.matrix));

    camera.position.add(panOffset);

    panStart.copy(panEnd);

    // Save camera settings after panning
    saveCameraSettings();
  }
}

function onMouseUp(event) {
  isPanning = false;
}

renderer.domElement.addEventListener('mousedown', onMouseDown, false);
renderer.domElement.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('mouseup', onMouseUp, false);
renderer.domElement.addEventListener('mouseleave', onMouseUp, false);

// Handle touch events
renderer.domElement.addEventListener(
  'touchstart',
  function (event) {
    if (event.touches.length == 1) {
      isPanning = true;
      panStart.set(event.touches[0].clientX, event.touches[0].clientY);
    }
  },
  false
);

renderer.domElement.addEventListener(
  'touchmove',
  function (event) {
    if (isPanning && event.touches.length == 1) {
      panEnd.set(event.touches[0].clientX, event.touches[0].clientY);
      panDelta.subVectors(panEnd, panStart);

      // Calculate pan movement
      const panSpeed = 0.005 * camera.zoom;
      const deltaX = -panDelta.x * panSpeed;
      const deltaY = panDelta.y * panSpeed;

      // Adjust camera position
      const panOffset = new TR.Vector3();
      panOffset.set(deltaX, 0, deltaY);
      panOffset.applyMatrix4(new TR.Matrix4().extractRotation(camera.matrix));

      camera.position.add(panOffset);

      panStart.copy(panEnd);

      // Save camera settings after panning
      saveCameraSettings();
    }
  },
  false
);

renderer.domElement.addEventListener(
  'touchend',
  function (event) {
    isPanning = false;
  },
  false
);

// Implement zoom with mouse wheel
renderer.domElement.addEventListener(
  'wheel',
  function (event) {
    event.preventDefault();
    const zoomSpeed = 0.1;
    if (event.deltaY > 0) {
      camera.zoom = Math.max(camera.zoom / (1 + zoomSpeed), 0.5);
    } else {
      camera.zoom = Math.min(camera.zoom * (1 + zoomSpeed), 5);
    }
    camera.updateProjectionMatrix();
    saveCameraSettings();
  },
  false
);

function saveCameraSettings() {
  const cameraSettings = {
    position: camera.position.toArray(),
    zoom: camera.zoom,
  };
  localStorage.setItem('cameraSettings_TileMap', JSON.stringify(cameraSettings));
}

function loadCameraSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('cameraSettings_TileMap'));
  if (savedSettings) {
    camera.position.fromArray(savedSettings.position);
    camera.zoom = savedSettings.zoom;
    camera.updateProjectionMatrix();
  }
}

// Lighting
const directionalLight = new TR.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 50, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -200;
directionalLight.shadow.camera.right = 200;
directionalLight.shadow.camera.top = 200;
directionalLight.shadow.camera.bottom = -200;
scene.add(directionalLight);

const ambientLight = new TR.AmbientLight(0x404040);
scene.add(ambientLight);

// Background Setup
const textureLoader = new TR.TextureLoader();
const backgroundScene = new TR.Scene();
const backgroundCamera = new TR.OrthographicCamera(-1, 1, 1, -1, 0, 1);
textureLoader.load('assets/snow.png', (texture) => {
  texture.encoding = TR.sRGBEncoding;
  const backgroundMaterial = new TR.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });
  const backgroundPlane = new TR.Mesh(new TR.PlaneGeometry(2, 2), backgroundMaterial);
  backgroundScene.add(backgroundPlane);
});

// GLTF Loader
const gltfLoader = new GLTFLoader();

// Generate the Map
const mapWidth = MAP_SIZE;
const mapHeight = MAP_SIZE;
const gameMap = new Map(mapWidth, mapHeight);

// Modify Terrain
for (let x = 10; x < 15; x++) {
  for (let y = 10; y < 15; y++) {
    gameMap.setTerrain(x, y, 'water');
  }
}

// Place Trees
for (let i = 0; i < 50; i++) {
  const x = Math.floor(Math.random() * mapWidth);
  const y = Math.floor(Math.random() * mapHeight);
  gameMap.placeObject(x, y, 'tree');
}

// Place Buildings
for (let i = 0; i < 10; i++) {
  const x = Math.floor(Math.random() * mapWidth);
  const y = Math.floor(Math.random() * mapHeight);
  gameMap.placeObject(x, y, 'building');
}

// Load Textures and Models
Promise.all([
  // Load ground textures
  Promise.all([loadTexture('assets/env/HandPaintedEnv/Ground_1.PNG'), loadTexture('assets/env/HandPaintedEnv/Ground_1_normal.PNG')]).then(function (textures) {
    const groundColorTexture = textures[0];
    const groundNormalTexture = textures[1];

    // Create terrain materials
    const terrainMaterials = {
      grass: new TR.MeshStandardMaterial({
        map: groundColorTexture,
        normalMap: groundNormalTexture,
      }),
      water: new TR.MeshStandardMaterial({ color: 0x0000ff }),
      mountain: new TR.MeshStandardMaterial({ color: 0x808080 }),
    };

    return terrainMaterials;
  }),
  // Load models
  Promise.all([loadModel('assets/env/Tree_1_snowy.gltf'), loadModel('assets/env/Tree_4.gltf'), loadModel('assets/env/Baker_house.gltf')]).then(function (models) {
    return {
      treeModels: [models[0], models[1]],
      buildingModel: models[2],
    };
  }),
])
  .then(function (results) {
    const terrainMaterials = results[0];
    const models = results[1];
    const treeModels = models.treeModels;
    const buildingModel = models.buildingModel;

    // Now render the map
    renderMap(gameMap, terrainMaterials, treeModels, buildingModel);
  })
  .catch(function (error) {
    console.error('An error occurred:', error);
  });

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      function (texture) {
        resolve(texture);
      },
      undefined,
      function (error) {
        reject(error);
      }
    );
  });
}

function loadModel(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      function (gltf) {
        resolve(gltf.scene);
      },
      undefined,
      function (error) {
        reject(error);
      }
    );
  });
}

// Render the Map
function renderMap(gameMap, terrainMaterials, treeModels, buildingModel) {
  for (let x = 0; x < gameMap.width; x++) {
    for (let y = 0; y < gameMap.height; y++) {
      const tile = gameMap.tiles[x][y];

      // Terrain Mesh
      const material = terrainMaterials[tile.terrainType] || terrainMaterials['grass'];
      const geometry = new TR.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const tileMesh = new TR.Mesh(geometry, material);
      tileMesh.rotation.x = -Math.PI / 2;
      tileMesh.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
      tileMesh.receiveShadow = true;
      scene.add(tileMesh);

      // Object Mesh
      if (tile.object) {
        let objectMesh;
        switch (tile.object) {
          case 'tree':
            // Randomly pick one of the tree models
            const treeModel = treeModels[Math.floor(Math.random() * treeModels.length)];
            objectMesh = treeModel.clone();
            objectMesh.scale.set(0.5, 0.5, 0.5); // Adjust scale if necessary
            objectMesh.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
            break;
          case 'building':
            // Clone the building model
            objectMesh = buildingModel.clone();
            objectMesh.scale.set(0.5, 0.5, 0.5); // Adjust scale if necessary
            objectMesh.position.set(x * TILE_SIZE, 0, y * TILE_SIZE);
            break;
          default:
            break;
        }
        if (objectMesh) {
          objectMesh.traverse(function (node) {
            if (node.isMesh) {
              node.castShadow = true;
            }
          });
          scene.add(objectMesh);
        }
      }
    }
  }
}

// Animation Loop
renderer.setAnimationLoop(() => {
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.render(scene, camera);
});

// Resize Event
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.updateProjectionMatrix();
});
