import { createNoise2D } from "simplex-noise";

export const TERRAIN_TYPES = {
  // WATER TYPES
  OCEAN: { id: "OCEAN", color: "#1a4485", symbol: "🌊" }, // Deep water
  SHALLOW_OCEAN: { id: "SHALLOW_OCEAN", color: "#4169E1", symbol: "🐟" }, // Formerly WATER
  BEACH: { id: "BEACH", color: "#deb887", symbol: "🏖️" },

  // COLD BIOMES
  POLAR_DESERT: { id: "POLAR_DESERT", color: "#552200", symbol: "🌨️" }, // Formerly SCORCHED
  ICE_SHEET: { id: "ICE_SHEET", color: "#FFFAFA", symbol: "❄️" }, // Formerly SNOW
  ALPINE_TUNDRA: { id: "ALPINE_TUNDRA", color: "#a0a0a0", symbol: "🪨" }, // Formerly BARE
  TUNDRA: { id: "TUNDRA", color: "#b0e0e6", symbol: "🧊" },
  BOREAL_FOREST: { id: "BOREAL_FOREST", color: "#5d7663", symbol: "🌲" }, // Formerly TAIGA
  ALPINE: { id: "ALPINE", color: "#808080", symbol: "⛰️" }, // Formerly MOUNTAIN

  // TEMPERATE BIOMES
  TEMPERATE_DESERT: { id: "TEMPERATE_DESERT", color: "#c2b280", symbol: "🦎" },
  SHRUBLAND: { id: "SHRUBLAND", color: "#808000", symbol: "🌿" },
  TEMPERATE_GRASSLAND: {
    id: "TEMPERATE_GRASSLAND",
    color: "#90EE90",
    symbol: "🌾",
  }, // Formerly GRASSLAND
  TEMPERATE_DECIDUOUS_FOREST: {
    id: "TEMPERATE_DECIDUOUS_FOREST",
    color: "#228B22",
    symbol: "🌳",
  },
  TEMPERATE_RAINFOREST: {
    id: "TEMPERATE_RAINFOREST",
    color: "#004400",
    symbol: "🐻",
  },

  // HOT BIOMES
  SUBTROPICAL_DESERT: {
    id: "SUBTROPICAL_DESERT",
    color: "#F4A460",
    symbol: "🌵",
  }, // Formerly DESERT
  TROPICAL_SAVANNA: { id: "TROPICAL_SAVANNA", color: "#9ca728", symbol: "🦁" }, // Formerly SAVANNA
  TROPICAL_RAINFOREST: {
    id: "TROPICAL_RAINFOREST",
    color: "#006400",
    symbol: "🦜",
  },

  // SPECIAL
  // SPECIAL
  HOME: { id: "HOME", color: "#FFD700", symbol: "🏠" },
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

    // Post-processing: Remove small biomes
    this.cleanupBiomes(options.minBiomeSize || 50, [TERRAIN_TYPES.BEACH.id]);

    // Check for Safe Start (Center)
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);

    // Safety check for infinite recursion
    if (!options.retryCount) options.retryCount = 0;

    if (this.tiles[centerY] && this.tiles[centerY][centerX]) {
      const centerType = this.tiles[centerY][centerX].type;
      const waterTypes = [
        TERRAIN_TYPES.OCEAN.id,
        TERRAIN_TYPES.SHALLOW_OCEAN.id,
      ];

      if (waterTypes.includes(centerType)) {
        if (options.retryCount < 50) {
          console.log("Starting in water, regenerating map...");
          this.generateMap({
            ...options,
            newSeed: true,
            retryCount: options.retryCount + 1,
          });
          return;
        } else {
          console.warn(
            "Could not find safe start after 50 attempts. Forcing land.",
          );
          this.tiles[centerY][centerX].type = TERRAIN_TYPES.BEACH.id; // Emergency land
        }
      }

      // Mark Home as Explored and set Type
      this.tiles[centerY][centerX].explored = true;
      this.tiles[centerY][centerX].type = TERRAIN_TYPES.HOME.id;

      // Mark neighbors explored
      const neighbors = [
        { x: centerX + 1, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX, y: centerY + 1 },
        { x: centerX, y: centerY - 1 },
        { x: centerX + 1, y: centerY + 1 },
        { x: centerX - 1, y: centerY - 1 },
        { x: centerX + 1, y: centerY - 1 },
        { x: centerX - 1, y: centerY + 1 },
      ];

      neighbors.forEach((n) => {
        if (this.tiles[n.y] && this.tiles[n.y][n.x]) {
          this.tiles[n.y][n.x].explored = true;
        }
      });
    }
  }

  // Identifies connected regions of same type.
  // If a region is smaller than minSize and NOT in preservedTypes,
  // it converts it to the most frequent neighbor type.
  cleanupBiomes(minSize, preservedTypes = []) {
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;

      const visited = new Set();
      const regions = [];

      // 1. Identify all regions
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const key = `${x},${y}`;
          if (visited.has(key)) continue;

          const type = this.tiles[y][x].type;
          const region = { type, tiles: [] };
          const queue = [{ x, y }];
          visited.add(key);
          region.tiles.push({ x, y });

          let head = 0;
          while (head < queue.length) {
            const curr = queue[head++];
            const neighbors = [
              { x: curr.x + 1, y: curr.y },
              { x: curr.x - 1, y: curr.y },
              { x: curr.x, y: curr.y + 1 },
              { x: curr.x, y: curr.y - 1 },
            ];

            for (const n of neighbors) {
              if (
                n.x >= 0 &&
                n.x < this.width &&
                n.y >= 0 &&
                n.y < this.height
              ) {
                const nKey = `${n.x},${n.y}`;
                if (!visited.has(nKey) && this.tiles[n.y][n.x].type === type) {
                  visited.add(nKey);
                  region.tiles.push(n);
                  queue.push(n);
                }
              }
            }
          }
          regions.push(region);
        }
      }

      // 2. Filter and merge small regions
      for (const region of regions) {
        if (
          region.tiles.length < minSize &&
          !preservedTypes.includes(region.type)
        ) {
          // Find most frequent neighbor type
          const neighborTypes = {};
          for (const t of region.tiles) {
            const neighbors = [
              { x: t.x + 1, y: t.y },
              { x: t.x - 1, y: t.y },
              { x: t.x, y: t.y + 1 },
              { x: t.x, y: t.y - 1 },
            ];
            for (const n of neighbors) {
              if (
                n.x >= 0 &&
                n.x < this.width &&
                n.y >= 0 &&
                n.y < this.height
              ) {
                const nType = this.tiles[n.y][n.x].type;
                if (nType !== region.type) {
                  neighborTypes[nType] = (neighborTypes[nType] || 0) + 1;
                }
              }
            }
          }

          let bestNeighbor = null;
          let maxCount = -1;
          for (const [type, count] of Object.entries(neighborTypes)) {
            if (count > maxCount) {
              maxCount = count;
              bestNeighbor = type;
            }
          }

          if (bestNeighbor) {
            // Convert region
            for (const t of region.tiles) {
              this.tiles[t.y][t.x].type = bestNeighbor;
            }
            changed = true;
          }
        }
      }
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
      return { x, y, type: TERRAIN_TYPES.OCEAN.id, explored: false };
    }
    if (elevation < seaLevel) {
      return { x, y, type: TERRAIN_TYPES.SHALLOW_OCEAN.id, explored: false };
    }
    if (elevation < seaLevel + 0.05) {
      return { x, y, type: TERRAIN_TYPES.BEACH.id, explored: false };
    }

    // --- MOUNTAINS ---
    if (elevation > 0.8) {
      if (temperature < 0)
        return { x, y, type: TERRAIN_TYPES.ICE_SHEET.id, explored: false }; // High peaks
      return { x, y, type: TERRAIN_TYPES.ALPINE.id, explored: false };
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
        return { x, y, type: TERRAIN_TYPES.POLAR_DESERT.id, explored: false };
      if (adjMoisture < 0.3)
        return { x, y, type: TERRAIN_TYPES.TUNDRA.id, explored: false };
      return { x, y, type: TERRAIN_TYPES.BOREAL_FOREST.id, explored: false };
    } else if (temperature < 0.3) {
      // TEMPERATE
      if (adjMoisture < -0.4)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_DESERT.id,
          explored: false,
        };
      if (adjMoisture < 0.2)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id,
          explored: false,
        };
      if (adjMoisture < 0.6)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
          explored: false,
        };
      return {
        x,
        y,
        type: TERRAIN_TYPES.TEMPERATE_RAINFOREST.id,
        explored: false,
      }; // Or Swamp?
    } else {
      // HOT
      if (adjMoisture < -0.3)
        return {
          x,
          y,
          type: TERRAIN_TYPES.SUBTROPICAL_DESERT.id,
          explored: false,
        }; // Subtropical Desert
      if (adjMoisture < 0.2)
        return {
          x,
          y,
          type: TERRAIN_TYPES.TROPICAL_SAVANNA.id,
          explored: false,
        };
      return {
        x,
        y,
        type: TERRAIN_TYPES.TROPICAL_RAINFOREST.id,
        explored: false,
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

  exploreTile(x, y) {
    const tile = this.getTile(x, y);
    if (tile && !tile.explored) {
      tile.explored = true;
      return true;
    }
    return false;
  }

  // Find nearest explored tile of a specific type (BFS)
  findNearestExploredTile(typeId, startX, startY) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, dist: 0 }];
    visited.add(`${startX},${startY}`);

    // Map limits
    const maxDist = 500; // Optimization: Don't search forever if it's too far

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];

      if (current.dist > maxDist) break;

      const tile = this.getTile(current.x, current.y);
      if (tile && tile.explored && tile.type === typeId) {
        return { x: current.x, y: current.y, dist: current.dist };
      }

      // Add neighbors
      const directions = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];

      for (const dir of directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const key = `${nx},${ny}`;

        if (
          nx >= 0 &&
          nx < this.width &&
          ny >= 0 &&
          ny < this.height &&
          !visited.has(key)
        ) {
          visited.add(key);
          queue.push({ x: nx, y: ny, dist: current.dist + 1 });
        }
      }
    }

    return null; // Not found
  }

  isExplored(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.explored : false;
  }
}

export const mapManager = new MapManager();
