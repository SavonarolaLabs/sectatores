// MapGenerator.js
export class Tile {
  constructor(x, y, terrainType, object = null) {
    this.x = x;
    this.y = y;
    this.terrainType = terrainType; // 'grass', 'water', 'mountain', etc.
    this.object = object; // 'tree', 'building', etc.
  }
}

export class Map {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = [];

    // Initialize tiles
    for (let x = 0; x < width; x++) {
      this.tiles[x] = [];
      for (let y = 0; y < height; y++) {
        // Initialize all tiles to 'grass'
        this.tiles[x][y] = new Tile(x, y, 'grass');
      }
    }
  }

  setTerrain(x, y, terrainType) {
    if (this.isValidTile(x, y)) {
      this.tiles[x][y].terrainType = terrainType;
    }
  }

  placeObject(x, y, objectType) {
    if (this.isValidTile(x, y)) {
      this.tiles[x][y].object = objectType;
    }
  }

  isValidTile(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}
