// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EquipmentView } from "./EquipmentView";

vi.mock("../../core/GameState", () => ({
  gameState: {
    characters: [{ name: "Gromheart" }],
    inventory: {
      items: {},
    },
  },
}));

vi.mock("../../core/ItemRegistry", () => ({
  ITEM_DEFINITIONS: {
    copper_ore: { name: "Copper Ore", icon: "🪨" },
    iron_ore: { name: "Iron Ore", icon: "⛏️" },
    wood: { name: "Wood", icon: "🪵" },
  },
}));

vi.mock("../../utils/formatters", () => ({
  formatNumber: (n) => n.toString(),
}));

import { gameState } from "../../core/GameState";

describe("EquipmentView", () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    gameState.characters = [{ name: "Gromheart" }];
    gameState.inventory.items = {};
    view = new EquipmentView();
  });

  it("should render equipment layout with slots", () => {
    view.render(container, 0);

    expect(container.querySelector(".equipment-layout")).not.toBeNull();
    expect(container.querySelector('[data-slot="head"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="chest"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="mainHand"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="offHand"]')).not.toBeNull();
  });

  it("should display character name", () => {
    view.render(container, 0);

    const name = container.querySelector(".equip-char-name");
    expect(name.textContent).toBe("Gromheart");
  });

  it("should render inventory grid with items", () => {
    gameState.inventory.items = { copper_ore: 50, iron_ore: 30 };

    view.render(container, 0);

    const cards = container.querySelectorAll(".inv-card");
    expect(cards).toHaveLength(2);

    // Sorted by count descending
    expect(cards[0].dataset.id).toBe("copper_ore");
    expect(cards[1].dataset.id).toBe("iron_ore");
  });

  it("should show empty message when no items", () => {
    gameState.inventory.items = {};

    view.render(container, 0);

    const grid = container.querySelector(".inventory-grid");
    expect(grid.textContent).toContain("No items");
  });

  it("should filter out zero-count items", () => {
    gameState.inventory.items = { copper_ore: 10, wood: 0 };

    view.render(container, 0);

    const cards = container.querySelectorAll(".inv-card");
    expect(cards).toHaveLength(1);
    expect(cards[0].dataset.id).toBe("copper_ore");
  });

  describe("updateInventoryGrid", () => {
    it("should remove cards for items that no longer exist", () => {
      gameState.inventory.items = { copper_ore: 10, iron_ore: 5 };
      view.render(container, 0);
      expect(container.querySelectorAll(".inv-card")).toHaveLength(2);

      // Remove iron_ore
      gameState.inventory.items = { copper_ore: 10 };
      view.updateInventoryGrid();

      expect(container.querySelectorAll(".inv-card")).toHaveLength(1);
      expect(container.querySelector(".inv-card").dataset.id).toBe(
        "copper_ore",
      );
    });

    it("should add cards for new items", () => {
      gameState.inventory.items = { copper_ore: 10 };
      view.render(container, 0);
      expect(container.querySelectorAll(".inv-card")).toHaveLength(1);

      // Add wood
      gameState.inventory.items = { copper_ore: 10, wood: 5 };
      view.updateInventoryGrid();

      expect(container.querySelectorAll(".inv-card")).toHaveLength(2);
    });

    it("should update character name on update", () => {
      view.render(container, 0);

      gameState.characters[0].name = "NewName";
      view.update();

      const name = container.querySelector(".equip-char-name");
      expect(name.innerText).toBe("NewName");
    });
  });
});
