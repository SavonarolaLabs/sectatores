import * as TR from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const MAP_SIZE = 48;

// Scene Setup
const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TR.PCFSoftShadowMap;
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

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minZoom = 0.5;
controls.maxZoom = 5;
camera.zoom = 3.5;

loadCameraSettings();
camera.updateProjectionMatrix();

controls.addEventListener('change', saveCameraSettings);

function saveCameraSettings() {
  const cameraSettings = {
    position: camera.position.toArray(),
    zoom: camera.zoom,
    target: controls.target.toArray(),
  };
  localStorage.setItem('cameraSettings_FoliageTest', JSON.stringify(cameraSettings));
}

function loadCameraSettings() {
  const savedSettings = JSON.parse(localStorage.getItem('cameraSettings_FoliageTest'));
  if (savedSettings) {
    camera.position.fromArray(savedSettings.position);
    camera.zoom = savedSettings.zoom;
    camera.updateProjectionMatrix();
    controls.target.fromArray(savedSettings.target);
    controls.update();
  }
}

// Ground Plane (receives shadows)
const groundGeometry = new TR.PlaneGeometry(200, 200);
const groundMaterial = new TR.ShadowMaterial({ opacity: 0.5 });
const ground = new TR.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

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
const backgroundScene = new TR.Scene();
const backgroundCamera = new TR.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const textureLoader = new TR.TextureLoader();
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
