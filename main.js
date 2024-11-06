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

    // Scale panSpeed inversely with the camera's zoom level
    const panSpeed = 0.04;
    const deltaX = -panDelta.x * panSpeed;
    const deltaY = -panDelta.y * panSpeed;

    const panOffset = new TR.Vector3(deltaX, 0, deltaY);
    panOffset.applyAxisAngle(new TR.Vector3(0, 1, 0), camera.rotation.y);

    camera.position.add(panOffset);
    panStart.copy(panEnd);

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
      const panSpeed = 0.04;
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
  let grassTileCount = 0;
  let waterTileCount = 0;
  let treeCount = 0;
  let buildingCount = 0;

  // First pass: Count the number of each type
  for (let x = 0; x < gameMap.width; x++) {
    for (let y = 0; y < gameMap.height; y++) {
      const tile = gameMap.tiles[x][y];

      // Count terrain types
      if (tile.terrainType === 'grass') {
        grassTileCount++;
      } else if (tile.terrainType === 'water') {
        waterTileCount++;
      }

      // Count objects
      if (tile.object === 'tree') {
        treeCount++;
      } else if (tile.object === 'building') {
        buildingCount++;
      }
    }
  }

  // Create instanced meshes
  const tileGeometry = new TR.PlaneGeometry(TILE_SIZE, TILE_SIZE);

  const grassTileMesh = new TR.InstancedMesh(tileGeometry, terrainMaterials['grass'], grassTileCount);
  grassTileMesh.instanceMatrix.setUsage(TR.DynamicDrawUsage);
  grassTileMesh.receiveShadow = true;

  const waterTileMesh = new TR.InstancedMesh(tileGeometry, terrainMaterials['water'], waterTileCount);
  waterTileMesh.instanceMatrix.setUsage(TR.DynamicDrawUsage);
  waterTileMesh.receiveShadow = true;

  const treeGeometry = treeModels[0].children[0].geometry;
  const treeMaterial = treeModels[0].children[0].material;
  const treeMesh = new TR.InstancedMesh(treeGeometry, treeMaterial, treeCount);
  treeMesh.instanceMatrix.setUsage(TR.DynamicDrawUsage);
  treeMesh.castShadow = true;

  const buildingGeometry = buildingModel.children[0].geometry;
  const buildingMaterial = buildingModel.children[0].material;
  const buildingMesh = new TR.InstancedMesh(buildingGeometry, buildingMaterial, buildingCount);
  buildingMesh.instanceMatrix.setUsage(TR.DynamicDrawUsage);
  buildingMesh.castShadow = true;

  // Second pass: Set instance matrices
  let grassIndex = 0;
  let waterIndex = 0;
  let treeIndex = 0;
  let buildingIndex = 0;

  for (let x = 0; x < gameMap.width; x++) {
    for (let y = 0; y < gameMap.height; y++) {
      const tile = gameMap.tiles[x][y];
      const positionMatrix = new TR.Matrix4().makeTranslation(x * TILE_SIZE, 0, y * TILE_SIZE);

      // Set matrices for terrain
      if (tile.terrainType === 'grass') {
        grassTileMesh.setMatrixAt(grassIndex++, positionMatrix);
      } else if (tile.terrainType === 'water') {
        waterTileMesh.setMatrixAt(waterIndex++, positionMatrix);
      }

      // Set matrices for objects
      if (tile.object === 'tree') {
        treeMesh.setMatrixAt(treeIndex++, positionMatrix);
      } else if (tile.object === 'building') {
        buildingMesh.setMatrixAt(buildingIndex++, positionMatrix);
      }
    }
  }

  // Update instance matrices
  grassTileMesh.instanceMatrix.needsUpdate = true;
  waterTileMesh.instanceMatrix.needsUpdate = true;
  treeMesh.instanceMatrix.needsUpdate = true;
  buildingMesh.instanceMatrix.needsUpdate = true;

  // Add meshes to the scene
  scene.add(grassTileMesh);
  scene.add(waterTileMesh);
  scene.add(treeMesh);
  scene.add(buildingMesh);
}

// fps
function updateFPSCounter() {
  let lastFrameTime = performance.now();
  let frameCount = 0;

  return () => {
    frameCount++;
    const currentFrameTime = performance.now();

    if (currentFrameTime - lastFrameTime >= 1000) {
      document.getElementById('fpsCounter').textContent = `FPS: ${frameCount}`;
      frameCount = 0;
      lastFrameTime = currentFrameTime;
    }
  };
}

const updateFPS = updateFPSCounter();

function updateMetrics(renderer) {
  return () => {
    const info = renderer.info;
    document.getElementById('metricsCounter').textContent = `Triangles: ${info.render.triangles}, Draw Calls: ${info.render.calls}`;
  };
}

const updateRenderMetrics = updateMetrics(renderer);

// Animation Loop
renderer.setAnimationLoop(() => {
  updateFPS();
  updateRenderMetrics();
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
