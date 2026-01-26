import { describe, it, expect, vi, beforeEach } from "vitest";
import { Inventory } from "./Inventory";

describe("Inventory Core Logic", () => {
  let inventory;
  let mockUpdate;
  let mockItemAdded;

  beforeEach(() => {
    mockUpdate = vi.fn();
    mockItemAdded = vi.fn();
    inventory = new Inventory(mockUpdate, mockItemAdded);
  });

  describe("Item Management", () => {
    it("should add items and update count", () => {
      inventory.addItem("wood", 10);
      expect(inventory.getCount("wood")).toBe(10);
      expect(inventory.items["wood"]).toBe(10);

      inventory.addItem("wood", 5);
      expect(inventory.getCount("wood")).toBe(15);
    });

    it("should initialize count to 0 for new items", () => {
      expect(inventory.getCount("gold")).toBe(0);
    });

    it("should trigger callbacks when adding items", () => {
      inventory.addItem("stone", 1);

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockItemAdded).toHaveBeenCalledWith("stone", 1);
    });
  });

  describe("Removing Items", () => {
    beforeEach(() => {
      inventory.addItem("iron", 10);
      vi.clearAllMocks(); // Clear add calls
    });

    it("should remove items when available", () => {
      const success = inventory.removeItem("iron", 4);

      expect(success).toBe(true);
      expect(inventory.getCount("iron")).toBe(6);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should return false and not remove if insufficient quantity", () => {
      const success = inventory.removeItem("iron", 20);

      expect(success).toBe(false);
      expect(inventory.getCount("iron")).toBe(10); // Unchanged
      // Assuming it shouldn't trigger update if fail
      // The code: calls removeItem -> if fail returns false immediately.
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should return false if item does not exist", () => {
      const success = inventory.removeItem("diamond", 1);
      expect(success).toBe(false);
    });
  });

  describe("Persistence", () => {
    it("should load data correctly", () => {
      const saveData = {
        items: { coal: 50, copper: 20 },
      };

      inventory.loadData(saveData);

      expect(inventory.getCount("coal")).toBe(50);
      expect(inventory.getCount("copper")).toBe(20);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
