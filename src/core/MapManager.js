import { createNoise2D } from "simplex-noise";

export const TERRAIN_TYPES = {
  PLAINS: { id: "PLAINS", color: "#90EE90", symbol: "🌱" },
  FOREST: { id: "FOREST", color: "#228B22", symbol: "🌲" },
  MOUNTAIN: { id: "MOUNTAIN", color: "#808080", symbol: "⛰️" },
  WATER: { id: "WATER", color: "#4169E1", symbol: "💧" },
  DESERT: { id: "DESERT", color: "#F4A460", symbol: "🌵" },
  SNOW: { id: "SNOW", color: "#FFFAFA", symbol: "❄️" },
};

// Simple seeded random number generator (Mulberry32)
function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
      // Check for dimension mismatch
      if (
        this.tiles.length !== this.height ||
        this.tiles[0].length !== this.width
      ) {
        console.log("Map dimensions mismatch, regenerating...");
        this.generateMap();
      }
    } else {
      this.generateMap();
    }
  }

  generateMap(options = {}) {
    const { scale = 0.02, seaLevel = -0.2, moistureOffset = 0 } = options;

    this.tiles = [];

    // Create seeded noise instances
    // We use the seed for elevation, and seed+1 for moisture/other maps
    // to ensure they satisfy the same determinism but look different.
    const rngElevation = mulberry32(this.seed);
    const rngMoisture = mulberry32(this.seed + 1);

    const noise2D_elevation = createNoise2D(rngElevation);
    const noise2D_moisture = createNoise2D(rngMoisture);

    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        // noise2D returns values between -1 and 1
        const elevation = noise2D_elevation(x * scale, y * scale);
        const moisture = noise2D_moisture(x * scale, y * scale);

        row.push(
          this.generateTile(
            x,
            y,
            elevation,
            moisture,
            seaLevel,
            moistureOffset,
          ),
        );
      }
      this.tiles.push(row);
    }
  }

  generateTile(x, y, elevation, moisture, seaLevel, moistureOffset) {
    // Elevation: -1 to 1
    // Moisture: -1 to 1

    // Adjust moisture by offset
    const adjMoisture = moisture + moistureOffset;

    let type = TERRAIN_TYPES.PLAINS;

    // Water level
    if (elevation < seaLevel) {
      type = TERRAIN_TYPES.WATER;
    }
    // High mountains
    else if (elevation > 0.6) {
      if (adjMoisture > 0) {
        type = TERRAIN_TYPES.MOUNTAIN; // Normal mountain
      } else {
        type = TERRAIN_TYPES.MOUNTAIN; // Could be dry peak
      }

      // Extremely high peaks could be snow
      if (elevation > 0.8) {
        type = TERRAIN_TYPES.SNOW;
      }
    }
    // Land (Plains/Forest/Desert)
    else {
      // It's land. Check moisture.
      if (adjMoisture > 0.3) {
        type = TERRAIN_TYPES.FOREST;
      } else if (adjMoisture < -0.4) {
        type = TERRAIN_TYPES.DESERT;
      } else {
        type = TERRAIN_TYPES.PLAINS;
      }
    }

    return {
      x,
      y,
      type: type.id,
      explored: true, // Auto-explore for now
    };
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
