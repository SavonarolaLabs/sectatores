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

let mixer, idleAction, attackAction;

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

const clock = new TR.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.render(scene, camera);
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
  }
});
