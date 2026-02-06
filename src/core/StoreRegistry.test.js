import { describe, it, expect } from "vitest";
import { STORE_DEFINITIONS, getStoreDefinition } from "./StoreRegistry";

describe("StoreRegistry", () => {
  describe("STORE_DEFINITIONS", () => {
    it("should define general_store and blacksmith", () => {
      expect(STORE_DEFINITIONS).toHaveProperty("general_store");
      expect(STORE_DEFINITIONS).toHaveProperty("blacksmith");
    });

    it("should have required fields on each store", () => {
      for (const [id, store] of Object.entries(STORE_DEFINITIONS)) {
        expect(store.name).toBeDefined();
        expect(store.icon).toBeDefined();
        expect(store.description).toBeDefined();
        expect(Array.isArray(store.items)).toBe(true);
        expect(store.items.length).toBeGreaterThan(0);
      }
    });

    it("should have id and price on each store item", () => {
      for (const store of Object.values(STORE_DEFINITIONS)) {
        for (const item of store.items) {
          expect(item.id).toBeDefined();
          expect(typeof item.id).toBe("string");
          expect(item.price).toBeDefined();
          expect(typeof item.price).toBe("number");
          expect(item.price).toBeGreaterThan(0);
        }
      }
    });

    it("general_store should contain expected items", () => {
      const ids = STORE_DEFINITIONS.general_store.items.map((i) => i.id);
      expect(ids).toContain("copper_ore");
      expect(ids).toContain("iron_ore");
      expect(ids).toContain("coal");
    });

    it("blacksmith should contain bar items", () => {
      const ids = STORE_DEFINITIONS.blacksmith.items.map((i) => i.id);
      expect(ids).toContain("copper_bar");
      expect(ids).toContain("iron_bar");
    });
  });

  describe("getStoreDefinition", () => {
    it("should return the correct store for a valid id", () => {
      const store = getStoreDefinition("general_store");
      expect(store).toBe(STORE_DEFINITIONS.general_store);
      expect(store.name).toBe("General Store");
    });

    it("should return undefined for an invalid id", () => {
      expect(getStoreDefinition("nonexistent")).toBeUndefined();
    });
  });
});
