// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mapManager, TERRAIN_TYPES } from "./MapManager";
import { Character } from "./Character";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

describe("Exploring Skill - Biome Logic", () => {
  let gameState;
  let char;

  beforeEach(() => {
    gameState = {
      triggerNotification: vi.fn(),
      inventory: {
        addItem: vi.fn(),
        getCount: vi.fn(() => 100),
        removeItem: vi.fn(),
      },
      saveGame: vi.fn(),
    };
    window.gameState = gameState;

    // Reset Map to a known state (small for testing)
    mapManager.width = 10;
    mapManager.height = 10;
    mapManager.tiles = [];
    for (let y = 0; y < 10; y++) {
      const row = [];
      for (let x = 0; x < 10; x++) {
        row.push({
          x,
          y,
          type: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id,
          explored: false,
        });
      }
      mapManager.tiles.push(row);
    }
    // Set a block of forest
    // (2,2) to (3,3)
    mapManager.tiles[2][2].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    mapManager.tiles[2][3].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    mapManager.tiles[3][2].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    mapManager.tiles[3][3].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;

    char = new Character("test_char", "Explorer");
    char.position = { x: 0, y: 0 };
    char.skills.exploring = { level: 1, xp: 0 };
  });

  afterEach(() => {
    // Restore map size?
    mapManager.width = 500;
    mapManager.height = 500;
  });

  it("should identify contiguous regions correctly", () => {
    // Mock exploreRadius since it's not the focus here but might be called
    const region = mapManager.getContiguousRegion(2, 2);
    expect(region.size).toBe(4);
    expect(region.has("2,2")).toBe(true);
    expect(region.has("3,3")).toBe(true);
    expect(region.has("2,3")).toBe(true);
    expect(region.has("3,2")).toBe(true);
  });

  it("should explore a radius around a point", () => {
    // 2,2 is center. Radius 1 should hit (1,1) to (3,3) roughly
    mapManager.exploreRadius(2, 2, 1);

    expect(mapManager.getTile(2, 2).explored).toBe(true);
    expect(mapManager.getTile(2, 3).explored).toBe(true);
    expect(mapManager.getTile(3, 2).explored).toBe(true);
    expect(mapManager.getTile(1, 2).explored).toBe(true);
    // Multi-radius check
    expect(mapManager.getTile(0, 0).explored).toBe(false); // Dist 2*sqrt(2) approx 2.8 > 1
  });

  it("should find nearest unexplored tile in region", () => {
    const region = mapManager.getContiguousRegion(2, 2);

    // All unexplored initially
    const target = mapManager.findNearestUnexploredInRegion(region, 2, 2);
    expect(target).toBeDefined();
    // Since 2,2 is in region and unexplored, it should return 2,2 (dist 0)
    expect(target).toEqual({ x: 2, y: 2 });

    // Explore 2,2
    mapManager.exploreTile(2, 2);
    const target2 = mapManager.findNearestUnexploredInRegion(region, 2, 2);
    expect(target2).not.toEqual({ x: 2, y: 2 });
    expect(region.has(`${target2.x},${target2.y}`)).toBe(true);
  });

  it("should transition SEARCHING -> EXPLORING when entering biome", () => {
    char.startActivity("EXPLORING", "find_forest", 0);
    char.currentActivity.phase = "SEARCHING"; // Force phase
    char.position = { x: 2, y: 2 }; // Inside forest

    SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

    expect(char.currentActivity.phase).toBe("EXPLORING");
  });

  it("should transition EXPLORING -> RETURNING when finished", () => {
    char.startActivity("EXPLORING", "find_forest", 0);
    char.currentActivity.phase = "EXPLORING";
    char.position = { x: 2, y: 2 };

    // Explore ALL forest tiles
    mapManager.exploreTile(2, 2);
    mapManager.exploreTile(2, 3);
    mapManager.exploreTile(3, 2);
    mapManager.exploreTile(3, 3);

    SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

    expect(char.currentActivity.phase).toBe("RETURNING");
    expect(gameState.triggerNotification).toHaveBeenCalledWith(
      expect.stringContaining("fully explored"),
      "success",
    );
  });

  it("should stop activity when RETURNING reaches home (250,250)", () => {
    // Mock home check involves 250,250.
    // Our test map is 10x10. We can overwrite home coord in logic OR move char to 250,250.
    // Move char to 250,250.
    char.startActivity("EXPLORING", "find_forest", 0);
    char.currentActivity.phase = "RETURNING";
    char.position = { x: 250, y: 250 };

    SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

    expect(char.currentActivity).toBeNull(); // Stopped
    expect(gameState.triggerNotification).toHaveBeenCalledWith(
      expect.stringContaining("Returned home"),
      "success",
    );
  });
});
