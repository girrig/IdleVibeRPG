// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryView } from "./InventoryView";

// Mock Dependencies
vi.mock("../../core/GameState", () => ({
  gameState: {
    inventory: {
      items: {},
      getCount: vi.fn((id) => 0),
      removeItem: vi.fn(),
      addItem: vi.fn(),
    }, // Will be populated in beforeEach
    triggerNotification: vi.fn(),
  },
}));

vi.mock("../../core/ItemRegistry", () => ({
  ITEM_DEFINITIONS: {
    wood: { name: "Wood", icon: "🪵", value: 10 },
    stone: { name: "Stone", icon: "🪨", value: 5 },
  },
  getItemDefinition: (id) => {
    // Logic from real file simplified
    const defs = {
      wood: { name: "Wood", icon: "🪵", value: 10 },
      stone: { name: "Stone", icon: "🪨", value: 5 },
    };
    return defs[id] || { name: id, icon: "?" };
  },
}));

vi.mock("../../utils/formatters", () => ({
  formatNumber: (n) => n.toString(),
}));

import { gameState } from "../../core/GameState";

describe("InventoryView", () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");

    // Setup Mock Inventory Data
    gameState.inventory.items = {
      wood: 100,
      stone: 50,
      air: 0, // Should be filtered out
    };
    gameState.inventory.getCount.mockImplementation(
      (id) => gameState.inventory.items[id] || 0,
    );

    view = new InventoryView();
  });

  it("should render full layout on first call", () => {
    view.render(container);

    expect(container.classList.contains("inventory-split-layout")).toBe(true);
    expect(container.querySelector(".inventory-grid")).not.toBeNull();
    expect(container.querySelector(".inventory-detail-sidebar")).not.toBeNull();
  });

  it("should render items correctly in the grid", () => {
    view.render(container);

    const grid = container.querySelector(".inventory-grid");
    const cards = grid.querySelectorAll(".inv-card");

    // wood (100) and stone (50). Air (0) should be hidden.
    expect(cards).toHaveLength(2);

    // Check specific card content (Wood should be first due to sort by count)
    const firstCard = cards[0];
    expect(firstCard.dataset.id).toBe("wood");
    expect(firstCard.textContent).toContain("Wood");
    expect(firstCard.textContent).toContain("100");
  });

  it("should update sidebar when an item is selected", () => {
    view.render(container);
    const grid = container.querySelector(".inventory-grid");
    const woodCard = grid.querySelector('.inv-card[dataset-id="wood"]');

    // Simulate click on Wood
    // Note: click handler is on the element itself
    // Access view internals or simulate DOM click

    // We can simulate DOM Click
    const cards = grid.querySelectorAll(".inv-card");
    cards[0].click(); // Wood

    // Sidebar should now show Wood details
    const sidebar = container.querySelector(".inventory-detail-sidebar");
    expect(sidebar.innerHTML).toContain("Wood");
    expect(sidebar.innerHTML).toContain("Sell 1");
  });

  it("should handle empty inventory", () => {
    gameState.inventory.items = {};
    view.render(container);

    const grid = container.querySelector(".inventory-grid");
    expect(grid.textContent).toContain("No items");
  });
});
