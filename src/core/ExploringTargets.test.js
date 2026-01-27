// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapManager, TERRAIN_TYPES } from "./MapManager";
import { Character } from "./Character";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

describe("Exploring Skill - Targeting", () => {
  let gameState;
  let char;

  beforeEach(() => {
    // Mock window.gameState
    gameState = {
      triggerNotification: vi.fn(),
      inventory: {
        addItem: vi.fn(),
        items: {},
        getCount: vi.fn(() => 0),
        removeItem: vi.fn(),
      },
      saveGame: vi.fn(),
    };
    window.gameState = gameState;

    // Initialize Map with a known seed to have predictable terrain?
    // Or manually inject tiles for testing.
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

    // Initialize Character
    char = new Character("test_char", "Explorer");
    char.position = { x: 5, y: 5 };
    char.skills.exploring = { level: 10, xp: 0 }; // Level 10 to unlock options
  });

  it("findNearestExploredTile should return closest tile", () => {
    // Setup: Mark (8, 5) as Forest and Explored
    const targetTile = mapManager.getTile(8, 5);
    targetTile.type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    targetTile.explored = true;

    // Search from (5, 5)
    const result = mapManager.findNearestExploredTile(
      TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
      5,
      5,
    );

    expect(result).toBeDefined();
    expect(result.x).toBe(8);
    expect(result.y).toBe(5);
    expect(result.dist).toBe(3);
  });

  it("findNearestExploredTile should ignore unexplored tiles", () => {
    // Setup: Mark (8, 5) as Forest but NOT Explored
    const targetTile = mapManager.getTile(8, 5);
    targetTile.type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    targetTile.explored = false;

    const result = mapManager.findNearestExploredTile(
      TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
      5,
      5,
    );

    expect(result).toBeNull();
  });

  it("should move towards target biome if known", () => {
    // Setup: Character at (5,5). Target Forest at (8,5) is known.
    const targetTile = mapManager.getTile(8, 5);
    targetTile.type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    targetTile.explored = true;

    const action = SKILL_DEFINITIONS.EXPLORING.action;

    // Set activity to find_forest
    // Set activity to find_forest (SEARCHING phase to avoid auto-reset to home)
    char.currentActivity = {
      skill: "EXPLORING",
      target: "find_forest",
      phase: "SEARCHING",
    };

    // Act
    action(gameState, char);

    // Should move towards (8,5), so x should increase to 6
    expect(char.position.x).toBe(6);
    expect(char.position.y).toBe(5);
  });

  it("should gain bonus XP when patrolling target biome", () => {
    // Setup: Character inside a forest, targeting forest
    const tile = mapManager.getTile(5, 5);
    tile.type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    tile.explored = true; // Already known

    // Set phase to EXPLORING since we are already there
    char.currentActivity = {
      skill: "EXPLORING",
      target: "find_forest",
      phase: "EXPLORING",
    };

    // Execute action (will move to adjacent)
    // Force adjacent to also be forest
    mapManager.getTile(6, 5).type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;
    mapManager.getTile(6, 5).explored = true;

    // Mock MapManager to ensure we move to (6,5) or similar?
    // Since we are "finding forest" and (6,5) is known forest, we should move there?
    // Actually findNearestExploredTile might pick (5,5) (dist 0), or neighbors?
    // If we are ON the tile, dist is 0.
    // The implementation: "dx = Math.sign(target.x - x)". If target is current, dx=0, dy=0. No move?
    // Wait, if target is current tile, logic doesn't explicitly handle wandering INSIDE.
    // "1. Are we already there? ... We found it! Just wander inside it or stop?"
    // Current impl falls through to "Fallback: Random Wander".
    // Random wander moves to neighbor.

    const action = SKILL_DEFINITIONS.EXPLORING.action;
    action(gameState, char);

    // Expect XP gain to be > 10% base
    // Base for find_forest is 30. 10% is 3. 50% is 15.
    expect(char.skills.exploring.xp).toBeGreaterThanOrEqual(15);
  });
  it("should random wander if target biome is unknown", () => {
    // Setup: Character at (5,5). NO Forest known.
    const action = SKILL_DEFINITIONS.EXPLORING.action;
    char.currentActivity = {
      skill: "EXPLORING",
      target: "find_forest",
      phase: "SEARCHING",
    };

    const startPos = { ...char.position };
    action(gameState, char);

    // Should have moved to a neighbor (randomly)
    expect(char.position).not.toEqual(startPos);

    // Check if it moved to a valid neighbor
    const dx = Math.abs(char.position.x - startPos.x);
    const dy = Math.abs(char.position.y - startPos.y);
    expect(dx + dy).toBe(1); // Manhattan distance 1
  });

  it("should have all targeted options defined", () => {
    const options = SKILL_DEFINITIONS.EXPLORING.options;
    expect(options.find_grassland).toBeDefined();
    expect(options.find_forest).toBeDefined();
    expect(options.find_desert).toBeDefined();
    expect(options.find_mountain).toBeDefined();
    expect(options.find_ocean).toBeDefined();

    expect(options.find_forest.level).toBe(5);
    expect(options.find_ocean.level).toBe(30);
  });
});
