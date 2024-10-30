import * as TR from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAP_SIZE = 48;

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
const frameChangeInterval = 50; // Frame duration in ms (adjusted to 50ms)

textureLoader.load('assets/lightning.png', (texture) => {
  lightningTexture = texture;
  lightningTexture.encoding = TR.sRGBEncoding;
  lightningTexture.wrapS = TR.ClampToEdgeWrapping;
  lightningTexture.wrapT = TR.ClampToEdgeWrapping;
  lightningTexture.minFilter = TR.NearestFilter;
  lightningTexture.magFilter = TR.NearestFilter;
  lightningTexture.generateMipmaps = false;

  const columns = 6;
  const rows = 5;
  const frameWidth = 1 / columns;
  const frameHeight = 1 / rows;

  lightningTexture.repeat.set(frameWidth, frameHeight);

  const lightningMaterial = new TR.MeshBasicMaterial({
    map: lightningTexture,
    transparent: true,
    side: TR.DoubleSide,
    depthTest: false, // Ensures it's rendered in front
  });
  lightningPlane = new TR.Mesh(new TR.PlaneGeometry(30, 30), lightningMaterial);
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
      const columns = 6;
      const rows = 5;
      const frameWidth = 1 / columns;
      const frameHeight = 1 / rows;

      const col = currentFrame % columns;
      const row = Math.floor(currentFrame / columns) % rows;

      // Adjustments to prevent artifacts
      const epsilonX = 0.0005;
      const epsilonY = 0.0005;

      lightningTexture.offset.x = col * frameWidth + epsilonX;
      lightningTexture.offset.y = 1 - (row + 1) * frameHeight + epsilonY;
      lightningTexture.repeat.set(frameWidth - 2 * epsilonX, frameHeight - 2 * epsilonY);

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

function updateLightningPlane() {
  const d = MAP_SIZE * 2;
  aspect = window.innerWidth / window.innerHeight;

  // Calculate one pixel in world units
  const deltaY = (2 * d) / window.innerHeight;

  // Positioning the top of the lightning 1 pixel above the top edge
  const yTop = 83;
  const planeHeight = (2 / 3) * (2 * d); // Span from top to 2/3 down
  const yBottom = yTop - planeHeight;

  // Adjust plane width based on the texture's aspect ratio
  const columns = 6;
  const rows = 5;
  const textureAspect = lightningTexture.image.width / columns / (lightningTexture.image.height / rows);
  const planeWidth = planeHeight * textureAspect;

  // Position the lightning in the center or more to the right
  const xPos = 140; // Adjust this value to move more to the right

  // Calculate the position to align the top edge of the plane with yTop
  const yPosition = yTop - planeHeight / 2;

  // Update plane geometry and position
  if (lightningPlane) {
    lightningPlane.geometry.dispose();
    lightningPlane.geometry = new TR.PlaneGeometry(planeWidth, planeHeight);
    lightningPlane.position.set(xPos, yPosition, 0);
    lightningPlane.quaternion.copy(camera.quaternion);
  }
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -d * aspect;
  camera.right = d * aspect;
  camera.updateProjectionMatrix();

  updateLightningPlane(); // Update lightning plane on resize
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'q' && attackAction && idleAction) {
    idleAction.fadeOut(0.1);
    attackAction.reset().fadeIn(0.1).play();

    attackAction.loop = TR.LoopOnce;
    attackAction.clampWhenFinished = true;

    const firstSound = new Audio('assets/lightning-eyes.mp3');
    const secondSound = new Audio('assets/electric-shock-sound-effect.mp3');

    firstSound.currentTime = 0.8;
    firstSound.play();

    setTimeout(() => {
      const fadeDuration = 300; // Duration of fade-out in milliseconds
      const fadeSteps = 10; // Number of steps for smooth fade-out
      const fadeInterval = fadeDuration / fadeSteps;

      let volumeStep = firstSound.volume / fadeSteps;

      const fadeOut = setInterval(() => {
        firstSound.volume = Math.max(0, firstSound.volume - volumeStep);
        if (firstSound.volume === 0) {
          clearInterval(fadeOut);
          firstSound.pause();
          firstSound.currentTime = 0; // Reset to beginning if needed
          firstSound.volume = 1; // Reset volume for next playback
        }
      }, fadeInterval);
    }, 1500); // Start fade-out after 2 seconds

    setTimeout(() => {
      secondSound.play();
    }, 300);

    mixer.addEventListener('finished', function restoreIdle(e) {
      if (e.action === attackAction) {
        mixer.removeEventListener('finished', restoreIdle);
        attackAction.stop();
        idleAction.reset().fadeIn(0.1).play();
      }
    });

    // Darken the background by 90%
    if (backgroundMaterial) {
      backgroundMaterial.color.setRGB(0.1, 0.1, 0.1);
    }
    setTimeout(() => {
      if (lightningPlane && model) {
        lightningPlane.visible = true;
        currentFrame = 0; // Reset animation
        lastFrameTime = Date.now();

        updateLightningPlane(); // Update plane position and size
      }
    }, 1000);
  }
});
