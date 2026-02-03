import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapGenerator } from "./MapGenerator";
import { TERRAIN_TYPES } from "../TerrainTypes";

// Mock Constants to control RESOURCE_NODES for priority testing
vi.mock("../Constants", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        RESOURCE_NODES: {
            low_prio: {
                id: "low_prio",
                priority: 0,
                scale: 0.1,
                threshold: -1, // Always spawn
                amount: 10,
                allowedBiomes: ["TEST_BIOME"],
                default_drops: []
            },
            high_prio: {
                id: "high_prio",
                priority: 100, // Higher priority
                scale: 0.1,
                threshold: -1, // Always spawn
                amount: 10,
                allowedBiomes: ["TEST_BIOME"],
                default_drops: []
            }
        }
    };
});

describe("MapGenerator", () => {
    let generator;

    beforeEach(() => {
        generator = new MapGenerator(20, 20); // Small size for testing
    });

    it("should initialize with dimensions", () => {
        expect(generator.width).toBe(20);
        expect(generator.height).toBe(20);
    });

    describe("generateMap", () => {
        it("should return a 2D array of tiles with correct dimensions", () => {
            const tiles = generator.generateMap(12345);
            expect(tiles.length).toBe(20);
            expect(tiles[0].length).toBe(20);
            expect(tiles[0][0]).toHaveProperty("x");
            expect(tiles[0][0]).toHaveProperty("y");
            expect(tiles[0][0]).toHaveProperty("type");
        });
    });

    describe("generateResources", () => {
        it("should prioritize high priority nodes over low priority nodes", () => {
            // Setup a grid of TEST_BIOME
            const tiles = [];
            for (let y = 0; y < 10; y++) {
                const row = [];
                for (let x = 0; x < 10; x++) {
                    row.push({ x, y, type: "TEST_BIOME", resource: null });
                }
                tiles.push(row);
            }

            generator.width = 10;
            generator.height = 10;

            // Both nodes allow TEST_BIOME and have threshold -1 (always spawn).
            // High Prio (100) should run first and claim the tile.
            // Low Prio (0) should run second, see 'tile.resource' is full, and skip.

            generator.generateResources(tiles, 12345);

            // Check a sample tile
            expect(tiles[0][0].resource).not.toBeNull();
            expect(tiles[0][0].resource.type).toBe("high_prio");
        });
    });

    describe("generateTile", () => {
        it("should return OCEAN for low elevation", () => {
            const tile = generator.generateTile(0, 0, -0.5, 0, 0, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.OCEAN.id);
        });

        it("should return MOUNTAIN/ALPINE for high elevation", () => {
            const tile = generator.generateTile(0, 0, 0.9, 0, 0.1, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.ALPINE.id);
        });
    });
});
