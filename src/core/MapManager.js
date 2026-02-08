import { TERRAIN_TYPES } from "./TerrainTypes.js";
import { MapGenerator } from "./map/MapGenerator.js";
import { Pathfinder } from "./map/Pathfinder.js";

export { TERRAIN_TYPES };

export class MapManager {
  constructor() {
    this.width = 500;
    this.height = 500;
    this.tiles = []; // 2D array
    this.seed = Date.now();

    // Delegates
    this.generator = new MapGenerator(this.width, this.height);
    this.pathfinder = new Pathfinder(this);
  }

  initialize(savedData = null) {
    if (savedData) {
      this.seed = savedData.seed || this.seed;
      // Dimensions check could go here if we saved it

      // 1. Regenerate
      this.generateMap({ newSeed: false });

      // 2. Apply Saved State
      if (savedData.tiles && savedData.tiles.length > 0) {
        // LEGACY SUPPORT
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            if (savedData.tiles[y] && savedData.tiles[y][x]) {
              const savedTile = savedData.tiles[y][x];
              if (savedTile) {
                if (savedTile.explored) this.tiles[y][x].explored = true;
                if (savedTile.visited) this.tiles[y][x].visited = true;
              }
            }
          }
        }
      } else {
        // NEW FORMAT: Indices
        if (savedData.exploredIndices) {
          savedData.exploredIndices.forEach((idx) => {
            const x = idx % this.width;
            const y = Math.floor(idx / this.width);
            if (this.tiles[y] && this.tiles[y][x]) {
              this.tiles[y][x].explored = true;
            }
          });
        }
        if (savedData.visitedIndices) {
          savedData.visitedIndices.forEach((idx) => {
            const x = idx % this.width;
            const y = Math.floor(idx / this.width);
            if (this.tiles[y] && this.tiles[y][x]) {
              this.tiles[y][x].visited = true;
            }
          });
        }
      }

      // Ensure Home is revealed
      const cx = Math.floor(this.width / 2);
      const cy = Math.floor(this.height / 2);
      if (!this.tiles[cy][cx].explored) {
        this.exploreRadius(cx, cy, 5);
      }
    } else {
      this.generateMap();
      const cx = Math.floor(this.width / 2);
      const cy = Math.floor(this.height / 2);
      this.exploreRadius(cx, cy, 5);
    }
  }

  cleanupBiomes(minSize, preservedTypes) {
    this.generator.width = this.width;
    this.generator.height = this.height;
    this.generator.cleanupBiomes(this.tiles, minSize, preservedTypes);
  }

  generateMap(options = {}) {
    if (options.newSeed) {
      this.seed = Date.now();
    }

    // Update Generator dimensions if manager changed
    this.generator.width = this.width;
    this.generator.height = this.height;

    this.tiles = this.generator.generateMap(this.seed, options);

    // Check for Safe Start (Center)
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);

    if (!options.retryCount) options.retryCount = 0;

    if (this.tiles[centerY] && this.tiles[centerY][centerX]) {
      const centerType = this.tiles[centerY][centerX].type;
      const waterTypes = [
        TERRAIN_TYPES.OCEAN.id,
        TERRAIN_TYPES.SHALLOW_OCEAN.id,
      ];

      if (waterTypes.includes(centerType)) {
        if (options.retryCount < 50 && options.allowRetry !== false) {
          console.log("Starting in water, regenerating map...");
          this.generateMap({
            ...options,
            newSeed: true,
            retryCount: options.retryCount + 1,
          });
          return;
        } else {
          console.warn("Could not find safe start after 50 attempts. Forcing land.");
          this.tiles[centerY][centerX].type = TERRAIN_TYPES.BEACH.id;
        }
      }

      // Mark Home
      this.tiles[centerY][centerX].explored = true;
      this.tiles[centerY][centerX].visited = true;
      this.tiles[centerY][centerX].type = TERRAIN_TYPES.HOME.id;
      delete this.tiles[centerY][centerX].resource;

      this.exploreRadius(centerX, centerY, 5);
    }
  }

  getMapData() {
    return {
      tiles: this.tiles,
      seed: this.seed,
    };
  }

  getSerializableMapData() {
    const exploredIndices = [];
    const visitedIndices = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        if (this.tiles[y][x].explored) {
          exploredIndices.push(index);
        }
        if (this.tiles[y][x].visited) {
          visitedIndices.push(index);
        }
      }
    }

    return {
      seed: this.seed,
      exploredIndices,
      visitedIndices,
    };
  }

  getTile(x, y) {
    if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
      return this.tiles[y][x];
    }
    return null;
  }

  // --- Delegation to Pathfinder ---

  exploreTile(x, y) {
    return this.pathfinder.exploreTile(x, y);
  }

  exploreRadius(centerX, centerY, radius) {
    return this.pathfinder.exploreRadius(centerX, centerY, radius);
  }

  findNearestExploredTile(typeId, startX, startY) {
    return this.pathfinder.findNearestExploredTile(typeId, startX, startY);
  }

  isExplored(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.explored : false;
  }

  getContiguousRegion(startX, startY) {
    return this.pathfinder.getContiguousRegion(startX, startY);
  }

  findNearestUnexploredInRegion(regionSet, currentX, currentY) {
    return this.pathfinder.findNearestUnexploredInRegion(regionSet, currentX, currentY);
  }

  findNearestFrontierTile(startX, startY) {
    return this.pathfinder.findNearestFrontierTile(startX, startY);
  }

  visitTile(x, y) {
    const tile = this.getTile(x, y);
    if (tile && !tile.visited) {
      tile.visited = true;
      return true;
    }
    return false;
  }

  isVisited(x, y) {
    const tile = this.getTile(x, y);
    return tile ? !!tile.visited : false;
  }

  findNearestUnexploredInAdjacentBiome(startX, startY, biomeType) {
    return this.pathfinder.findNearestUnexploredInAdjacentBiome(startX, startY, biomeType);
  }

  findNearestUnvisitedWalkableTile(startX, startY) {
    return this.pathfinder.findNearestUnvisitedWalkableTile(startX, startY);
  }

  findNearestExploredResourceTile(validSources, startX, startY) {
    return this.pathfinder.findNearestExploredResourceTile(validSources, startX, startY);
  }

  findNearestAdjacentResourceTile(validSources, startX, startY) {
    return this.pathfinder.findNearestAdjacentResourceTile(validSources, startX, startY);
  }

  findNearestExploredUnvisitedTile(typeId, startX, startY) {
    return this.pathfinder.findNearestExploredUnvisitedTile(typeId, startX, startY);
  }
}

export const mapManager = new MapManager();
