import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pathfinder } from "./Pathfinder";
import { TERRAIN_TYPES } from "../TerrainTypes";

describe("Pathfinder", () => {
    let pathfinder;
    let mockMapManager;
    let tiles;

    beforeEach(() => {
        // Mock 5x5 grid
        // 0,0 to 4,4
        tiles = [];
        for (let y = 0; y < 5; y++) {
            const row = [];
            for (let x = 0; x < 5; x++) {
                row.push({ x, y, type: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id, explored: false, visited: false });
            }
            tiles.push(row);
        }

        mockMapManager = {
            width: 5,
            height: 5,
            tiles: tiles,
            getTile: (x, y) => {
                if (y >= 0 && y < 5 && x >= 0 && x < 5) return tiles[y][x];
                return null;
            }
        };

        pathfinder = new Pathfinder(mockMapManager);
    });

    describe("exploreTile", () => {
        it("should mark a tile as explored", () => {
            const result = pathfinder.exploreTile(2, 2);
            expect(result).toBe(true);
            expect(tiles[2][2].explored).toBe(true);
        });

        it("should return false if already explored", () => {
            tiles[2][2].explored = true;
            const result = pathfinder.exploreTile(2, 2);
            expect(result).toBe(false);
        });
    });

    describe("exploreRadius", () => {
        it("should explore tiles within radius", () => {
            pathfinder.exploreRadius(2, 2, 1);
            expect(tiles[2][2].explored).toBe(true);
            expect(tiles[2][1].explored).toBe(true);
            expect(tiles[3][2].explored).toBe(true);

            // 0,0 is too far (dist sqrt(8) ~ 2.8 > 1)
            expect(tiles[0][0].explored).toBe(false);
        });
    });

    describe("findNearestExploredTile", () => {
        it("should find the nearest explored tile of a given type", () => {
            tiles[4][4].explored = true;
            tiles[4][4].type = TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id;

            const result = pathfinder.findNearestExploredTile(TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id, 0, 0);
            expect(result.x).toBe(4);
            expect(result.y).toBe(4);
        });

        it("should return null if no explored tile of type exists", () => {
            const result = pathfinder.findNearestExploredTile(TERRAIN_TYPES.SWAMP.id, 0, 0);
            expect(result).toBe(null);
        });
    });

    describe("getContiguousRegion", () => {
        it("should return all connected tiles of same type", () => {
            // Make a T shape of WATER
            tiles[1][1].type = TERRAIN_TYPES.OCEAN.id;
            tiles[1][2].type = TERRAIN_TYPES.OCEAN.id;
            tiles[1][3].type = TERRAIN_TYPES.OCEAN.id;
            tiles[2][2].type = TERRAIN_TYPES.OCEAN.id;

            const region = pathfinder.getContiguousRegion(2, 2); // Start at bottom of T
            expect(region.size).toBe(4);
            expect(region.has("1,1")).toBe(true);
            expect(region.has("2,1")).toBe(true);
            expect(region.has("3,1")).toBe(true);
            expect(region.has("2,2")).toBe(true);
        });
    });
});
