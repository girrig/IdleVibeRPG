// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapManager } from "./MapManager";
import { Character } from "./Character";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

import { TERRAIN_TYPES } from "./TerrainTypes";

// Helper to manually tick
function tick(char) {
  const def = SKILL_DEFINITIONS[char.currentActivity.type];
  if (def && def.action) {
    def.action(window.gameState, char);
  }
}

describe("Exploring Flooding Logic", () => {
  let char;

  beforeEach(() => {
    // Mock GameState
    window.gameState = {
      triggerNotification: vi.fn(),
      saveGame: vi.fn(), // Fix missing mock
      inventory: {
        addItem: vi.fn(),
        removeItem: vi.fn(),
        getCount: vi.fn(() => 999),
      },
      characters: [],
    };

    mapManager.width = 10;
    mapManager.height = 10;
    // Create a 10x10 map with a strip of FOREST
    // 0 1 2 3 4 ...
    // F F F O O ...
    // F F F O O ...
    const tiles = [];
    for (let y = 0; y < 10; y++) {
      const row = [];
      for (let x = 0; x < 10; x++) {
        let type = "OCEAN";
        // Create 3x3 Forest at 0,0
        if (x < 3 && y < 3) type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
        row.push({ x, y, type, explored: false, visited: false });
      }
      tiles.push(row);
    }
    mapManager.tiles = tiles;

    char = new Character("Explorer");
    char.position = { x: 0, y: 0 }; // Start in Forest
    window.gameState.characters.push(char);

    // Mock exploreRadius to actually reveal tiles
    // We override mapManager.exploreRadius slightly to be instant or just rely on real logic?
    // Real logic is fine if we set up tiles correctly.
    // Ensure mapManager uses OUR tiles.
  });

  it("should chain exploration of contiguous biome", () => {
    // Reveal start tile
    mapManager.getTile(0, 0).explored = true;

    // Start Exploring FOREST
    char.startActivity("EXPLORING", "find_forest");

    // Cheat: Set phase to EXPLORING immediately to verify flooding
    // (Normally it SEARCHES first, but we are already IN Forest)
    char.currentActivity.phase = "EXPLORING";

    // Tick 1: Should find neighbor (e.g. 0,1 or 1,0)
    tick(char);

    // Verify movement
    const pos1 = char.position;
    expect(pos1).not.toEqual({ x: 0, y: 0 });
    // Should be in Forest
    expect(mapManager.getTile(pos1.x, pos1.y).type).toBe(
      TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
    );

    // Reveal it (Simulate action completion)
    mapManager.visitTile(pos1.x, pos1.y);
    mapManager.getTile(pos1.x, pos1.y).explored = true;

    // Tick 2: Should find next neighbor
    tick(char);
    const pos2 = char.position;
    expect(pos2).not.toEqual(pos1);
    expect(mapManager.getTile(pos2.x, pos2.y).type).toBe(
      TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
    );
  });

  it("should stop when biome is fully explored", () => {
    // Set ALL Forest tiles to Explored
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        mapManager.getTile(x, y).explored = true;
        mapManager.getTile(x, y).visited = true;
      }
    }

    // Reveal Start
    char.position = { x: 1, y: 1 };

    char.startActivity("EXPLORING", "find_forest");
    char.currentActivity.phase = "EXPLORING";

    // Tick: Should find NO target (Ocean is adjacent but wrong biome)
    tick(char);

    expect(char.currentActivity.phase).toBe("RETURNING");
  });
});
