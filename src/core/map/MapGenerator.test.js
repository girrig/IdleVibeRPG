import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapGenerator } from "./MapGenerator";
import { TERRAIN_TYPES } from "../TerrainTypes";

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

        it("should generate deterministic maps given the same seed", () => {
            const seed = 999;
            const tiles1 = generator.generateMap(seed);
            const tiles2 = generator.generateMap(seed); // Re-run

            // Check a few tiles
            expect(tiles1[5][5].type).toBe(tiles2[5][5].type);
            expect(tiles1[10][10].type).toBe(tiles2[10][10].type);
        });
    });

    describe("generateTile", () => {
        it("should return OCEAN for low elevation", () => {
            // sea level is -0.2. elevation -0.5 is deep ocean
            const tile = generator.generateTile(0, 0, -0.5, 0, 0, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.OCEAN.id);
        });

        it("should return MOUNTAIN/ALPINE for high elevation", () => {
            const tile = generator.generateTile(0, 0, 0.9, 0, 0.1, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.ALPINE.id);
        });

        it("should return ICE_SHEET for high elevation and low temp", () => {
            const tile = generator.generateTile(0, 0, 0.9, 0, -0.5, -0.2, 0);
            expect(tile.type).toBe(TERRAIN_TYPES.ICE_SHEET.id);
        });
    });

    describe("cleanupBiomes", () => {
        it("should remove small isolated biomes", () => {
            // Manually construct a grid with a small island
            const tiles = [];
            for (let y = 0; y < 10; y++) {
                const row = [];
                for (let x = 0; x < 10; x++) {
                    row.push({ x, y, type: TERRAIN_TYPES.OCEAN.id });
                }
                tiles.push(row);
            }

            // Add one forest tile in the middle of ocean
            tiles[5][5].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;

            // Patch dimensions for this test since we made a 10x10 grid on a 20x20 generator
            generator.width = 10;
            generator.height = 10;

            generator.cleanupBiomes(tiles, 5, []);

            expect(tiles[5][5].type).toBe(TERRAIN_TYPES.OCEAN.id);
        });

        it("should strictly preserve preserved types", () => {
            const tiles = [];
            for (let y = 0; y < 10; y++) {
                const row = [];
                for (let x = 0; x < 10; x++) {
                    row.push({ x, y, type: TERRAIN_TYPES.OCEAN.id });
                }
                tiles.push(row);
            }

            tiles[5][5].type = TERRAIN_TYPES.BEACH.id;
            generator.width = 10;
            generator.height = 10;

            generator.cleanupBiomes(tiles, 5, [TERRAIN_TYPES.BEACH.id]);
            expect(tiles[5][5].type).toBe(TERRAIN_TYPES.BEACH.id);
        });
    });
});
