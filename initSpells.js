import { createSpriteEffect } from './spells';

let textureLoader;
let scene;
let camera;
let TR;
let MAP_SIZE;
let backgroundMaterial;
let actions;
let mixers;
let models;

// Initialize Spells
export function initializeSpells(textureLoaderParam, sceneParam, cameraParam, TRParam, MAP_SIZEParam, backgroundMaterialParam, actionsParam, mixersParam, modelsParam) {
  textureLoader = textureLoaderParam;
  scene = sceneParam;
  camera = cameraParam;
  TR = TRParam;
  MAP_SIZE = MAP_SIZEParam;
  backgroundMaterial = backgroundMaterialParam;
  actions = actionsParam;
  mixers = mixersParam;
  models = modelsParam;
  // Lightning Spell ('Q' key)
  const lightningSpell = createLightningSpell();
  spellManager.addSpell(lightningSpell);

  // Electric Shock Spell ('W' key)
  const electricShockSpell = createElectricShockSpell();
  spellManager.addSpell(electricShockSpell);

  // Aura Spell ('E' key)
  const auraSpell = createAuraSpell();
  spellManager.addSpell(auraSpell);

  // New Lightning Spell ('A' key)
  const smallLightningSpell = createSmallLightningSpell();
  spellManager.addSpell(smallLightningSpell);

  const testLightningSpell = createTestLightningSpell();
  spellManager.addSpell(testLightningSpell);

  // Additional spells can be initialized here
}

// Spell Creation Functions
function createLightningSpell() {
  const effect = createSpriteEffect(
    {
      texturePath: 'assets/lightning.png',
      columns: 6,
      rows: 5,
      totalFrames: 30,
      planeSize: { width: 0, height: 0 }, // Will be calculated dynamically
      position: { x: 140, y: 0, z: 0 }, // 'y' will be calculated
      dynamicSize: true,
    },
    textureLoader,
    scene,
    camera,
    TR,
    MAP_SIZE,
    backgroundMaterial
  );

  const spell = new Spell({
    name: 'Lightning Strike',
    key: 'r',
    onCast: () => {
      const heroActions = actions.hero;
      const koboldActions = actions.kobold;

      if (heroActions.attack && heroActions.idle) {
        heroActions.idle.fadeOut(0.1);
        heroActions.attack.reset().fadeIn(0.1).play();

        mixers.hero.addEventListener('finished', function restoreIdle(e) {
          if (e.action === heroActions.attack) {
            mixers.hero.removeEventListener('finished', restoreIdle);
            heroActions.attack.stop();
            heroActions.idle.reset().fadeIn(0.1).play();
          }
        });
      }

      setTimeout(() => {
        if (koboldActions.death && koboldActions.idle) {
          flashModelWhite('kobold', 500);
          koboldActions.idle.fadeOut(0.1);
          koboldActions.death.reset().fadeIn(0.1).play();
        }
      }, 1300);

      // Play sounds and update background
      playSoundSequence([
        { src: 'assets/lightning-eyes.mp3', delay: 0, duration: 1500 },
        { src: 'assets/electric-shock-sound-effect.mp3', delay: 300 },
      ]);

      if (backgroundMaterial) {
        backgroundMaterial.color.setRGB(0.1, 0.1, 0.1);
      }

      setTimeout(() => {
        effect.start();
      }, 1000);
    },
    effect: effect,
  });

  return spell;
}

function createElectricShockSpell() {
  const effect = createSpriteEffect(
    {
      texturePath: 'assets/LightningFreePack/512/Lightning_2_512-sheet.png',
      columns: 4,
      rows: 4,
      totalFrames: 16,
      planeSize: { width: 210, height: 210 },
      position: { x: 145, y: 15, z: 0 },
    },
    textureLoader,
    scene,
    camera,
    TR,
    MAP_SIZE,
    backgroundMaterial
  );

  const spell = new Spell({
    name: 'Electric Shock',
    key: 'w',
    onCast: () => {
      effect.start();

      setTimeout(() => {
        flashModelWhite('kobold', 200);
      }, 100);
      setTimeout(() => {
        flashModelWhite('kobold', 200);
      }, 400);

      playSound('assets/lightning-sound-short.mp3', { volume: 0.6, currentTime: 0.5, duration: 900 });
    },
    effect: effect,
  });

  return spell;
}

