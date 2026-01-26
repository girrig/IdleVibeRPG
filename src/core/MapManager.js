import { createNoise2D } from "simplex-noise";

export const TERRAIN_TYPES = {
  // WATER TYPES
  OCEAN: { id: "OCEAN", color: "#1a4485", symbol: "🌊" }, // Deep water
  WATER: { id: "WATER", color: "#4169E1", symbol: "💧" }, // Shallow/Coast
  BEACH: { id: "BEACH", color: "#deb887", symbol: "🏖️" },

  // HOT BIOMES
  SCORCHED: { id: "SCORCHED", color: "#552200", symbol: "🌋" },
  BARE: { id: "BARE", color: "#a0a0a0", symbol: "🪨" },
  DESERT: { id: "DESERT", color: "#F4A460", symbol: "🌵" },
  SAVANNA: { id: "SAVANNA", color: "#9ca728", symbol: "🦁" },
  TROPICAL_RAINFOREST: {
    id: "TROPICAL_RAINFOREST",
    color: "#006400",
    symbol: "🦜",
  },

  // TEMPERATE BIOMES
  TEMPERATE_DESERT: { id: "TEMPERATE_DESERT", color: "#c2b280", symbol: "🌾" },
  SHRUBLAND: { id: "SHRUBLAND", color: "#808000", symbol: "🌿" },
  GRASSLAND: { id: "GRASSLAND", color: "#90EE90", symbol: "🌱" }, // Formerly PLAINS
  TEMPERATE_DECIDUOUS_FOREST: {
    id: "TEMPERATE_DECIDUOUS_FOREST",
    color: "#228B22",
    symbol: "🌳",
  }, // Formerly FOREST
  TEMPERATE_RAINFOREST: {
    id: "TEMPERATE_RAINFOREST",
    color: "#004400",
    symbol: "🌲",
  },

  // COLD BIOMES
  TUNDRA: { id: "TUNDRA", color: "#b0e0e6", symbol: "🧊" },
  TAIGA: { id: "TAIGA", color: "#5d7663", symbol: "🌲" },
  SNOW: { id: "SNOW", color: "#FFFAFA", symbol: "❄️" },
  MOUNTAIN: { id: "MOUNTAIN", color: "#808080", symbol: "⛰️" },

  // SPECIAL
  SWAMP: { id: "SWAMP", color: "#2f4f4f", symbol: "🐊" },
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
    this.width = 500;
    this.height = 500;
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
    if (options.newSeed) {
      this.seed = Date.now();
    }

    const { scale = 0.02, seaLevel = -0.2, moistureOffset = 0 } = options;

    this.tiles = [];

    // Create seeded noise instances
    // Seed: Elevation
    // Seed+1: Moisture
    // Seed+2: Temperature
    const rngElevation = mulberry32(this.seed);
    const rngMoisture = mulberry32(this.seed + 1);
    const rngTemperature = mulberry32(this.seed + 2);

    const noise2D_elevation = createNoise2D(rngElevation);
    const noise2D_moisture = createNoise2D(rngMoisture);
    const noise2D_temperature = createNoise2D(rngTemperature);

    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        const elevation = noise2D_elevation(x * scale, y * scale);
        const moisture = noise2D_moisture(x * scale, y * scale);
        const temperature = noise2D_temperature(x * scale, y * scale);

        row.push(
          this.generateTile(
            x,
            y,
            elevation,
            moisture,
            temperature,
            seaLevel,
            moistureOffset,
          ),
        );
      }
      this.tiles.push(row);
    }
  }

  generateTile(
    x,
    y,
    elevation,
    moisture,
    temperature,
    seaLevel,
    moistureOffset,
  ) {
    // Inputs are usually -1 to 1.

    // Adjust moisture by offset
    const adjMoisture = moisture + moistureOffset;

    // --- WATER LEVEL ---
    if (elevation < seaLevel - 0.25) {
      return { x, y, type: TERRAIN_TYPES.OCEAN.id, explored: true };
    }
    if (elevation < seaLevel) {
      return { x, y, type: TERRAIN_TYPES.WATER.id, explored: true };
    }
    if (elevation < seaLevel + 0.05) {
      return { x, y, type: TERRAIN_TYPES.BEACH.id, explored: true };
    }

    // --- MOUNTAINS ---
    if (elevation > 0.8) {
      if (temperature < 0)
        return { x, y, type: TERRAIN_TYPES.SNOW.id, explored: true }; // High peaks
      return { x, y, type: TERRAIN_TYPES.MOUNTAIN.id, explored: true };
    }

    // --- LAND BIOMES (Whittaker Diagram) ---
    // We categorize Temp and Moisture into bands

    // Determine Temperature Zone
    // Ranges: Cold < -0.3 < Temperate < 0.3 < Hot
    // (Noise is -1 to 1)

    // Determine Moisture Zone
    // Ranges: Dry < -0.3 < Mid < 0.3 < Wet

    // Normalize logic for readability
    if (temperature < -0.3) {
      // COLD
      if (adjMoisture < -0.3)
        return { x, y, type: TERRAIN_TYPES.SCORCHED.id, explored: true }; // Or dry tundra? Whittaker says Tundra is dry-ish. Let's use Tundra.
      if (adjMoisture < 0.3)
        return { x, y, type: TERRAIN_TYPES.TUNDRA.id, explored: true };
      return { x, y, type: TERRAIN_TYPES.TAIGA.id, explored: true };
    } else if (temperature < 0.3) {
      // TEMPERATE
      if (adjMoisture < -0.4)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_DESERT.id,
          explored: true,
        };
      if (adjMoisture < 0.2)
        return { x, y, type: TERRAIN_TYPES.GRASSLAND.id, explored: true };
      if (adjMoisture < 0.6)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
          explored: true,
        };
      return {
        x,
        y,
        type: TERRAIN_TYPES.TEMPERATE_RAINFOREST.id,
        explored: true,
      }; // Or Swamp?
    } else {
      // HOT
      if (adjMoisture < -0.3)
        return { x, y, type: TERRAIN_TYPES.DESERT.id, explored: true }; // Subtropical Desert
      if (adjMoisture < 0.2)
        return { x, y, type: TERRAIN_TYPES.SAVANNA.id, explored: true };
      return {
        x,
        y,
        type: TERRAIN_TYPES.TROPICAL_RAINFOREST.id,
        explored: true,
      };
    }
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
