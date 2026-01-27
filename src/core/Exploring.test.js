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
    // NOTE: startActivity now resets position to HOME (250, 250).
    // We must overload this for the test to verify "New Area" logic at 100,100.
    char.startActivity("EXPLORING", "wander", 0);
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

    // Notification should trigger for new area
    expect(gameState.triggerNotification).toHaveBeenCalledWith(
      "Discovered new area!",
      "success",
    );

    // KEY CHANGE: Check that it wasn't just the single tile, but a radius
    // Assuming default sight range is 5
    const r = 5;
    const neighborTile = mapManager.getTile(newPos.x + 1, newPos.y);
    // This implies we rely on default sight range.
    // If Exploring skill calls exploreRadius, checking one neighbor is a good proxy.
    expect(neighborTile.explored).toBe(true);
  });

  it("should gain reduced XP for revisiting explored tiles", () => {
    const action = SKILL_DEFINITIONS.EXPLORING.action;
    char.startActivity("EXPLORING", "wander", 0);

    // 1. Visit a tile
    action(gameState, char);
    const firstPos = { ...char.position };
    const xpAfterFirst = char.skills.exploring.xp;
    expect(xpAfterFirst).toBeGreaterThan(0);

    // Reset XP to track gain clearly
    char.skills.exploring.xp = 0;

    // Hack: Make all neighbors explored to force a "revisit" scenario if we move to one
    //Actually, pure random walk might revisit.
    // Let's manually force the character to a position where a neighbor IS explored.

    // Let's just force the tile we are ON to be explored (it is).
    // Try to move. If we move to a new tile, we get full XP.
    // If we move to an explored tile, we get reduced XP.
    // Since we can't easily force the random walk to go to a specific tile without mocking math.random,
    // let's mock Math.random to verify the logic specifically.

    // Or simpler: Pre-explore ALL neighbors of current position.
    const { x, y } = char.position;
    // Pre-explore ALL neighbors and the radius around them to ensure NO new tiles are revealed
    // Character sight radius is typically 3. So if we explore radius 5 around current pos, moving 1 step should still check inside that zone.

    mapManager.exploreRadius(x, y, 10);

    // Now move
    action(gameState, char);

    // Should have gained reduced XP (10% of 15 = 1)
    expect(char.skills.exploring.xp).toBe(Math.floor(15 * 0.1));
  });
});
