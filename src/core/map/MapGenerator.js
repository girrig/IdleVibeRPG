import { createNoise2D } from "simplex-noise";
import { TERRAIN_TYPES } from "../TerrainTypes";
import { RESOURCE_NODES } from "../Constants";

function mulberry32(a) {
  return function () {
    var t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fbm(noiseFn, x, y, octaves = 3) {
  let value = 0, amplitude = 0.5, totalAmp = 0;
  for (let i = 0; i < octaves; i++) {
    value += noiseFn(x, y) * amplitude;
    totalAmp += amplitude;
    x *= 2; y *= 2; amplitude *= 0.5;
  }
  return value / totalAmp;
}

export class MapGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  generateMap(seed, options = {}) {
    const { scale = 0.02, seaLevel = -0.2, moistureOffset = 0 } = options;
    const tiles = [];

    const rngElevation = mulberry32(seed);
    const rngMoisture = mulberry32(seed + 1);
    const rngTemperature = mulberry32(seed + 2);
    const rngContinent = mulberry32(seed + 3);

    const noise2D_elevation = createNoise2D(rngElevation);
    const noise2D_moisture = createNoise2D(rngMoisture);
    const noise2D_temperature = createNoise2D(rngTemperature);
    const noise2D_continent = createNoise2D(rngContinent);

    const continentScale = scale * 0.2;

    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        const continentalness = noise2D_continent(x * continentScale, y * continentScale);
        const detail = fbm(noise2D_elevation, x * scale, y * scale);
        const elevation = continentalness * 0.7 + detail * 0.3;
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
            moistureOffset
          )
        );
      }
      tiles.push(row);
    }

    // Post-processing: Remove small biomes
    this.cleanupBiomes(tiles, options.minBiomeSize || 50, [
      TERRAIN_TYPES.BEACH.id,
      TERRAIN_TYPES.SWAMP.id,
      TERRAIN_TYPES.ALPINE_TUNDRA.id,
      TERRAIN_TYPES.SHRUBLAND.id,
    ]);

    // Generate Resources
    this.generateResources(tiles, seed);

    return tiles;
  }

  generateTile(x, y, elevation, moisture, temperature, seaLevel, moistureOffset) {
    const adjMoisture = moisture + moistureOffset;

    // --- WATER LEVEL ---
    if (elevation < seaLevel - 0.25) {
      return { x, y, type: TERRAIN_TYPES.OCEAN.id, explored: false, visited: false };
    }
    if (elevation < seaLevel) {
      return { x, y, type: TERRAIN_TYPES.SHALLOW_OCEAN.id, explored: false, visited: false };
    }
    if (elevation < seaLevel + 0.05) {
      return { x, y, type: TERRAIN_TYPES.BEACH.id, explored: false, visited: false };
    }

    // --- SWAMP: low-lying wet areas ---
    if (elevation < seaLevel + 0.15 && adjMoisture > 0.3 && temperature >= -0.3) {
      return { x, y, type: TERRAIN_TYPES.SWAMP.id, explored: false, visited: false };
    }

    // --- MOUNTAINS ---
    if (elevation > 0.8) {
      if (temperature < 0)
        return { x, y, type: TERRAIN_TYPES.ICE_SHEET.id, explored: false, visited: false };
      return { x, y, type: TERRAIN_TYPES.ALPINE.id, explored: false, visited: false };
    }

    // --- ALPINE TUNDRA: mountain transition zone ---
    if (elevation > 0.6 && temperature < -0.3) {
      return { x, y, type: TERRAIN_TYPES.ALPINE_TUNDRA.id, explored: false, visited: false };
    }

    // --- LAND BIOMES ---
    if (temperature < -0.3) {
      if (adjMoisture < -0.3) return { x, y, type: TERRAIN_TYPES.POLAR_DESERT.id, explored: false, visited: false };
      if (adjMoisture < 0.3) return { x, y, type: TERRAIN_TYPES.TUNDRA.id, explored: false, visited: false };
      return { x, y, type: TERRAIN_TYPES.BOREAL_FOREST.id, explored: false, visited: false };
    } else if (temperature < 0.3) {
      if (adjMoisture < -0.4) return { x, y, type: TERRAIN_TYPES.TEMPERATE_DESERT.id, explored: false, visited: false };
      if (adjMoisture < -0.15) return { x, y, type: TERRAIN_TYPES.SHRUBLAND.id, explored: false, visited: false };
      if (adjMoisture < 0.2) return { x, y, type: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id, explored: false, visited: false };
      if (adjMoisture < 0.6) return { x, y, type: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id, explored: false, visited: false };
      return { x, y, type: TERRAIN_TYPES.TEMPERATE_RAINFOREST.id, explored: false, visited: false };
    } else {
      if (adjMoisture < -0.3) return { x, y, type: TERRAIN_TYPES.SUBTROPICAL_DESERT.id, explored: false, visited: false };
      if (adjMoisture < 0.2) return { x, y, type: TERRAIN_TYPES.TROPICAL_SAVANNA.id, explored: false, visited: false };
      return { x, y, type: TERRAIN_TYPES.TROPICAL_RAINFOREST.id, explored: false, visited: false };
    }
  }

  cleanupBiomes(tiles, minSize, preservedTypes = []) {
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;
      const visited = new Set();
      const regions = [];

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const key = `${x},${y}`;
          if (visited.has(key)) continue;

          const type = tiles[y][x].type;
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
              if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                const nKey = `${n.x},${n.y}`;
                if (!visited.has(nKey) && tiles[n.y][n.x].type === type) {
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

      for (const region of regions) {
        if (region.tiles.length < minSize && !preservedTypes.includes(region.type)) {
          const neighborTypes = {};
          for (const t of region.tiles) {
            const neighbors = [
              { x: t.x + 1, y: t.y },
              { x: t.x - 1, y: t.y },
              { x: t.x, y: t.y + 1 },
              { x: t.x, y: t.y - 1 },
            ];
            for (const n of neighbors) {
              if (n.x >= 0 && n.x < this.width && n.y >= 0 && n.y < this.height) {
                const nType = tiles[n.y][n.x].type;
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
            for (const t of region.tiles) {
              tiles[t.y][t.x].type = bestNeighbor;
            }
            changed = true;
          }
        }
      }
    }
  }

  generateResources(tiles, seed) {
    // Sort Configs by Priority (High to Low)
    const sortedConfigs = Object.values(RESOURCE_NODES).sort((a, b) => {
      return (b.priority || 0) - (a.priority || 0);
    });

    // Group configs by priority level
    const priorityGroups = [];
    let currentGroup = null;
    for (const config of sortedConfigs) {
      const p = config.priority || 0;
      if (!currentGroup || currentGroup.priority !== p) {
        currentGroup = { priority: p, configs: [] };
        priorityGroups.push(currentGroup);
      }
      currentGroup.configs.push(config);
    }

    // Deterministic RNG for tiebreaking same-priority conflicts
    const tiebreakRng = mulberry32(seed + 99999);

    // Pre-create noise functions for every config
    const noiseMap = {};
    for (const config of sortedConfigs) {
      let param = 0;
      for (let i = 0; i < config.id.length; i++) {
        param += config.id.charCodeAt(i);
      }
      noiseMap[config.id] = createNoise2D(mulberry32(seed + param));
    }

    // Process each priority group (high to low)
    for (const group of priorityGroups) {
      if (group.configs.length === 1) {
        // Single config at this priority — fast path
        const config = group.configs[0];
        const noise = noiseMap[config.id];
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const tile = tiles[y][x];
            if (!tile.resource && config.allowedBiomes.includes(tile.type)) {
              const val = (noise(x * config.scale, y * config.scale) + 1) / 2;
              if (val > config.threshold) {
                tile.resource = { type: config.id, amount: config.amount };
              }
            }
          }
        }
      } else {
        // Multiple configs at same priority — resolve conflicts randomly
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const tile = tiles[y][x];
            if (tile.resource) continue;

            const candidates = [];
            for (const config of group.configs) {
              if (!config.allowedBiomes.includes(tile.type)) continue;
              const noise = noiseMap[config.id];
              const val = (noise(x * config.scale, y * config.scale) + 1) / 2;
              if (val > config.threshold) {
                candidates.push(config);
              }
            }

            if (candidates.length === 1) {
              tile.resource = { type: candidates[0].id, amount: candidates[0].amount };
            } else if (candidates.length > 1) {
              const pick = Math.floor(tiebreakRng() * candidates.length);
              tile.resource = { type: candidates[pick].id, amount: candidates[pick].amount };
            }
          }
        }
      }
    }
  }
}
