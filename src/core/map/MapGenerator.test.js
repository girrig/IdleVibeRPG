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
                amount: 1,
                allowedBiomes: ["TEST_BIOME"],
                default_drops: []
            },
            high_prio: {
                id: "high_prio",
                priority: 100, // Higher priority
                scale: 0.1,
                threshold: -1, // Always spawn
                amount: 1,
                allowedBiomes: ["TEST_BIOME"],
                default_drops: []
            },
            same_prio_a: {
                id: "same_prio_a",
                priority: 0,
                scale: 0.1,
                threshold: -1,
                amount: 1,
                allowedBiomes: ["FAIR_TEST_BIOME"],
                default_drops: []
            },
            same_prio_b: {
                id: "same_prio_b",
                priority: 0,
                scale: 0.1,
                threshold: -1,
                amount: 1,
                allowedBiomes: ["FAIR_TEST_BIOME"],
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
            generator.generateResources(tiles, 12345);

            expect(tiles[0][0].resource).not.toBeNull();
            expect(tiles[0][0].resource.type).toBe("high_prio");
        });

        it("should distribute same-priority nodes fairly across shared biomes", () => {
            const tiles = [];
            for (let y = 0; y < 20; y++) {
                const row = [];
                for (let x = 0; x < 20; x++) {
                    row.push({ x, y, type: "FAIR_TEST_BIOME", resource: null });
                }
                tiles.push(row);
            }

            generator.width = 20;
            generator.height = 20;
            generator.generateResources(tiles, 12345);

            const counts = { same_prio_a: 0, same_prio_b: 0 };
            for (const row of tiles) {
                for (const tile of row) {
                    if (tile.resource && tile.resource.type in counts) {
                        counts[tile.resource.type]++;
                    }
                }
            }

            // Both should have claimed some tiles (not one dominating entirely)
            expect(counts.same_prio_a).toBeGreaterThan(0);
            expect(counts.same_prio_b).toBeGreaterThan(0);
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

        it("should return SWAMP for low elevation, high moisture, warm temperature", () => {
            // seaLevel=-0.2: beach < -0.15, swamp < -0.05
            const tile = generator.generateTile(0, 0, -0.1, 0.5, 0.1, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.SWAMP.id);
        });

        it("should NOT return SWAMP for low elevation, high moisture, cold temperature", () => {
            const tile = generator.generateTile(0, 0, -0.1, 0.5, -0.5, -0.2, 0);
            expect(tile.type).not.toBe(TERRAIN_TYPES.SWAMP.id);
        });

        it("should return ALPINE_TUNDRA for high elevation and cold temperature", () => {
            // elevation 0.7 (between 0.6 and 0.8), temperature < -0.3
            const tile = generator.generateTile(0, 0, 0.7, 0, -0.5, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.ALPINE_TUNDRA.id);
        });

        it("should NOT return ALPINE_TUNDRA for high elevation and warm temperature", () => {
            const tile = generator.generateTile(0, 0, 0.7, 0, 0.1, -0.2, 0);
            expect(tile.type).not.toBe(TERRAIN_TYPES.ALPINE_TUNDRA.id);
        });

        it("should return SHRUBLAND for temperate temperature and dry-ish moisture", () => {
            // temp in (-0.3, 0.3), moisture in (-0.4, -0.15)
            const tile = generator.generateTile(0, 0, 0.5, -0.3, 0.0, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.SHRUBLAND.id);
        });

        it("should return TEMPERATE_DESERT when drier than SHRUBLAND", () => {
            const tile = generator.generateTile(0, 0, 0.5, -0.5, 0.0, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.TEMPERATE_DESERT.id);
        });

        it("should return TEMPERATE_GRASSLAND when wetter than SHRUBLAND", () => {
            const tile = generator.generateTile(0, 0, 0.5, 0.0, 0.0, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.TEMPERATE_GRASSLAND.id);
        });
    });

    describe("cleanupBiomes", () => {
        it("should preserve SWAMP, ALPINE_TUNDRA, SHRUBLAND from cleanup", () => {
            const gen = new MapGenerator(10, 10);
            const tiles = [];
            for (let y = 0; y < 10; y++) {
                const row = [];
                for (let x = 0; x < 10; x++) {
                    row.push({ x, y, type: "TEMPERATE_GRASSLAND" });
                }
                tiles.push(row);
            }
            // Place a small SWAMP region (3 tiles)
            tiles[5][5].type = "SWAMP";
            tiles[5][6].type = "SWAMP";
            tiles[6][5].type = "SWAMP";

            gen.cleanupBiomes(tiles, 50, [
                "BEACH", "SWAMP", "ALPINE_TUNDRA", "SHRUBLAND"
            ]);

            expect(tiles[5][5].type).toBe("SWAMP");
            expect(tiles[5][6].type).toBe("SWAMP");
            expect(tiles[6][5].type).toBe("SWAMP");
        });

        it("should still merge non-preserved small biomes", () => {
            const gen = new MapGenerator(10, 10);
            const tiles = [];
            for (let y = 0; y < 10; y++) {
                const row = [];
                for (let x = 0; x < 10; x++) {
                    row.push({ x, y, type: "TEMPERATE_GRASSLAND" });
                }
                tiles.push(row);
            }
            // Place a small TUNDRA region (3 tiles) — not preserved
            tiles[5][5].type = "TUNDRA";
            tiles[5][6].type = "TUNDRA";
            tiles[6][5].type = "TUNDRA";

            gen.cleanupBiomes(tiles, 50, [
                "BEACH", "SWAMP", "ALPINE_TUNDRA", "SHRUBLAND"
            ]);

            expect(tiles[5][5].type).toBe("TEMPERATE_GRASSLAND");
        });
    });
});
