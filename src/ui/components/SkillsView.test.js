// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SkillsView } from "./SkillsView";

vi.mock("../../core/GameState", () => ({
  gameState: {
    characters: [
      {
        skills: {
          mining: { level: 5, xp: 100 },
          exploring: { level: 3, xp: 50 },
          fighting: { level: 2, xp: 20 },
          smithing: { level: 1, xp: 0 },
        },
      },
    ],
    availableResources: {},
    getAvailableResourceCount: vi.fn(() => 0),
  },
}));

vi.mock("../../core/SkillRegistry", () => ({
  SKILL_DEFINITIONS: {
    MINING: {
      id: "MINING",
      name: "Mining",
      icon: "⛏️",
      color: "#c0a060",
      interval: 3000,
      options: {
        mine_minerals: {
          name: "Mine Minerals",
          icon: "🪨",
          level: 1,
          xp: 10,
          resourceId: "mineral_node",
        },
      },
    },
    EXPLORING: {
      id: "EXPLORING",
      name: "Exploring",
      icon: "🧭",
      color: "#88cc88",
      interval: 3000,
      options: {
        wander_expansion: {
          name: "Expand Map",
          icon: "🗺️",
          description: "Wander and explore",
          xp: 5,
          level: 1,
        },
        find_desert: {
          name: "Find Desert",
          icon: "🏜️",
          level: 5,
          xp: 15,
        },
        find_forest: {
          name: "Find Forest",
          icon: "🌲",
          level: 1,
          xp: 10,
        },
      },
    },
    FIGHTING: {
      id: "FIGHTING",
      name: "Fighting",
      icon: "⚔️",
      color: "#cc4444",
      interval: 3000,
      options: {
        fight_rat: {
          name: "Fight Rat",
          icon: "🐀",
          level: 1,
          xp: 10,
          category: "Outskirts",
          drops: [
            { item: "rat_tail", weight: 80 },
            { item: "rat_bone", weight: 20 },
          ],
        },
      },
    },
    SMITHING: {
      id: "SMITHING",
      name: "Smithing",
      icon: "🔨",
      color: "#ff8800",
      interval: 3000,
      options: {
        smelt_copper: {
          name: "Smelt Copper",
          icon: "🟫",
          level: 1,
          xp: 15,
          cost: { copper_ore: 2 },
        },
      },
    },
  },
}));

vi.mock("../../core/ItemRegistry", () => ({
  getItemDefinition: (id) => {
    const defs = {
      rat_tail: { name: "Rat Tail", icon: "🐁" },
      rat_bone: { name: "Rat Bone", icon: "🦴" },
      copper_ore: { name: "Copper Ore", icon: "🪨" },
    };
    return defs[id] || { name: id, icon: "❓" };
  },
}));

vi.mock("../../core/Constants", () => ({
  UI_COLORS: { COST: "#f87171" },
  GAME_CONFIG: { DEFAULT_SKILL_INTERVAL: 3000 },
  RESOURCE_NODES: {
    mineral_node: {
      name: "Minerals",
      allowedBiomes: ["DESERT"],
      default_drops: [{ item: "copper_ore", weight: 100 }],
    },
  },
}));

vi.mock("../../core/TerrainTypes", () => ({
  TERRAIN_TYPES: {
    DESERT: { id: "DESERT", symbol: "🏜️" },
  },
}));

import { gameState } from "../../core/GameState";

