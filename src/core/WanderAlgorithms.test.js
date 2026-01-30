// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapManager } from "./MapManager";
import { Character } from "./Character";
import { SKILL_DEFINITIONS } from "./SkillRegistry";
import { TERRAIN_TYPES } from "./TerrainTypes";

describe("Wander Algorithms", () => {
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
        mapManager.generateMap({ newSeed: true });
        char = new Character("test_char", "Explorer");
        char.position = { x: 250, y: 250 };
    });

    describe("Expansion Wander (wander_expansion)", () => {
        it("should prioritize filling gaps near Home (250, 250)", () => {
            // Setup: Character far away
            char.position = { x: 300, y: 300 };

            // Setup: Unvisited tile near home (251, 250)
            // Ensure home area needs visiting
            mapManager.getTile(251, 250).visited = false;

            // Start
            char.startActivity("EXPLORING", "wander_expansion", 0);

            // Execute
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            // Expect character to walk TOWARDS home (250, 250)
            // 300 -> 250.
            expect(char.position.x).toBeLessThan(300);
            expect(char.position.y).toBeLessThan(300);
        });

        it("should move towards the strictly closest unvisited tile to home", () => {
            char.position = { x: 260, y: 260 };

            // Reset Map Visited State for clarity
            // Mark everything visited first? No, default is false?
            // initialize() reveals home radius.
            // Let's manually set specific targets.

            const t1 = mapManager.getTile(252, 250); // Dist 2 from Home
            const t2 = mapManager.getTile(245, 250); // Dist 5 from Home

            t1.visited = false;
            t1.type = "grassland"; // Walkable

            t2.visited = false;
            t2.type = "grassland";

            // Mark neighbors of home as visited to force Dist 2 search
            mapManager.getTile(251, 250).visited = true;
            mapManager.getTile(249, 250).visited = true;
            mapManager.getTile(250, 251).visited = true;
            mapManager.getTile(250, 249).visited = true;

            const target = mapManager.findNearestUnvisitedWalkableTile(250, 250);
            // Expect 252 (Dist 2)
            expect(target).toEqual({ x: 252, y: 250 });

            char.startActivity("EXPLORING", "wander_expansion", 0);
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            const newPos = char.position;
            // Current 260, 260. Target 250, 252.
            // Use moveTowards logic: dx=-1, dy=-1 (since 260 > 252 and 260 > 250)
            // Note: moveTowards randomly picks Axis or Both.
            // But definitely Less Than 260.
            expect(newPos.x <= 260 || newPos.y <= 260).toBe(true);
        });

        it("should visit current tile if unvisited, then move", () => {
            char.position = { x: 250, y: 250 };

            // Case 1: Standing on Unvisited
            const home = mapManager.getTile(250, 250);
            home.visited = false; // Reset

            char.startActivity("EXPLORING", "wander_expansion", 0);
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            // Should stay put to visit
            expect(char.position).toEqual({ x: 250, y: 250 });
            expect(home.visited).toBe(true); // Should correspond to "Visits tile"

            // Case 2: Now Visited -> Move to neighbor
            mapManager.getTile(251, 250).visited = false;
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            // Should move to 251, 250
            expect(char.position).toEqual({ x: 251, y: 250 });
        });
    });

    describe("Frontier Wander (wander_frontier)", () => {
        it("should push outward from CURRENT position", () => {
            char.position = { x: 250, y: 250 };
            char.startActivity("EXPLORING", "wander_frontier", 0);
            mapManager.exploreRadius(250, 250, 5);

            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            expect(char.position).not.toEqual({ x: 250, y: 250 });
            const dist = Math.abs(char.position.x - 250) + Math.abs(char.position.y - 250);
            expect(dist).toBe(1);
        });

        it("should move INTO the unknown when standing on the frontier", () => {
            char.position = { x: 250, y: 250 };
            mapManager.tiles[250][251].explored = false; // Right is unknown
            mapManager.tiles[250][249].explored = false;
            mapManager.tiles[251][250].explored = false;
            mapManager.tiles[249][250].explored = false;
            mapManager.tiles[250][250].explored = true;

            char.startActivity("EXPLORING", "wander_frontier", 0);
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);

            expect(char.position).not.toEqual({ x: 250, y: 250 });
            // Should stick to 251 or others.
            const dx = Math.abs(char.position.x - 250);
            const dy = Math.abs(char.position.y - 250);
            expect(dx + dy).toBe(1);
        });
    });

    describe("Expedition Wander (wander_expedition)", () => {
        it("should set a distant target and move towards it", () => {
            char.position = { x: 250, y: 250 };
            char.startActivity("EXPLORING", "wander_expedition", 0);
            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);
            const target = char.currentActivity.expeditionTarget;
            const dist = Math.sqrt(Math.pow(target.x - 250, 2) + Math.pow(target.y - 250, 2));
            expect(dist).toBeGreaterThan(140);

            SKILL_DEFINITIONS.EXPLORING.action(gameState, char);
            expect(char.currentActivity.expeditionTarget).toEqual(target);
        });

        it("should complete expedition upon arrival", () => {
            char.position = { x: 250, y: 250 };
            char.startActivity("EXPLORING", "wander_expedition", 0);
            char.currentActivity.expeditionTarget = { x: 251, y: 250 };

            SKILL_DEFINITIONS.EXPLORING.action(gameState, char); // Move to 251
            // Force move just in case random deviation
            char.position = { x: 251, y: 250 };

            SKILL_DEFINITIONS.EXPLORING.action(gameState, char); // Arrival

            expect(char.currentActivity.phase).toBe("RETURNING");
            expect(char.currentActivity.expeditionTarget).toBeNull();
        });
    });

    describe("Simulation", () => {
        it("should clear the area around home in a simulation", () => {
            char.position = { x: 250, y: 250 };
            mapManager.tiles[252][252].explored = false;

            char.startActivity("EXPLORING", "wander_expansion", 0);

            let reached = false;
            for (let i = 0; i < 50; i++) {
                SKILL_DEFINITIONS.EXPLORING.action(gameState, char);
                if (mapManager.tiles[252][252].explored) {
                    reached = true;
                    break;
                }
            }

            expect(reached).toBe(true);
        });
    });
});