function createAuraSpell() {
  const effect = createFrameByFrameEffect({
    texturePaths: Array.from({ length: 32 }, (_, i) => `assets/energyBall/aura_test_1_32_${i + 1}.png`),
    frameInterval: 50,
    spriteOptions: {
      scale: { x: 40, y: 40 },
      position: { x: 0, y: 10, z: 0 },
    },
  });

  const spell = new Spell({
    name: 'Aura',
    key: 'd',
    onCast: () => {
      effect.toggle();
    },
    effect: effect,
  });

  return spell;
}

function createSmallLightningSpell() {
  const effect = createSpriteEffect(
    {
      texturePath: 'assets/LightningFreePack/512/Lightning_1_512-sheet.png',
      columns: 3,
      rows: 3,
      totalFrames: 9,
      planeSize: { width: 80, height: 80 },
      position: { x: 145, y: -20, z: 0 },
    },
    textureLoader,
    scene,
    camera,
    TR,
    MAP_SIZE,
    backgroundMaterial
  );

  const spell = new Spell({
    name: 'Lightning Bolt',
    key: 'q',
    onCast: () => {
      effect.start();

      setTimeout(() => {
        flashModelWhite('kobold', 300);
      }, 200);

      playSound('assets/lightning-sound-short.mp3', { volume: 0.6, currentTime: 0.5, duration: 900 });
    },
    effect: effect,
  });

  return spell;
}

function createTestLightningSpell() {
  const effect = createSpriteEffect(
    {
      texturePath: 'assets/LightningFreePack/512/Lightning_4_512-sheet.png',
      columns: 3,
      rows: 3,
      totalFrames: 9,
      planeSize: { width: 80, height: 80 },
      position: { x: 145, y: -20, z: 0 },
    },
    textureLoader,
    scene,
    camera,
    TR,
    MAP_SIZE,
    backgroundMaterial
  );

  const spell = new Spell({
    name: 'Lightning Bolt',
    key: 'e',
    onCast: () => {
      effect.start();

      setTimeout(() => {
        flashModelWhite('kobold', 300);
      }, 200);

      playSound('assets/lightning-sound-short.mp3', { volume: 0.6, currentTime: 0.5, duration: 900 });
    },
    effect: effect,
  });

  return spell;
}

function createFrameByFrameEffect(options) {
  const { texturePaths, frameInterval, spriteOptions } = options;

  const textures = texturePaths.map((path) => {
    const texture = textureLoader.load(path);
    texture.encoding = TR.sRGBEncoding;
    return texture;
  });

  let currentFrame = 0;
  let lastFrameTime = 0;
  const totalFrames = textures.length;
  let isActive = false;

  const material = new TR.SpriteMaterial({
    map: textures[0],
    transparent: true,
  });

  const sprite = new TR.Sprite(material);
  sprite.scale.set(spriteOptions.scale.x, spriteOptions.scale.y, 1);
  sprite.position.set(spriteOptions.position.x, spriteOptions.position.y, spriteOptions.position.z);
  sprite.visible = false;
  scene.add(sprite);

  return {
    toggle: () => {
      isActive = !isActive;
      sprite.visible = isActive;
    },
    update: () => {
      if (isActive) {
        const currentTime = Date.now();
        if (currentTime - lastFrameTime >= frameInterval) {
          lastFrameTime = currentTime;
          currentFrame = (currentFrame + 1) % totalFrames;
          material.map = textures[currentFrame];
        }
      }
    },
  };
}

// Utility Functions

// Helper Functions
function flashModelWhite(modelName, duration) {
  const model = models[modelName];
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

function playSound(src, options = {}) {
  const audio = new Audio(src);
  if (options.volume !== undefined) audio.volume = options.volume;
  if (options.currentTime !== undefined) audio.currentTime = options.currentTime;
  audio.play();
  if (options.duration !== undefined) {
    setTimeout(() => {
      audio.pause();
    }, options.duration);
  }
}

function playSoundSequence(sounds) {
  sounds.forEach(({ src, delay = 0, duration }) => {
    setTimeout(() => {
      playSound(src, { duration });
    }, delay);
  });
}

// Spell Class
class Spell {
  constructor(options) {
    this.name = options.name;
    this.key = options.key;
    this.onCast = options.onCast;
    this.effect = options.effect || null;
  }

  cast() {
    if (this.onCast) {
      this.onCast();
    }
  }

  update(deltaTime) {
    if (this.effect && this.effect.update) {
      this.effect.update(deltaTime);
    }
  }
}

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

export const spellManager = new SpellManager();
