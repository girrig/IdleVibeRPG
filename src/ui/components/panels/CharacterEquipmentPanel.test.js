// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterEquipmentPanel } from "./CharacterEquipmentPanel";

vi.mock("../../../core/ItemRegistry", () => ({
  ITEM_DEFINITIONS: {
    iron_helmet: { name: "Iron Helmet", icon: "🪖" },
    iron_sword: { name: "Iron Sword", icon: "⚔️" },
    wooden_shield: { name: "Wooden Shield", icon: "🛡️" },
  },
}));

describe("CharacterEquipmentPanel", () => {
  let container;

  const emptyEquipment = {
    head: null,
    chest: null,
    belt: null,
    gloves: null,
    legs: null,
    feet: null,
    mainHand: null,
    offHand: null,
    ring1: null,
    ring2: null,
    trinket1: null,
    trinket2: null,
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
  });

  describe("render", () => {
    it("should append equipment section to container", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      expect(container.querySelector(".char-equip-section")).not.toBeNull();
    });

    it("should display section title", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      expect(container.querySelector(".section-title").textContent).toBe(
        "Equipment",
      );
    });

    it("should render all 12 equipment slots", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      const slots = container.querySelectorAll(".mini-slot");
      expect(slots).toHaveLength(12);
    });

    it("should render slots with correct data-slot attributes", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      const slotNames = Array.from(
        container.querySelectorAll(".mini-slot"),
      ).map((el) => el.dataset.slot);

      expect(slotNames).toContain("head");
      expect(slotNames).toContain("chest");
      expect(slotNames).toContain("mainHand");
      expect(slotNames).toContain("offHand");
      expect(slotNames).toContain("ring1");
      expect(slotNames).toContain("ring2");
      expect(slotNames).toContain("trinket1");
      expect(slotNames).toContain("trinket2");
    });

    it("should show default icons when no items equipped", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      const headSlot = container.querySelector('[data-slot="head"]');
      expect(headSlot.title).toBe("Head");
      expect(headSlot.classList.contains("equipped")).toBe(false);
    });

    it("should show item icon and name when equipped", () => {
      const char = {
        equipment: { ...emptyEquipment, head: "iron_helmet" },
      };

      CharacterEquipmentPanel.render(container, char);

      const headSlot = container.querySelector('[data-slot="head"]');
      expect(headSlot.title).toBe("Iron Helmet");
      expect(headSlot.classList.contains("equipped")).toBe(true);
    });
  });

  describe("update", () => {
    it("should update slot when item is equipped", () => {
      const char = { equipment: { ...emptyEquipment } };

      CharacterEquipmentPanel.render(container, char);

      // Equip a sword
      char.equipment.mainHand = "iron_sword";
      CharacterEquipmentPanel.update(container, char);

      const slot = container.querySelector('[data-slot="mainHand"]');
      expect(slot.title).toBe("Iron Sword");
      expect(slot.classList.contains("equipped")).toBe(true);
    });

    it("should reset slot when item is unequipped", () => {
      const char = {
        equipment: { ...emptyEquipment, head: "iron_helmet" },
      };

      CharacterEquipmentPanel.render(container, char);

      // Unequip
      char.equipment.head = null;
      CharacterEquipmentPanel.update(container, char);

      const headSlot = container.querySelector('[data-slot="head"]');
      expect(headSlot.title).toBe("Head");
      expect(headSlot.classList.contains("equipped")).toBe(false);
    });

    it("should not throw when char is null", () => {
      const char = { equipment: { ...emptyEquipment } };
      CharacterEquipmentPanel.render(container, char);

      // Should not throw
      CharacterEquipmentPanel.update(container, null);
    });

    it("should not throw when equip section is missing", () => {
      const emptyContainer = document.createElement("div");

      // Should not throw
      CharacterEquipmentPanel.update(emptyContainer, {
        equipment: emptyEquipment,
      });
    });

    it("should handle unknown item gracefully", () => {
      const char = {
        equipment: { ...emptyEquipment, head: "unknown_item" },
      };

      CharacterEquipmentPanel.render(container, char);

      // Slot should still exist but not crash
      const headSlot = container.querySelector('[data-slot="head"]');
      expect(headSlot).not.toBeNull();
    });
  });
});
