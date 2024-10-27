import * as TR from 'three';

const MAP_SIZE = 48;

const scene = new TR.Scene();
const renderer = new TR.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = TR.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const camera = new TR.OrthographicCamera(-MAP_SIZE / 2, MAP_SIZE / 2, MAP_SIZE / 2, -MAP_SIZE / 2, 0.1, MAP_SIZE * 2);
camera.position.set(0, MAP_SIZE, 0);
camera.lookAt(0, 0, 0);

// Load the texture
const textureLoader = new TR.TextureLoader();
textureLoader.load('assets/snow.png', (texture) => {
  texture.colorSpace = TR.SRGBColorSpace; // Correct color space

  const material = new TR.MeshBasicMaterial({ map: texture });

  const geometry = new TR.PlaneGeometry(MAP_SIZE, MAP_SIZE);
  const plane = new TR.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
