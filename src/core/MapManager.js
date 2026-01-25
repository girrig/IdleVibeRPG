export const TERRAIN_TYPES = {
  PLAINS: { id: "PLAINS", color: "#90EE90", symbol: "🌱" },
  FOREST: { id: "FOREST", color: "#228B22", symbol: "🌲" },
  MOUNTAIN: { id: "MOUNTAIN", color: "#808080", symbol: "⛰️" },
  WATER: { id: "WATER", color: "#4169E1", symbol: "💧" },
};

export class MapManager {
  constructor() {
    this.width = 90;
    this.height = 60;
    this.tiles = []; // 2D array
    this.seed = Date.now();
  }

  initialize(savedData = null) {
    if (savedData && savedData.tiles && savedData.tiles.length > 0) {
      this.tiles = savedData.tiles;
      this.seed = savedData.seed || this.seed;
      // Dimensions might have changed if we loaded an old save (20x20) but expect (60x40).
      // If dimensions mismatch, we should probably regenerate or accept the old map.
      // For now, let's regenerate to enforce the new size if it's too small.
      if (
        this.tiles.length !== this.height ||
        this.tiles[0].length !== this.width
      ) {
        console.log("Map dimensions mismatch (Old save?), regenerating...");
        this.generateMap();
      }
    } else {
      this.generateMap();
    }
  }

  generateMap() {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push(this.generateTile(x, y));
      }
      this.tiles.push(row);
    }

    // Simple smoothing pass
    this.smoothMap();
  }

  generateTile(x, y) {
    // Simple weighted random for now
    const rand = Math.random();
    let type = TERRAIN_TYPES.PLAINS;

    if (rand < 0.1) type = TERRAIN_TYPES.WATER;
    else if (rand < 0.3) type = TERRAIN_TYPES.MOUNTAIN;
    else if (rand < 0.6) type = TERRAIN_TYPES.FOREST;

    return {
      x,
      y,
      type: type.id,
      explored: true, // Auto-explore for now
    };
  }

  smoothMap() {
    // Basic cellular automata rule: become like neighbors
    const newTiles = JSON.parse(JSON.stringify(this.tiles));

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const neighborTypes = {};

        // Count neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const type = this.tiles[y + dy][x + dx].type;
            neighborTypes[type] = (neighborTypes[type] || 0) + 1;
          }
        }

        // If surrounded by a different type, change?
        // Let's just do a simple majority
        let maxCount = 0;
        let dominantType = null;
        for (const [type, count] of Object.entries(neighborTypes)) {
          if (count > maxCount) {
            maxCount = count;
            dominantType = type;
          }
        }

        if (maxCount >= 5) {
          newTiles[y][x].type = dominantType;
        }
      }
    }

    this.tiles = newTiles;
  }

  getMapData() {
    return {
      tiles: this.tiles,
      seed: this.seed,
    };
  }

  getTile(x, y) {
    if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
      return this.tiles[y][x];
    }
    return null;
  }
}

export const mapManager = new MapManager();
