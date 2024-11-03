// Effect Creation Functions
export function createSpriteEffect(options, textureLoader, scene, camera, TR, MAP_SIZE, backgroundMaterial) {
  const { texturePath, columns, rows, totalFrames, planeSize, position, dynamicSize = false } = options;

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
      depthTest: false,
    });

    plane = new TR.Mesh(new TR.PlaneGeometry(planeSize.width, planeSize.height), material);
    plane.visible = false;
    plane.renderOrder = 999;
    plane.position.set(position.x, position.y, position.z);
    plane.quaternion.copy(camera.quaternion);

    scene.add(plane);

    if (dynamicSize) {
      updatePlaneSizeAndPosition();
      window.addEventListener('resize', () => {
        updatePlaneSizeAndPosition();
      });
    } else {
      window.addEventListener('resize', () => {
        plane.quaternion.copy(camera.quaternion);
      });
    }
  });

  function updatePlaneSizeAndPosition() {
    if (!texture || !texture.image) return;

    const d = MAP_SIZE * 2;

    const yTop = 83;
    const planeHeight = (2 / 3) * (2 * d);

    const textureAspect = texture.image.width / columns / (texture.image.height / rows);
    const planeWidth = planeHeight * textureAspect;

    const xPos = position.x;
    const yPosition = yTop - planeHeight / 2;

    plane.geometry.dispose();
    plane.geometry = new TR.PlaneGeometry(planeWidth, planeHeight);
    plane.position.set(xPos, yPosition, 0);
    plane.quaternion.copy(camera.quaternion);
  }

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
      }
    },
  };
}
