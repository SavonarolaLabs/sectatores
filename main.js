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

let mixer, idleAction, attackAction, mixerCobold, coboldIdleAction, hitAction;
let model, model2;
const gltfLoader = new GLTFLoader();

// Load the hero model (Fulmen)
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
    console.error('Error loading hero model:', error);
  }
);

// Load the kobold (goblin) model
gltfLoader.load(
  'assets/kobold/6be5470731a44b14af4cbd44aeaace23_Textured.gltf',
  (gltf) => {
    model2 = gltf.scene;
    model2.position.set(145, -55, 0);
    model2.scale.set(10, 10, 10);
    model2.rotation.y = -Math.PI * 0.8;

    model2.traverse((node) => {
      if (node.isMesh) {
        node.material = new TR.MeshBasicMaterial({ map: node.material.map });
        node.userData.originalMaterial = node.material.clone(); // Save original material
      }
    });

    scene.add(model2);

    mixerCobold = new TR.AnimationMixer(model2);

    const idleClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('idle'));
    coboldIdleAction = mixerCobold.clipAction(idleClip);
    coboldIdleAction.play();

    const hitClip = gltf.animations.find((clip) => clip.name.toLowerCase().includes('deth'));
    hitAction = mixerCobold.clipAction(hitClip);
    hitAction.loop = TR.LoopOnce;
    hitAction.clampWhenFinished = true;
  },
  undefined,
  (error) => {
    console.error('Error loading kobold model:', error);
  }
);

// Spell class definition
class Spell {
  constructor(options) {
    this.name = options.name;
    this.key = options.key;
    this.animationData = options.animationData;
    this.soundData = options.soundData;
    this.effectData = options.effectData;
    this.onCast = options.onCast;
  }

  cast() {
    if (this.onCast) {
      this.onCast();
    }
  }

  update(deltaTime) {
    if (this.effectData && this.effectData.update) {
      this.effectData.update(deltaTime);
    }
  }
}

// Spells collection
const spells = [];

// Helper functions
function flashModelWhite(model, duration) {
  const flashMaterial = new TR.MeshBasicMaterial({ color: 0xffffff });
  const originalMaterials = [];

  model.traverse((node) => {
    if (node.isMesh) {
      originalMaterials.push({ mesh: node, material: node.material });
      node.material = flashMaterial;
    }
  });

  setTimeout(() => {
    // Restore original materials
    originalMaterials.forEach(({ mesh, material }) => {
      mesh.material = material;
    });
  }, duration);
}

const clock = new TR.Clock();

// Spell Manager
class SpellManager {
  constructor() {
    this.spells = [];
  }

  addSpell(spell) {
    this.spells.push(spell);
  }

  update(deltaTime) {
    this.spells.forEach((spell) => spell.update(deltaTime));
  }

  castSpellByKey(key) {
    const spell = this.spells.find((s) => s.key === key);
    if (spell) {
      spell.cast();
    }
  }
}

const spellManager = new SpellManager();

