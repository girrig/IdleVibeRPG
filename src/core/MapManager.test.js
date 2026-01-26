import { describe, it, expect, beforeEach } from "vitest";
import { MapManager, TERRAIN_TYPES } from "./MapManager";

describe("MapManager", () => {
  let mapManager;

  beforeEach(() => {
    mapManager = new MapManager();
  });

  it("should initialize with default dimensions", () => {
    // Assert initial state before generation if needed,
    // but normally we check after init.
    expect(mapManager.width).toBe(90);
    expect(mapManager.height).toBe(60);
  });

  it("should generate a valid map on initialization", () => {
    mapManager.initialize();

    expect(mapManager.tiles.length).toBe(60); // Height
    expect(mapManager.tiles[0].length).toBe(90); // Width

    // Check a random tile
    const tile = mapManager.getTile(0, 0);
    expect(tile).toBeDefined();
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
    expect(tile.type).toBeDefined();
    expect(TERRAIN_TYPES[tile.type]).toBeDefined();
  });

  it("should recover state from save data", () => {
    mapManager.initialize();
    const originalData = mapManager.getMapData();

    // create new instance
    const newManager = new MapManager();
    newManager.initialize(originalData);

    expect(newManager.tiles.length).toBe(60);
    // Deep compare first row to ensure persistence
    expect(newManager.tiles[0][0].type).toBe(originalData.tiles[0][0].type);
    expect(newManager.seed).toBe(originalData.seed);
  });

  it("should regenerate map if saved data has wrong dimensions", () => {
    // Create fake old data (20x20)
    const oldData = {
      tiles: Array(20)
        .fill(null)
        .map(() => Array(20).fill({ type: "PLAINS" })),
      seed: 12345,
    };

    mapManager.initialize(oldData);

    // Should have ignored old data and regenerated to 90x60
    expect(mapManager.tiles.length).toBe(60);
    expect(mapManager.tiles[0].length).toBe(90);
  });

  it("should return null for out of bounds tiles", () => {
    mapManager.initialize();
    expect(mapManager.getTile(-1, 0)).toBeNull();
    expect(mapManager.getTile(0, -1)).toBeNull();
    expect(mapManager.getTile(999, 0)).toBeNull();
    expect(mapManager.getTile(0, 999)).toBeNull();
  });

  it("should generate deterministic maps with the same seed", () => {
    const seed = 12345;

    const map1 = new MapManager();
    map1.seed = seed;
    map1.initialize();

    const map2 = new MapManager();
    map2.seed = seed;
    map2.initialize();

    // Check a few tiles to ensure they are identical
    expect(map1.tiles[0][0].type).toBe(map2.tiles[0][0].type);
    expect(map1.tiles[10][10].type).toBe(map2.tiles[10][10].type);
    expect(map1.tiles[50][50].type).toBe(map2.tiles[50][50].type);
  });

  it("should generate diverse terrain types", () => {
    mapManager.initialize();
    const types = new Set();

    // Scan the map and collect types
    for (let y = 0; y < mapManager.height; y++) {
      for (let x = 0; x < mapManager.width; x++) {
        types.add(mapManager.tiles[y][x].type);
      }
    }

    // We expect at least 3 types (e.g. PLAINS, WATER, FOREST) in a reasonably large map
    expect(types.size).toBeGreaterThanOrEqual(3);
  });
});
