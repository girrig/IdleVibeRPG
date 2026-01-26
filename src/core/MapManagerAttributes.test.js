import { describe, it, expect, beforeEach } from "vitest";
import { MapManager } from "./MapManager";

describe("MapManager Cleanup", () => {
  let mapManager;

  beforeEach(() => {
    mapManager = new MapManager();
    // Use small map for testing
    mapManager.width = 10;
    mapManager.height = 10;
    // Initialize empty tiles array
    mapManager.tiles = [];
    for (let y = 0; y < 10; y++) {
      const row = [];
      for (let x = 0; x < 10; x++) {
        row.push({ x, y, type: "OCEAN" });
      }
      mapManager.tiles.push(row);
    }
  });

  it("should merge small biome islands into neighbors", () => {
    // Create a 1-tile island of TEMPERATE_DECIDUOUS_FOREST in OCEAN
    mapManager.tiles[5][5].type = "TEMPERATE_DECIDUOUS_FOREST";

    // Check initial state
    expect(mapManager.tiles[5][5].type).toBe("TEMPERATE_DECIDUOUS_FOREST");

    // Run cleanup with minSize 2
    mapManager.cleanupBiomes(2);

    // Should be converted to OCEAN
    expect(mapManager.tiles[5][5].type).toBe("OCEAN");
  });

  it("should not merge large enough biomes", () => {
    // Create a block of 4 tiles of TEMPERATE_DECIDUOUS_FOREST
    mapManager.tiles[5][5].type = "TEMPERATE_DECIDUOUS_FOREST";
    mapManager.tiles[5][6].type = "TEMPERATE_DECIDUOUS_FOREST";
    mapManager.tiles[6][5].type = "TEMPERATE_DECIDUOUS_FOREST";
    mapManager.tiles[6][6].type = "TEMPERATE_DECIDUOUS_FOREST";

    // Run cleanup with minSize 4
    mapManager.cleanupBiomes(4);

    // Should stay TEMPERATE_DECIDUOUS_FOREST
    expect(mapManager.tiles[5][5].type).toBe("TEMPERATE_DECIDUOUS_FOREST");
  });

  it("should handle multiple iterations/blobs", () => {
    // Create a 1-tile island of TEMPERATE_DECIDUOUS_FOREST next to a 1-tile island of SUBTROPICAL_DESERT, both in OCEAN
    mapManager.tiles[5][5].type = "TEMPERATE_DECIDUOUS_FOREST";
    mapManager.tiles[5][6].type = "SUBTROPICAL_DESERT";

    // Run cleanup with minSize 5
    mapManager.cleanupBiomes(5);

    // Both should eventually become OCEAN (neighbors)
    expect(mapManager.tiles[5][6].type).toBe("OCEAN");
  });

  it("should preserve specific biomes (e.g. BEACH) even if small", () => {
    // Create a 1-tile island of BEACH
    mapManager.tiles[5][5].type = "BEACH";

    // Run cleanup with minSize 5, but preserve BEACH
    mapManager.cleanupBiomes(5, ["BEACH"]);

    // Should stay BEACH
    expect(mapManager.tiles[5][5].type).toBe("BEACH");
  });
});