// Create Lightning Spell
function createLightningSpell() {
  let lightningPlane, lightningTexture;
  let currentFrame = 0;
  let lastFrameTime = 0;
  const totalFrames = 30;
  const frameChangeInterval = 50; // Milliseconds per frame

  const columns = 6;
  const rows = 5;
  const frameWidth = 1 / columns;
  const frameHeight = 1 / rows;

  // Load Texture
  textureLoader.load('assets/lightning.png', (texture) => {
    lightningTexture = texture;
    lightningTexture.encoding = TR.sRGBEncoding;
    lightningTexture.wrapS = TR.ClampToEdgeWrapping;
    lightningTexture.wrapT = TR.ClampToEdgeWrapping;
    lightningTexture.minFilter = TR.NearestFilter;
    lightningTexture.magFilter = TR.NearestFilter;
    lightningTexture.generateMipmaps = false;

    lightningTexture.repeat.set(frameWidth, frameHeight);

    const lightningMaterial = new TR.MeshBasicMaterial({
      map: lightningTexture,
      transparent: true,
      side: TR.DoubleSide,
      depthTest: false,
    });

    lightningPlane = new TR.Mesh(new TR.PlaneGeometry(30, 30), lightningMaterial);
    lightningPlane.visible = false;
    lightningPlane.renderOrder = 999;

    scene.add(lightningPlane);
    updateLightningPlane();
  });

  function updateLightningPlane() {
    if (!lightningTexture || !lightningTexture.image) return;

    const d = MAP_SIZE * 2;
    aspect = window.innerWidth / window.innerHeight;

    const yTop = 83;
    const planeHeight = (2 / 3) * (2 * d);

    const textureAspect = lightningTexture.image.width / columns / (lightningTexture.image.height / rows);
    const planeWidth = planeHeight * textureAspect;

    const xPos = 140;
    const yPosition = yTop - planeHeight / 2;

    lightningPlane.geometry.dispose();
    lightningPlane.geometry = new TR.PlaneGeometry(planeWidth, planeHeight);
    lightningPlane.position.set(xPos, yPosition, 0);
    lightningPlane.quaternion.copy(camera.quaternion);
  }

  window.addEventListener('resize', () => {
    updateLightningPlane();
  });

  const spell = new Spell({
    name: 'Lightning Strike',
    key: 'q',
    onCast: () => {
      if (attackAction && idleAction) {
        setTimeout(() => {
          // Start the kobold's 'deth' animation after the lightning finishes
          if (hitAction && coboldIdleAction) {
            flashModelWhite(model2, 500); // Flash duration in milliseconds
            coboldIdleAction.fadeOut(0.1);
            hitAction.reset().fadeIn(0.1).play();
          }
        }, 1300);

        idleAction.fadeOut(0.1);
        attackAction.reset().fadeIn(0.1).play();

        attackAction.loop = TR.LoopOnce;
        attackAction.clampWhenFinished = true;

        const firstSound = new Audio('assets/lightning-eyes.mp3');
        const secondSound = new Audio('assets/electric-shock-sound-effect.mp3');

        firstSound.currentTime = 1;
        firstSound.play();

        setTimeout(() => {
          const fadeDuration = 300;
          const fadeSteps = 10;
          const fadeInterval = fadeDuration / fadeSteps;

          let volumeStep = firstSound.volume / fadeSteps;

          const fadeOut = setInterval(() => {
            firstSound.volume = Math.max(0, firstSound.volume - volumeStep);
            if (firstSound.volume === 0) {
              clearInterval(fadeOut);
              firstSound.pause();
              firstSound.currentTime = 0;
              firstSound.volume = 1;
            }
          }, fadeInterval);
        }, 1500);

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

        if (backgroundMaterial) {
          backgroundMaterial.color.setRGB(0.1, 0.1, 0.1);
        }
        setTimeout(() => {
          if (lightningPlane && model) {
            lightningPlane.visible = true;
            currentFrame = 0;
            lastFrameTime = Date.now();

            updateLightningPlane();
          }
        }, 1000);
      }
    },
    effectData: {
      update: (deltaTime) => {
        if (lightningPlane && lightningPlane.visible) {
          const currentTime = Date.now();
          if (currentTime - lastFrameTime >= frameChangeInterval) {
            lastFrameTime = currentTime;

            const col = currentFrame % columns;
            const row = Math.floor(currentFrame / columns) % rows;

            const epsilonX = 0.0005;
            const epsilonY = 0.0005;

            lightningTexture.offset.x = col * frameWidth + epsilonX;
            lightningTexture.offset.y = 1 - (row + 1) * frameHeight + epsilonY;
            lightningTexture.repeat.set(frameWidth - 2 * epsilonX, frameHeight - 2 * epsilonY);

            currentFrame++;
            if (currentFrame >= totalFrames) {
              lightningPlane.visible = false;
              currentFrame = 0;

              if (backgroundMaterial) {
                backgroundMaterial.color.setRGB(1, 1, 1);
              }
            }
          }
        }
      },
    },
  });

  spellManager.addSpell(spell);
}

createLightningSpell();