describe("SkillsView", () => {
  let view;
  let container;
  let mockUiManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    mockUiManager = {
      selectedCharIndex: 0,
      renderMainWindow: vi.fn(),
      handleSkillAction: vi.fn(),
    };
    view = new SkillsView(mockUiManager);
  });

  describe("hexToRgb", () => {
    it("should convert full hex to rgb string", () => {
      expect(view.hexToRgb("#ff0000")).toContain("255, 0, 0");
    });

    it("should convert shorthand hex", () => {
      expect(view.hexToRgb("#f00")).toContain("255, 0, 0");
    });

    it("should handle hex without #", () => {
      expect(view.hexToRgb("00ff00")).toContain("0, 255, 0");
    });

    it("should return fallback for invalid hex", () => {
      expect(view.hexToRgb("invalid")).toBe("255, 255, 255");
    });
  });

  describe("toggleCategory", () => {
    it("should add category to expanded set", () => {
      view.toggleCategory("Outskirts");
      expect(view.expandedCategories.has("Outskirts")).toBe(true);
    });

    it("should remove category from expanded set on second toggle", () => {
      view.expandedCategories.add("Outskirts");
      view.toggleCategory("Outskirts");
      expect(view.expandedCategories.has("Outskirts")).toBe(false);
    });

    it("should call renderMainWindow after toggle", () => {
      view.toggleCategory("Outskirts");
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });
  });

  describe("render", () => {
    it("should render skill sidebar with sorted skills", () => {
      view.render(container);

      const tabs = container.querySelectorAll(".skill-category-tab");
      expect(tabs.length).toBe(4);

      const names = Array.from(
        container.querySelectorAll(".tab-name"),
      ).map((el) => el.textContent);
      // Alphabetical: Exploring, Fighting, Mining, Smithing
      expect(names).toEqual(["Exploring", "Fighting", "Mining", "Smithing"]);
    });

    it("should default to first skill tab", () => {
      view.render(container);

      const activeTab = container.querySelector(".skill-category-tab.active");
      expect(activeTab).not.toBeNull();
      expect(activeTab.textContent).toContain("Exploring");
    });

    it("should render exploration view when Exploring is active", () => {
      view.activeSkillTab = "EXPLORING";
      view.render(container);

      expect(container.textContent).toContain("Exploring");
      expect(container.querySelector(".exploration-container")).not.toBeNull();
    });

    it("should show biome cards in exploration view", () => {
      view.activeSkillTab = "EXPLORING";
      view.render(container);

      const biomeCards = container.querySelectorAll(".biome-card");
      expect(biomeCards.length).toBe(2); // find_desert and find_forest
    });

    it("should lock biomes above character level", () => {
      view.activeSkillTab = "EXPLORING";
      view.render(container);

      // find_desert requires level 5, char is level 3
      const biomeCards = container.querySelectorAll(".biome-card");
      const desertCard = Array.from(biomeCards).find((c) =>
        c.textContent.includes("Find Desert"),
      );
      expect(desertCard.classList.contains("locked-overlay")).toBe(true);
    });
  });

  describe("renderFightingSkillView", () => {
    it("should group options by category", () => {
      view.activeSkillTab = "FIGHTING";
      view.render(container);

      // Fighting view should show category headers
      expect(container.textContent).toContain("Outskirts");
    });

    it("should show collapsed categories by default", () => {
      view.activeSkillTab = "FIGHTING";
      view.render(container);

      // Grid should not be rendered when collapsed
      const grid = container.querySelector(
        ".fighting-container .skills-actions-grid",
      );
      expect(grid).toBeNull();
    });

    it("should show skill cards when category is expanded", () => {
      view.expandedCategories.add("Outskirts");
      view.activeSkillTab = "FIGHTING";
      view.render(container);

      const grid = container.querySelector(
        ".fighting-container .skills-actions-grid",
      );
      expect(grid).not.toBeNull();
      expect(grid.textContent).toContain("Fight Rat");
    });
  });

  describe("renderGenericSkillView", () => {
    it("should render smithing with cost requirements", () => {
      view.activeSkillTab = "SMITHING";
      view.render(container);

      expect(container.textContent).toContain("Smelt Copper");
      expect(container.textContent).toContain("Requires:");
      expect(container.textContent).toContain("Copper Ore");
    });
  });

  describe("renderGatheringSkillView", () => {
    it("should render gathering cards with biome info", () => {
      gameState.availableResources = { "mineral_node:DESERT": 3 };
      view.activeSkillTab = "MINING";
      view.render(container);

      expect(container.textContent).toContain("DESERT Minerals");
      expect(container.textContent).toContain("Available:");
    });
  });

  describe("generateAvailableResourceHtml", () => {
    it("should aggregate resources across biomes", () => {
      gameState.availableResources = {
        "mineral_node:DESERT": 5,
      };

      const result = view.generateAvailableResourceHtml("mineral_node");
      expect(result.totalCount).toBe(5);
      expect(result.html).toContain("5");
    });

    it("should return zero when no resources available", () => {
      gameState.availableResources = {};
      gameState.getAvailableResourceCount.mockReturnValue(0);

      const result = view.generateAvailableResourceHtml("mineral_node");
      expect(result.totalCount).toBe(0);
    });

    it("should skip biomes with zero count", () => {
      gameState.availableResources = {
        "mineral_node:DESERT": 0,
      };
      gameState.getAvailableResourceCount.mockReturnValue(0);

      const result = view.generateAvailableResourceHtml("mineral_node");
      expect(result.totalCount).toBe(0);
    });
  });

  describe("update", () => {
    it("should do nothing when no active tab", () => {
      view.activeSkillTab = null;
      // Should not throw
      view.update(container);
    });

    it("should update exploration view level", () => {
      view.activeSkillTab = "EXPLORING";
      view.render(container);

      gameState.characters[0].skills.exploring.level = 10;
      view.update(container);

      const headerLvl = container.querySelector(".header-lvl");
      expect(headerLvl.innerText).toContain("10");
    });

    it("should update gathering view level and grid", () => {
      gameState.availableResources = { "mineral_node:DESERT": 3 };
      view.activeSkillTab = "MINING";
      view.render(container);

      gameState.characters[0].skills.mining.level = 10;
      view.update(container);

      const headerLvl = container.querySelector(".header-lvl");
      expect(headerLvl.innerText).toContain("10");
    });

    it("should update generic skill view level", () => {
      view.activeSkillTab = "SMITHING";
      view.render(container);

      gameState.characters[0].skills.smithing.level = 5;
      view.update(container);

      const headerLvl = container.querySelector(".header-lvl");
      expect(headerLvl.innerText).toContain("5");
    });

    it("should update lock state for skill cards on level change", () => {
      view.activeSkillTab = "SMITHING";
      view.render(container);

      // Initially level 1 - card with level 1 req should not be locked
      const card = container.querySelector(".skill-action-card");
      expect(card.classList.contains("locked")).toBe(false);
    });

    it("should update exploration biome lock state on level up", () => {
      // Start at level 5 so desert is unlocked, forest is unlocked
      gameState.characters[0].skills.exploring.level = 5;
      view.activeSkillTab = "EXPLORING";
      view.render(container);

      // find_desert requires level 5, exploring is level 5 -> unlocked
      const biomeCards = container.querySelectorAll(".biome-card");
      const desertCard = Array.from(biomeCards).find(c => c.textContent.includes("Find Desert"));
      expect(desertCard.classList.contains("locked-overlay")).toBe(false);

      // Drop to level 3 -> should re-lock
      gameState.characters[0].skills.exploring.level = 3;
      view.update(container);

      const updatedCards = container.querySelectorAll(".biome-card");
      const updatedDesert = Array.from(updatedCards).find(c => c.textContent.includes("Find Desert"));
      expect(updatedDesert.classList.contains("locked-overlay")).toBe(true);
    });
  });

  describe("skill card click handler", () => {
    it("should call handleSkillAction for unlocked cards", () => {
      view.activeSkillTab = "SMITHING";
      view.render(container);

      const card = container.querySelector(".skill-action-card");
      card.click();

      expect(mockUiManager.handleSkillAction).toHaveBeenCalledWith("SMITHING", "smelt_copper");
    });
  });

  describe("sidebar tab switching", () => {
    it("should switch active tab when sidebar item clicked", () => {
      view.render(container);

      const tabs = container.querySelectorAll(".skill-category-tab");
      // Click Mining tab (should be 3rd alphabetically: Exploring, Fighting, Mining, Smithing)
      tabs[2].click();

      expect(view.activeSkillTab).toBe("MINING");
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });
  });
});
