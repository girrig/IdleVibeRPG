import { describe, it, expect, beforeEach } from "vitest";
import { MapManager, TERRAIN_TYPES } from "./MapManager";

describe("MapManager", () => {
  let mapManager;

  beforeEach(() => {
    mapManager = new MapManager();
  });

  it("should initialize with default dimensions", () => {
    // Assert initialized values
    // but normally we check if mapManager has width/height properties
    expect(mapManager.width).toBe(500);
    expect(mapManager.height).toBe(500);
  });

  it("should generate a valid map on initialization", () => {
    mapManager.initialize();

    expect(mapManager.tiles.length).toBe(500); // Height
    expect(mapManager.tiles[0].length).toBe(500); // Width

    expect(mapManager.tiles[0][0]).toHaveProperty("type");
    expect(mapManager.tiles[0][0]).toHaveProperty("x");
  });

  it("should recover state from save data", () => {
    mapManager.initialize();

    // Modify a tile to test persistence of state
    mapManager.exploreTile(10, 10);
    mapManager.visitTile(10, 10);

    const savedData = mapManager.getSerializableMapData();

    // Assert compressed format
    expect(savedData.tiles).toBeUndefined();
    expect(savedData.seed).toBeDefined();
    expect(savedData.exploredIndices.length).toBeGreaterThan(0);

    // create new instance
    const newManager = new MapManager();
    newManager.initialize(savedData);

    // Assert regeneration
    expect(newManager.tiles.length).toBe(500);
    expect(newManager.seed).toBe(savedData.seed);

    // Assert State Restoration
    const index = 10 * 500 + 10;
    // Check if tile 10,10 is explored/visited in new manager
    expect(newManager.getTile(10, 10).explored).toBe(true);
    expect(newManager.getTile(10, 10).visited).toBe(true);

    // Check unrelated tile
    expect(newManager.getTile(0, 0).explored).toBe(false);
  });

  it("should regenerate map if saved data has wrong dimensions", () => {
    // Test 2: Saved data has WRONG dimensions (e.g. 10x10)
    // Should force regenerate to 500x500
    mapManager.initialize({
      tiles: new Array(10).fill(new Array(10).fill({})),
      seed: 999,
    });

    // Should have ignored the 10x10 and generated 500x500
    expect(mapManager.tiles.length).toBe(500);
    expect(mapManager.tiles[0].length).toBe(500);
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
    // With the new complex Whittaker system, we should see even more diversity (e.g. > 5)
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  describe("Fog of War", () => {
    it("should allow exploring individual tiles", () => {
      mapManager.initialize();
      const tile = mapManager.getTile(10, 10);
      expect(tile.explored).toBe(false);

      mapManager.exploreTile(10, 10);
      expect(tile.explored).toBe(true);
    });

    it("should explore a radius of tiles", () => {
      mapManager.initialize();
      // Pick a center point away from home (250,250)
      const cx = 100;
      const cy = 100;
      const radius = 2;

      // Ensure center is unexplored first
      expect(mapManager.getTile(cx, cy).explored).toBe(false);

      mapManager.exploreRadius(cx, cy, radius);

      // Check center
      expect(mapManager.getTile(cx, cy).explored).toBe(true);

      // Check boundaries
      // (100, 100) + 2 => (102, 100) should be true
      expect(mapManager.getTile(cx + radius, cy).explored).toBe(true);
      expect(mapManager.getTile(cx - radius, cy).explored).toBe(true);
      expect(mapManager.getTile(cx, cy + radius).explored).toBe(true);
      expect(mapManager.getTile(cx, cy - radius).explored).toBe(true);

      // Check diagonal (1^2 + 1^2 = 2 < 2^2) -> Inside
      expect(mapManager.getTile(cx + 1, cy + 1).explored).toBe(true);

      // Check outside (radius + 1)
      expect(mapManager.getTile(cx + radius + 1, cy).explored).toBe(false);
    });

    it("should automatically reveal Home area on generation", () => {
      mapManager.initialize();
      const cx = Math.floor(mapManager.width / 2);
      const cy = Math.floor(mapManager.height / 2);

      // Center should be explored
      expect(mapManager.getTile(cx, cy).explored).toBe(true);
      expect(mapManager.getTile(cx, cy).type).toBe("HOME"); // As string ID

      // Radius 5 check (e.g., cx+4 should be explored)
      expect(mapManager.getTile(cx + 4, cy).explored).toBe(true);
    });
  });

  describe("Visited vs Explored", () => {
    it("should distinguish between explored and visited", () => {
      mapManager.initialize();
      const cx = Math.floor(mapManager.width / 2);
      const cy = Math.floor(mapManager.height / 2);

      // Home should be visited
      expect(mapManager.getTile(cx, cy).visited).toBe(true);

      // Neighbor (via radius) explored but NOT visited
      const neighbor = mapManager.getTile(cx + 1, cy);
      expect(neighbor.explored).toBe(true);
      expect(neighbor.visited).toBe(false);

      // Visit it
      mapManager.visitTile(cx + 1, cy);
      expect(neighbor.visited).toBe(true);
    });

    it("should find nearest UNVISITED explored tile", () => {
      mapManager.initialize();
      // Mock a scenario
      const t1 = mapManager.getTile(10, 10);
      t1.type = "FOREST";
      t1.explored = true;
      t1.visited = true; // Visited already

      const t2 = mapManager.getTile(12, 10);
      t2.type = "FOREST";
      t2.explored = true;
      t2.visited = false; // Target

      const result = mapManager.findNearestExploredUnvisitedTile(
        "FOREST",
        10,
        10,
      );
      expect(result.x).toBe(12);
      expect(result.y).toBe(10);
    });
  });
});
