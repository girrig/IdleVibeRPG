import { describe, it, expect } from "vitest";
import { TERRAIN_TYPES } from "./TerrainTypes";

describe("TerrainTypes", () => {
  it("should define at least 10 terrain types", () => {
    expect(Object.keys(TERRAIN_TYPES).length).toBeGreaterThanOrEqual(10);
  });

  it("should have matching id and key for each terrain type", () => {
    for (const [key, terrain] of Object.entries(TERRAIN_TYPES)) {
      expect(terrain.id).toBe(key);
    }
  });

  it("should have required fields on each terrain type", () => {
    for (const terrain of Object.values(TERRAIN_TYPES)) {
      expect(typeof terrain.id).toBe("string");
      expect(typeof terrain.color).toBe("string");
      expect(typeof terrain.symbol).toBe("string");
    }
  });

  it("should have valid hex color strings", () => {
    for (const terrain of Object.values(TERRAIN_TYPES)) {
      expect(terrain.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it("should define key biome types", () => {
    expect(TERRAIN_TYPES.OCEAN).toBeDefined();
    expect(TERRAIN_TYPES.BEACH).toBeDefined();
    expect(TERRAIN_TYPES.HOME).toBeDefined();
    expect(TERRAIN_TYPES.ALPINE).toBeDefined();
    expect(TERRAIN_TYPES.SWAMP).toBeDefined();
    expect(TERRAIN_TYPES.TROPICAL_RAINFOREST).toBeDefined();
  });

  it("should have HOME terrain with gold color", () => {
    expect(TERRAIN_TYPES.HOME.color).toBe("#FFD700");
    expect(TERRAIN_TYPES.HOME.symbol).toBe("🏠");
  });
});