// Create Electric Shock Spell
function createElectricShockSpell() {
  const smallLightning = {
    sprite: 'assets/LightningFreePack/512/Lightning_2_512-sheet.png',
    w: 4,
    h: 4,
    totalFrames: 4 * 4,
    currentFrame: 0,
    lastFrameTime: 0,
    texture: undefined, // TR.Texture
    plane: undefined,
  };

  textureLoader.load(smallLightning.sprite, (texture) => {
    smallLightning.texture = texture;
    smallLightning.texture.encoding = TR.sRGBEncoding;
    smallLightning.texture.wrapS = TR.ClampToEdgeWrapping;
    smallLightning.texture.wrapT = TR.ClampToEdgeWrapping;
    smallLightning.texture.minFilter = TR.NearestFilter;
    smallLightning.texture.magFilter = TR.NearestFilter;
    smallLightning.texture.generateMipmaps = false;

    smallLightning.texture.repeat.set(1 / smallLightning.w, 1 / smallLightning.h);
    const lightningMaterial = new TR.MeshBasicMaterial({
      map: smallLightning.texture,
      transparent: true,
      side: TR.DoubleSide,
      depthTest: false,
    });

    smallLightning.plane = new TR.Mesh(new TR.PlaneGeometry(30, 30), lightningMaterial);
    smallLightning.plane.visible = false;
    smallLightning.plane.renderOrder = 999;

    scene.add(smallLightning.plane);
    updateSmallLightningPlane();
  });

  function updateSmallLightningPlane() {
    if (!smallLightning.texture || !smallLightning.texture.image) {
      return;
    }

    const planeHeight = 210; // Adjust as needed
    const planeWidth = 210; // Adjust as needed

    const xPos = 145; // Position matching the kobold
    const yPosition = 15; // Position matching the kobold

    smallLightning.plane.geometry.dispose();
    smallLightning.plane.geometry = new TR.PlaneGeometry(planeWidth, planeHeight);
    smallLightning.plane.position.set(xPos, yPosition, 0);
    smallLightning.plane.quaternion.copy(camera.quaternion);
  }

  window.addEventListener('resize', () => {
    updateSmallLightningPlane();
  });

  const frameChangeInterval = 50; // Milliseconds per frame

  const spell = new Spell({
    name: 'Electric Shock',
    key: 'w',
    onCast: () => {
      smallLightning.plane.visible = true;
      smallLightning.currentFrame = 0; // Reset animation frame
      smallLightning.lastFrameTime = Date.now();
      updateSmallLightningPlane();
      setTimeout(() => {
        flashModelWhite(model2, 200);
      }, 100);
      setTimeout(() => {
        flashModelWhite(model2, 200);
      }, 400);

      const firstSound = new Audio('assets/lightning-sound-short.mp3');
      firstSound.volume = 0.6;
      firstSound.currentTime = 0.5;

      firstSound.play();
      setTimeout(() => {
        firstSound.pause();
      }, 900);
    },
    effectData: {
      update: (deltaTime) => {
        if (smallLightning.plane && smallLightning.plane.visible) {
          const currentTime = Date.now();
          if (currentTime - smallLightning.lastFrameTime >= frameChangeInterval) {
            smallLightning.lastFrameTime = currentTime;
            const frameWidth = 1 / smallLightning.w;
            const frameHeight = 1 / smallLightning.h;

            const col = smallLightning.currentFrame % smallLightning.w;
            const row = Math.floor(smallLightning.currentFrame / smallLightning.w) % smallLightning.h;

            const epsilonX = 0.0005;
            const epsilonY = 0.0005;

            smallLightning.texture.offset.x = col * frameWidth + epsilonX;
            smallLightning.texture.offset.y = 1 - (row + 1) * frameHeight + epsilonY;
            smallLightning.texture.repeat.set(frameWidth - 2 * epsilonX, frameHeight - 2 * epsilonY);

            smallLightning.currentFrame++;
            if (smallLightning.currentFrame >= smallLightning.totalFrames) {
              smallLightning.plane.visible = false;
              smallLightning.currentFrame = 0;
            }
          }
        }
      },
    },
  });

  spellManager.addSpell(spell);
}

createElectricShockSpell();

// Create Aura Spell (Example of a continuous effect)
function createAuraSpell() {
  const auraTextures = [];
  const auraFrames = 32;
  let currentAuraFrame = 0;
  const auraFrameInterval = 50; // Milliseconds per frame
  let lastAuraFrameTime = 0;

  // Load each aura frame into the array
  for (let i = 1; i <= auraFrames; i++) {
    const texture = textureLoader.load(`assets/energyBall/aura_test_1_32_${i}.png`);
    texture.encoding = TR.sRGBEncoding;
    auraTextures.push(texture);
  }

  // Create a sprite to display the aura animation
  const auraMaterial = new TR.SpriteMaterial({
    map: auraTextures[0],
    transparent: true,
  });
  const auraSprite = new TR.Sprite(auraMaterial);
  auraSprite.scale.set(40, 40, 1); // Adjust the size of the aura around the character
  auraSprite.position.set(0, 10, 0); // Position it around the character
  auraSprite.visible = false; // Start as invisible
  scene.add(auraSprite);

  const spell = new Spell({
    name: 'Aura',
    key: 'e',
    onCast: () => {
      auraSprite.visible = !auraSprite.visible; // Toggle aura visibility
    },
    effectData: {
      update: (deltaTime) => {
        if (auraSprite.visible) {
          const currentAuraTime = Date.now();
          if (currentAuraTime - lastAuraFrameTime >= auraFrameInterval) {
            lastAuraFrameTime = currentAuraTime;
            currentAuraFrame = (currentAuraFrame + 1) % auraFrames;
            auraMaterial.map = auraTextures[currentAuraFrame];
          }
        }
      },
    },
  });

  spellManager.addSpell(spell);
}

createAuraSpell();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (mixerCobold) mixerCobold.update(delta);

  // Update spells
  spellManager.update(delta);

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.render(scene, camera);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'r' && mixerCobold && coboldIdleAction) {
    // Resurrect the goblin and play idle animation
    hitAction.reset().play();
    coboldIdleAction.reset().play();

    // Reset the goblin's material to original
    model2.traverse((node) => {
      if (node.isMesh && node.userData.originalMaterial) {
        node.material.copy(node.userData.originalMaterial);
      }
    });
  }

  // Cast the spell associated with the pressed key
  spellManager.castSpellByKey(event.key);
});
