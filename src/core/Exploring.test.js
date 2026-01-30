// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapManager } from "./MapManager";
import { Character } from "./Character";
import { SKILL_DEFINITIONS } from "./SkillRegistry";
import { TERRAIN_TYPES } from "./MapManager";

describe("Exploring Skill", () => {
  let gameState;
  let char;

  beforeEach(() => {
    // Mock window.gameState
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

    // Initialize Map
    // Force small size for easier testing? Or just use default
    mapManager.generateMap({ newSeed: true });

    // Initialize Character
    char = new Character("test_char", "Explorer");
    char.position = { x: 250, y: 250 };
  });

  it("should initialize map tiles as unexplored, except home", () => {
    // Just check a few random tiles
    expect(mapManager.getTile(0, 0).explored).toBe(false);

    // Check Home Tile (250, 250) - Should be EXPLORED and HOME
    const homeTile = mapManager.getTile(250, 250);
    expect(homeTile.explored).toBe(true);
    expect(homeTile.type).toBe(TERRAIN_TYPES.HOME.id);
  });

  it("should have exploring skill initialized on character", () => {
    expect(char.skills.exploring).toBeDefined();
    expect(char.skills.exploring.level).toBe(1);
  });

  it("should move character and reveal tiles on wander", () => {
    // Start at a random unexplored location (e.g. 100, 100)
    // Execute action
    // Fix: initialize activity state first so currentActivity is set
    char.startActivity("EXPLORING", "wander_frontier", 0);
    const action = SKILL_DEFINITIONS.EXPLORING.action;
    char.position = { x: 100, y: 100 };
    const startPos = { ...char.position };
    action(gameState, char);

    const newPos = char.position;

    // Should have moved
    expect(newPos).not.toEqual(startPos);

    // New tile should be explored
    const tile = mapManager.getTile(newPos.x, newPos.y);
    expect(tile.explored).toBe(true);

    // Should have gained XP
    expect(char.skills.exploring.xp).toBeGreaterThan(0);

    // KEY CHANGE: Check that it wasn't just the single tile, but a radius
    // Assuming default sight range is 5
    const r = 5;
    const neighborTile = mapManager.getTile(newPos.x + 1, newPos.y);
    // This implies we rely on default sight range.
    // If Exploring skill calls exploreRadius, checking one neighbor is a good proxy.
    expect(neighborTile.explored).toBe(true);
  });

  it("should gain NO XP for revisiting explored tiles", () => {
    const action = SKILL_DEFINITIONS.EXPLORING.action;
    char.startActivity("EXPLORING", "wander_frontier", 0);

    // 1. Visit a tile
    action(gameState, char);
    const firstPos = { ...char.position };
    const xpAfterFirst = char.skills.exploring.xp;
    expect(xpAfterFirst).toBeGreaterThan(0);

    // Reset XP to track gain clearly
    char.skills.exploring.xp = 0;

    // Pre-explore ALL neighbors and the radius around them to ensure NO new tiles are revealed
    const { x, y } = char.position;
    mapManager.exploreRadius(x, y, 10);

    // Now move
    action(gameState, char);

    // Should have gained NO XP (0)
    expect(char.skills.exploring.xp).toBe(0);
  });

  it("should prioritize immediate unexplored neighbors", () => {
    char.startActivity("EXPLORING", "wander_frontier", 0);
    char.currentActivity.phase = "WANDERING"; // Set phase to avoid reset
    const action = SKILL_DEFINITIONS.EXPLORING.action;

    // Center explored
    const cx = 200,
      cy = 200;
    char.position = { x: cx, y: cy };
    mapManager.exploreTile(cx, cy);

    // Neighbors explored EXCEPT Right (cx+1, cy)
    mapManager.exploreTile(cx - 1, cy); // Left
    mapManager.exploreTile(cx, cy - 1); // Top
    mapManager.exploreTile(cx, cy + 1); // Bottom

    // Ensure target is UNEXPLORED
    const targetTile = mapManager.getTile(cx + 1, cy);
    targetTile.explored = false;

    action(gameState, char);

    expect(char.position.x).toBe(cx + 1);
    expect(char.position.y).toBe(cy);
  });

  it("should seek frontier when surrounded by explored tiles", () => {
    char.startActivity("EXPLORING", "wander_frontier", 0);
    char.currentActivity.phase = "WANDERING"; // Set phase to avoid reset
    const action = SKILL_DEFINITIONS.EXPLORING.action;

    // Fully explore a 5x5 area around start
    const cx = 300,
      cy = 300;
    char.position = { x: cx, y: cy };
    mapManager.exploreRadius(cx, cy, 2);

    // Verify initial state: Neighbors are explored
    expect(mapManager.getTile(cx + 1, cy).explored).toBe(true);

    // Action should find nearest frontier
    action(gameState, char);

    // Should have moved away from center (simple check)
    expect(char.position).not.toEqual({ x: cx, y: cy });

    // Calculate distance to center, should be 1 (since it moves one step)
    const dist =
      Math.abs(char.position.x - cx) + Math.abs(char.position.y - cy);
    expect(dist).toBe(1);

    // We can't easily predict EXACT direction without mocking findNearestFrontierTile return,
    // but we know it should move.
  });
});
