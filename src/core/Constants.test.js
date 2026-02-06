import { describe, it, expect } from "vitest";
import { UI_COLORS, GAME_CONFIG, RESOURCE_NODES } from "./Constants";

describe("Constants", () => {
  describe("UI_COLORS", () => {
    it("should define stat colors", () => {
      expect(UI_COLORS.STAT_STR).toBeDefined();
      expect(UI_COLORS.STAT_DEX).toBeDefined();
      expect(UI_COLORS.STAT_INT).toBeDefined();
    });

    it("should define status colors", () => {
      expect(UI_COLORS.STATUS_IDLE).toBeDefined();
      expect(UI_COLORS.STATUS_ACTIVE).toBeDefined();
    });

    it("should have valid hex color strings", () => {
      for (const [key, value] of Object.entries(UI_COLORS)) {
        expect(value).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    });
  });

  describe("GAME_CONFIG", () => {
    it("should have a positive tick rate", () => {
      expect(GAME_CONFIG.TICK_RATE).toBeGreaterThan(0);
    });

    it("should have an autosave interval", () => {
      expect(GAME_CONFIG.AUTOSAVE_INTERVAL).toBeGreaterThan(0);
    });

    it("should have default skill interval", () => {
      expect(GAME_CONFIG.DEFAULT_SKILL_INTERVAL).toBeGreaterThan(0);
    });

    it("should have notification settings", () => {
      expect(GAME_CONFIG.NOTIFICATIONS).toBeDefined();
      expect(typeof GAME_CONFIG.NOTIFICATIONS.MASTER).toBe("boolean");
      expect(typeof GAME_CONFIG.NOTIFICATIONS.LEVEL_UP).toBe("boolean");
    });

    it("should have a starting position with x and y", () => {
      expect(GAME_CONFIG.STARTING_POSITION).toBeDefined();
      expect(typeof GAME_CONFIG.STARTING_POSITION.x).toBe("number");
      expect(typeof GAME_CONFIG.STARTING_POSITION.y).toBe("number");
    });
  });

  describe("RESOURCE_NODES", () => {
    it("should define known node types", () => {
      expect(RESOURCE_NODES.mineral_node).toBeDefined();
      expect(RESOURCE_NODES.tree_node).toBeDefined();
      expect(RESOURCE_NODES.fishing_spot).toBeDefined();
      expect(RESOURCE_NODES.bush_node).toBeDefined();
    });

    it("should have required fields on each node", () => {
      for (const [id, node] of Object.entries(RESOURCE_NODES)) {
        expect(node.id).toBe(id);
        expect(node.name).toBeDefined();
        expect(node.icon).toBeDefined();
        expect(typeof node.scale).toBe("number");
        expect(typeof node.threshold).toBe("number");
        expect(typeof node.amount).toBe("number");
        expect(Array.isArray(node.allowedBiomes)).toBe(true);
        expect(node.allowedBiomes.length).toBeGreaterThan(0);
        expect(Array.isArray(node.default_drops)).toBe(true);
        expect(node.default_drops.length).toBeGreaterThan(0);
      }
    });

    it("should have valid drop table entries with item and weight", () => {
      for (const node of Object.values(RESOURCE_NODES)) {
        for (const drop of node.default_drops) {
          expect(typeof drop.item).toBe("string");
          expect(typeof drop.weight).toBe("number");
          expect(drop.weight).toBeGreaterThan(0);
        }
        if (node.biome_drops) {
          for (const drops of Object.values(node.biome_drops)) {
            for (const drop of drops) {
              expect(typeof drop.item).toBe("string");
              expect(typeof drop.weight).toBe("number");
              expect(drop.weight).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it("should have biome drops only for allowed biomes", () => {
      for (const node of Object.values(RESOURCE_NODES)) {
        if (node.biome_drops) {
          for (const biome of Object.keys(node.biome_drops)) {
            expect(node.allowedBiomes).toContain(biome);
          }
        }
      }
    });
  });
});
