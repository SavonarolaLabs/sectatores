// spells.js

// Effect Creation Functions
export function createSpriteEffect(options, textureLoader, scene, camera, TR, MAP_SIZE, backgroundMaterial) {
  const { texturePath, columns, rows, totalFrames, planeSize, targetModel, dynamicSize = false } = options;

  let plane, texture;
  let currentFrame = 0;
  let lastFrameTime = 0;
  const frameChangeInterval = 50; // Milliseconds per frame

  textureLoader.load(texturePath, (loadedTexture) => {
    texture = loadedTexture;
    texture.encoding = TR.sRGBEncoding;
    texture.wrapS = TR.ClampToEdgeWrapping;
    texture.wrapT = TR.ClampToEdgeWrapping;
    texture.minFilter = TR.NearestFilter;
    texture.magFilter = TR.NearestFilter;
    texture.generateMipmaps = false;

    const frameWidth = 1 / columns;
    const frameHeight = 1 / rows;

    texture.repeat.set(frameWidth, frameHeight);

    const material = new TR.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: TR.DoubleSide,
      depthTest: true, // Enable depth testing for proper rendering
    });

    plane = new TR.Mesh(new TR.PlaneGeometry(planeSize.width, planeSize.height), material);
    plane.visible = false;
    plane.position.copy(targetModel.position);
    scene.add(plane);
  });

  return {
    start: () => {
      if (plane) {
        plane.visible = true;
        currentFrame = 0;
        lastFrameTime = Date.now();
      }
    },
    update: () => {
      if (plane && plane.visible) {
        const currentTime = Date.now();
        if (currentTime - lastFrameTime >= frameChangeInterval) {
          lastFrameTime = currentTime;

          const col = currentFrame % columns;
          const row = Math.floor(currentFrame / columns) % rows;

          const epsilonX = 0.0005;
          const epsilonY = 0.0005;

          texture.offset.x = col * (1 / columns) + epsilonX;
          texture.offset.y = 1 - (row + 1) * (1 / rows) + epsilonY;
          texture.repeat.set(1 / columns - 2 * epsilonX, 1 / rows - 2 * epsilonY);

          currentFrame++;
          if (currentFrame >= totalFrames) {
            plane.visible = false;
            currentFrame = 0;

            if (backgroundMaterial) {
              backgroundMaterial.color.setRGB(1, 1, 1);
            }
          }
        }

        // Update plane position to match the target model
        plane.position.copy(targetModel.position);

        // Make the plane face the camera
        plane.lookAt(camera.position);
      }
    },
  };
}
