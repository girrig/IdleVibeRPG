// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StoreView } from "./StoreView";

vi.mock("../../core/StoreRegistry", () => ({
  STORE_DEFINITIONS: {
    general_store: {
      name: "General Store",
      icon: "🏪",
      description: "Buy basic resources here.",
      items: [
        { id: "copper_ore", price: 5 },
        { id: "iron_ore", price: 10 },
      ],
    },
    blacksmith: {
      name: "Blacksmith",
      icon: "🔨",
      description: "Get your metal bars here!",
      items: [{ id: "copper_bar", price: 15 }],
    },
  },
}));

vi.mock("../../core/ItemRegistry", () => ({
  getItemDefinition: (id) => {
    const defs = {
      copper_ore: { name: "Copper Ore", icon: "🪨" },
      iron_ore: { name: "Iron Ore", icon: "⛏️" },
      copper_bar: { name: "Copper Bar", icon: "🟫" },
    };
    return defs[id] || { name: id, icon: "❓" };
  },
}));

vi.mock("../../core/GameState", () => ({
  gameState: {
    inventory: {
      items: {},
      getCount: vi.fn(),
      removeItem: vi.fn(),
      addItem: vi.fn(),
    },
  },
}));

import { gameState } from "../../core/GameState";

describe("StoreView", () => {
  let view;
  let container;
  let mockUiManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    mockUiManager = {
      renderMainWindow: vi.fn(),
      showNotification: vi.fn(),
    };
    gameState.inventory.items = { coins: 100 };
    gameState.inventory.getCount.mockImplementation(
      (id) => gameState.inventory.items[id] || 0,
    );
    view = new StoreView(mockUiManager);
  });

  it("should render store sidebar with store list", () => {
    view.render(container);

    const sidebar = container.querySelector(".store-sidebar-list");
    expect(sidebar).not.toBeNull();

    const items = sidebar.querySelectorAll(".store-list-item");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("General Store");
    expect(items[1].textContent).toContain("Blacksmith");
  });

  it("should select first store by default", () => {
    view.render(container);
    expect(view.currentStoreId).toBe("general_store");

    const activeItem = container.querySelector(".store-list-item.active");
    expect(activeItem).not.toBeNull();
    expect(activeItem.textContent).toContain("General Store");
  });

  it("should render store items in the detail panel", () => {
    view.render(container);

    const panel = container.querySelector(".store-detail-panel");
    const cards = panel.querySelectorAll(".store-item-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("Copper Ore");
    expect(cards[0].textContent).toContain("5 Coins");
  });

  it("should display wallet with coin count", () => {
    view.render(container);
    const wallet = container.querySelector(".wallet-display");
    expect(wallet.textContent).toContain("100");
  });

  describe("buyItem", () => {
    it("should buy item when player has enough coins", () => {
      view.buyItem("copper_ore", 5, "Copper Ore");

      expect(gameState.inventory.removeItem).toHaveBeenCalledWith("coins", 5);
      expect(gameState.inventory.addItem).toHaveBeenCalledWith(
        "copper_ore",
        1,
      );
      expect(mockUiManager.showNotification).toHaveBeenCalledWith(
        "Bought Copper Ore",
        "success",
      );
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });

    it("should show error when player has insufficient coins", () => {
      gameState.inventory.items = { coins: 3 };

      view.buyItem("copper_ore", 5, "Copper Ore");

      expect(gameState.inventory.removeItem).not.toHaveBeenCalled();
      expect(gameState.inventory.addItem).not.toHaveBeenCalled();
      expect(mockUiManager.showNotification).toHaveBeenCalledWith(
        "Not enough coins!",
        "error",
      );
    });

    it("should buy item when coins exactly match price", () => {
      gameState.inventory.items = { coins: 10 };

      view.buyItem("iron_ore", 10, "Iron Ore");

      expect(gameState.inventory.removeItem).toHaveBeenCalledWith("coins", 10);
      expect(gameState.inventory.addItem).toHaveBeenCalledWith("iron_ore", 1);
    });

    it("should show error when player has zero coins", () => {
      gameState.inventory.items = {};

      view.buyItem("copper_ore", 5, "Copper Ore");

      expect(gameState.inventory.removeItem).not.toHaveBeenCalled();
      expect(mockUiManager.showNotification).toHaveBeenCalledWith(
        "Not enough coins!",
        "error",
      );
    });
  });

  it("should switch store when sidebar item is clicked", () => {
    view.render(container);

    const items = container.querySelectorAll(".store-list-item");
    items[1].click(); // Click Blacksmith

    expect(view.currentStoreId).toBe("blacksmith");
    expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
  });
});
