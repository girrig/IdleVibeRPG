// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SkillsView } from "./SkillsView";

vi.mock("../../core/GameState", () => ({
  gameState: {
    characters: [
      {
        skills: {
          mining: { level: 5, xp: 100 },
          woodcutting: { level: 1, xp: 0 },
          fishing: { level: 1, xp: 0 },
          foraging: { level: 1, xp: 0 },
          exploring: { level: 3, xp: 50 },
          fighting: { level: 2, xp: 20 },
          smithing: { level: 1, xp: 0 },
        },
      },
    ],
    availableResources: {},
    getAvailableResourceCount: vi.fn(() => 0),
    discoveries: new Set([
      "monster:fight_rat",
      "node:mineral_node", "node:tree_node",
      "recipe:smelt_copper",
      "biome:FOREST",
      "item:copper_ore", "item:iron_ore", "item:coal",
      "item:rat_tail", "item:rat_bone", "item:oak_log",
    ]),
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
    WOODCUTTING: {
      id: "WOODCUTTING",
      name: "Woodcutting",
      icon: "🪓",
      interval: 3000,
      options: {
        chop_wood: {
          name: "Chop Wood",
          icon: "🌲",
          level: 1,
          xp: 20,
          resourceId: "tree_node",
        },
      },
    },
    FISHING: {
      id: "FISHING",
      name: "Fishing",
      icon: "🎣",
      interval: 3000,
      options: {},
    },
    FORAGING: {
      id: "FORAGING",
      name: "Foraging",
      icon: "🍃",
      interval: 3000,
      options: {},
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
          biomeId: "DESERT",
        },
        find_forest: {
          name: "Find Forest",
          icon: "🌲",
          level: 1,
          xp: 10,
          biomeId: "FOREST",
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
        fight_goblin: {
          name: "Fight Goblin",
          icon: "👹",
          level: 5,
          xp: 20,
          category: "Outskirts",
          drops: [
            { item: "goblin_mail", weight: 100 },
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
        smelt_iron: {
          name: "Smelt Iron",
          icon: "⬜",
          level: 5,
          xp: 30,
          cost: { iron_ore: 1, coal: 1 },
        },
      },
    },
  },
}));

vi.mock("../../core/ItemRegistry", () => ({
  ITEM_DEFINITIONS: {
    copper_ore: { name: "Copper Ore", icon: "🟠", value: 5, category: "Ore" },
    iron_ore: { name: "Iron Ore", icon: "⬛", value: 10, category: "Ore" },
    coal: { name: "Coal", icon: "⚫", value: 8, category: "Ore" },
    rat_tail: { name: "Rat Tail", icon: "🐁", value: 2, category: "Drop" },
    rat_bone: { name: "Rat Bone", icon: "🦴", value: 3, category: "Drop" },
    goblin_mail: { name: "Goblin Mail", icon: "📬", value: 15, category: "Drop" },
    oak_log: { name: "Oak Log", icon: "🪵", value: 4, category: "Log" },
    coins: { name: "Coins", icon: "🪙", value: 1, category: "Currency" },
  },
  getItemDefinition: (id) => {
    const defs = {
      copper_ore: { name: "Copper Ore", icon: "🟠" },
      iron_ore: { name: "Iron Ore", icon: "⬛" },
      coal: { name: "Coal", icon: "⚫" },
      rat_tail: { name: "Rat Tail", icon: "🐁" },
      rat_bone: { name: "Rat Bone", icon: "🦴" },
      goblin_mail: { name: "Goblin Mail", icon: "📬" },
      oak_log: { name: "Oak Log", icon: "🪵" },
    };
    return defs[id] || { name: id, icon: "❓" };
  },
}));

vi.mock("../../core/Constants", () => ({
  GAME_CONFIG: { DEFAULT_SKILL_INTERVAL: 3000 },
  RESOURCE_NODES: {
    mineral_node: {
      name: "Mineral Vein",
      icon: "⛏️",
      amount: 25,
      allowedBiomes: ["DESERT", "FOREST"],
      default_drops: [{ item: "copper_ore", weight: 80 }, { item: "iron_ore", weight: 20 }],
    },
    tree_node: {
      name: "Forest Patch",
      icon: "🌲",
      amount: 50,
      allowedBiomes: ["FOREST"],
      default_drops: [{ item: "oak_log", weight: 100 }],
    },
  },
}));

vi.mock("../../core/TerrainTypes", () => ({
  TERRAIN_TYPES: {
    DESERT: { id: "DESERT", name: "Desert", symbol: "🏜️", color: "#c2b280" },
    FOREST: { id: "FOREST", name: "Forest", symbol: "🌳", color: "#228b22" },
    OCEAN: { id: "OCEAN", name: "Ocean", symbol: "🌊", color: "#0077be" },
  },
}));

vi.mock("../../core/SourceRegistry", () => ({
  sourceRegistry: {
    getSource: (itemId) => {
      const sources = {
        copper_ore: { type: "SKILL", skillId: "MINING", reqLevel: 1, detail: "Found in Mineral Vein" },
        iron_ore: { type: "SKILL", skillId: "MINING", reqLevel: 1, detail: "Found in Mineral Vein" },
        coal: { type: "SKILL", skillId: "MINING", reqLevel: 5 },
        rat_tail: { type: "SKILL", skillId: "FIGHTING", reqLevel: 1 },
        rat_bone: { type: "SKILL", skillId: "FIGHTING", reqLevel: 1 },
        goblin_mail: { type: "SKILL", skillId: "FIGHTING", reqLevel: 5 },
        oak_log: { type: "SKILL", skillId: "WOODCUTTING", reqLevel: 1, detail: "Found in Forest Patch" },
      };
      return sources[itemId];
    },
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
    };
    view = new SkillsView(mockUiManager);
    view.revealAll = false; // disable for tests that check locked behavior

    // Reset discoveries to defaults
    gameState.discoveries = new Set([
      "monster:fight_rat",
      "node:mineral_node", "node:tree_node",
      "recipe:smelt_copper",
      "biome:FOREST",
      "item:copper_ore", "item:iron_ore", "item:coal",
      "item:rat_tail", "item:rat_bone", "item:oak_log",
    ]);
  });

  describe("sidebar", () => {
    it("should render 5 category tabs", () => {
      view.render(container);

      const tabs = container.querySelectorAll(".skill-category-tab");
      expect(tabs.length).toBe(5);

      const names = Array.from(container.querySelectorAll(".tab-name")).map(el => el.textContent);
      expect(names).toEqual(["Monsters", "Nodes", "Recipes", "Biomes", "Items"]);
    });

    it("should default to first category (Monsters)", () => {
      view.render(container);

      expect(view.activeCategory).toBe("MONSTERS");
      const activeTab = container.querySelector(".skill-category-tab.active");
      expect(activeTab).not.toBeNull();
      expect(activeTab.textContent).toContain("Monsters");
    });

    it("should show completion counters on each tab", () => {
      view.render(container);

      const completions = container.querySelectorAll(".codex-completion");
      expect(completions.length).toBe(5);
    });

    it("should switch category on tab click", () => {
      view.render(container);

      const tabs = container.querySelectorAll(".skill-category-tab");
      tabs[2].click(); // Recipes

      expect(view.activeCategory).toBe("RECIPES");
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });
  });

  describe("renderMonstersView", () => {
    it("should render monster tiles from fighting options", () => {
      view.activeCategory = "MONSTERS";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards.length).toBe(2); // rat and goblin
    });

    it("should show discovered monsters and lock undiscovered ones", () => {
      // fight_rat is discovered, fight_goblin is not
      view.activeCategory = "MONSTERS";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards[0].textContent).toContain("Fight Rat");
      expect(cards[0].classList.contains("locked")).toBe(false);

      expect(cards[1].textContent).toContain("???");
      expect(cards[1].classList.contains("locked")).toBe(true);
    });

    it("should show completion counter in header", () => {
      view.activeCategory = "MONSTERS";
      view.render(container);

      expect(container.textContent).toContain("1/2 discovered");
    });
  });

  describe("renderNodesView", () => {
    it("should render node tiles from RESOURCE_NODES", () => {
      view.activeCategory = "NODES";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards.length).toBe(2); // mineral_node and tree_node
    });

    it("should show node names for unlocked nodes", () => {
      view.activeCategory = "NODES";
      view.render(container);

      expect(container.textContent).toContain("Mineral Vein");
      expect(container.textContent).toContain("Forest Patch");
    });
  });

  describe("renderRecipesView", () => {
    it("should render recipe tiles from smithing options", () => {
      view.activeCategory = "RECIPES";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards.length).toBe(2); // copper and iron
    });

    it("should lock undiscovered recipes", () => {
      // smelt_copper is discovered, smelt_iron is not
      view.activeCategory = "RECIPES";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards[0].textContent).toContain("Smelt Copper");
      expect(cards[0].classList.contains("locked")).toBe(false);

      expect(cards[1].textContent).toContain("???");
      expect(cards[1].classList.contains("locked")).toBe(true);
    });

    it("should show completion counter", () => {
      view.activeCategory = "RECIPES";
      view.render(container);

      expect(container.textContent).toContain("1/2 discovered");
    });
  });

  describe("renderBiomesView", () => {
    it("should render biome tiles for biomes with find_ options", () => {
      view.activeCategory = "BIOMES";
      view.render(container);

      // Only DESERT and FOREST have find_ options; OCEAN does not
      const cards = container.querySelectorAll(".skill-action-card");
      expect(cards.length).toBe(2);
    });

    it("should lock undiscovered biomes", () => {
      // FOREST is discovered, DESERT is not
      view.activeCategory = "BIOMES";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      const forestCard = Array.from(cards).find(c => c.textContent.includes("FOREST"));
      const desertCard = Array.from(cards).find(c => c.classList.contains("locked"));

      expect(forestCard).not.toBeNull();
      expect(desertCard).not.toBeNull();
      expect(desertCard.textContent).toContain("???");
    });
  });

  describe("renderItemsView", () => {
    it("should render item tiles excluding coins", () => {
      view.activeCategory = "ITEMS";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      // 7 items (coins filtered out)
      expect(cards.length).toBe(7);
    });

    it("should show discovered items and lock undiscovered ones", () => {
      // copper_ore is in discoveries, goblin_mail is not
      view.activeCategory = "ITEMS";
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      const copperCard = Array.from(cards).find(c => c.textContent.includes("Copper Ore"));
      expect(copperCard).not.toBeNull();
      expect(copperCard.classList.contains("locked")).toBe(false);

      const goblinCard = Array.from(cards).find(c => c.classList.contains("locked"));
      expect(goblinCard).not.toBeNull();
    });

    it("should show completion counter", () => {
      view.activeCategory = "ITEMS";
      view.render(container);

      expect(container.textContent).toContain("discovered");
    });
  });

  describe("codex detail popup", () => {
    afterEach(() => {
      const popup = document.querySelector(".game-modal.codex-popup");
      if (popup) popup.remove();
    });

    it("should open a popup when a monster card is clicked", () => {
      view.activeCategory = "MONSTERS";
      view.render(container);

      container.querySelector(".skill-action-card").click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      expect(popup.textContent).toContain("Fight Rat");
      expect(popup.textContent).toContain("Rat Tail");
      expect(popup.textContent).toContain("80%");
    });

    it("should open a popup with cost for recipes", () => {
      view.activeCategory = "RECIPES";
      view.render(container);

      container.querySelector(".skill-action-card").click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      expect(popup.textContent).toContain("Smelt Copper");
      expect(popup.textContent).toContain("Copper Ore");
    });

    it("should open a popup with drops for nodes", () => {
      view.activeCategory = "NODES";
      view.render(container);

      container.querySelector(".skill-action-card").click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      expect(popup.textContent).toContain("Mineral Vein");
      expect(popup.textContent).toContain("Copper Ore");
    });

    it("should open a popup with resources for biomes", () => {
      view.activeCategory = "BIOMES";
      view.render(container);

      // Click the unlocked biome (FOREST, lv1)
      const unlocked = Array.from(container.querySelectorAll(".skill-action-card"))
        .find(c => !c.classList.contains("locked"));
      unlocked.click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      // FOREST has mineral_node and tree_node
      expect(popup.textContent).toContain("Mineral Vein");
      expect(popup.textContent).toContain("Forest Patch");
    });

    it("should open a popup with source info for items", () => {
      view.activeCategory = "ITEMS";
      view.render(container);

      const copperCard = Array.from(container.querySelectorAll(".skill-action-card"))
        .find(c => c.textContent.includes("Copper Ore"));
      copperCard.click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      expect(popup.textContent).toContain("Mining");
      expect(popup.textContent).toContain("Found in Mineral Vein");
    });

    it("should close popup on close button click", () => {
      view.activeCategory = "MONSTERS";
      view.render(container);

      container.querySelector(".skill-action-card").click();
      expect(document.querySelector(".game-modal.codex-popup")).not.toBeNull();

      document.querySelector(".btn-close").click();
      expect(document.querySelector(".game-modal.codex-popup")).toBeNull();
    });

    it("should close popup on backdrop click", () => {
      view.activeCategory = "MONSTERS";
      view.render(container);

      container.querySelector(".skill-action-card").click();
      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();

      popup.click();
      expect(document.querySelector(".game-modal.codex-popup")).toBeNull();
    });
  });

  describe("completion counters", () => {
    it("should count monsters by discoveries", () => {
      const char = gameState.characters[0];
      // fight_rat discovered, fight_goblin not
      const result = view.getCategoryCompletion("MONSTERS", char);
      expect(result).toEqual({ discovered: 1, total: 2 });
    });

    it("should count recipes by discoveries", () => {
      const char = gameState.characters[0];
      // smelt_copper discovered, smelt_iron not
      const result = view.getCategoryCompletion("RECIPES", char);
      expect(result).toEqual({ discovered: 1, total: 2 });
    });

    it("should count biomes by discoveries", () => {
      const char = gameState.characters[0];
      // FOREST discovered, DESERT not
      const result = view.getCategoryCompletion("BIOMES", char);
      expect(result).toEqual({ discovered: 1, total: 2 });
    });

    it("should count nodes by discoveries", () => {
      const char = gameState.characters[0];
      // mineral_node and tree_node both discovered
      const result = view.getCategoryCompletion("NODES", char);
      expect(result).toEqual({ discovered: 2, total: 2 });
    });

    it("should count items by discoveries", () => {
      const char = gameState.characters[0];
      const result = view.getCategoryCompletion("ITEMS", char);
      // 7 non-currency items, goblin_mail not discovered
      expect(result.total).toBe(7);
      expect(result.discovered).toBe(6);
    });
  });

  describe("helper methods", () => {
    it("findResourceOption should find matching gathering skill option", () => {
      const result = view.findResourceOption("mineral_node");
      expect(result).not.toBeNull();
      expect(result.skillId).toBe("MINING");
      expect(result.option.name).toBe("Mine Minerals");
    });

    it("findResourceOption should return null for unknown resource", () => {
      const result = view.findResourceOption("nonexistent");
      expect(result).toBeNull();
    });

    it("findBiomeOption should find matching exploring option", () => {
      const result = view.findBiomeOption("DESERT");
      expect(result).not.toBeNull();
      expect(result.name).toBe("Find Desert");
      expect(result.level).toBe(5);
    });

    it("findBiomeOption should return null for biome without explore option", () => {
      const result = view.findBiomeOption("OCEAN");
      expect(result).toBeNull();
    });

    it("getResourcesInBiome should list resources available in a biome", () => {
      const resources = view.getResourcesInBiome("FOREST");
      expect(resources.length).toBe(2); // mineral_node and tree_node
      expect(resources.map(r => r.name)).toContain("Mineral Vein");
      expect(resources.map(r => r.name)).toContain("Forest Patch");
    });

    it("getResourcesInBiome should return empty for biome with no resources", () => {
      const resources = view.getResourcesInBiome("OCEAN");
      expect(resources.length).toBe(0);
    });
  });

  describe("reveal all toggle", () => {
    it("should render a reveal all button in the sidebar", () => {
      view.render(container);
      const toggle = container.querySelector(".codex-reveal-toggle");
      expect(toggle).not.toBeNull();
      expect(toggle.textContent).toContain("Reveal All");
    });

    it("should have active class by default", () => {
      const freshView = new SkillsView(mockUiManager);
      freshView.render(container);
      const toggle = container.querySelector(".codex-reveal-toggle");
      expect(toggle.classList.contains("active")).toBe(true);
    });

    it("should toggle revealAll state on click", () => {
      view.revealAll = true;
      view.render(container);

      container.querySelector(".codex-reveal-toggle").click();
      expect(view.revealAll).toBe(false);
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });

    it("should reveal all locked monsters when enabled", () => {
      view.activeCategory = "MONSTERS";
      view.revealAll = true;
      view.render(container);

      const cards = container.querySelectorAll(".skill-action-card");
      const locked = container.querySelectorAll(".skill-action-card.locked");
      expect(cards.length).toBe(2);
      expect(locked.length).toBe(0);
      expect(cards[1].textContent).toContain("Fight Goblin");
    });

    it("should reveal all locked recipes when enabled", () => {
      view.activeCategory = "RECIPES";
      view.revealAll = true;
      view.render(container);

      const locked = container.querySelectorAll(".skill-action-card.locked");
      expect(locked.length).toBe(0);
      expect(container.textContent).toContain("Smelt Iron");
    });

    it("should reveal all locked biomes when enabled", () => {
      view.activeCategory = "BIOMES";
      view.revealAll = true;
      view.render(container);

      const locked = container.querySelectorAll(".skill-action-card.locked");
      expect(locked.length).toBe(0);
      expect(container.textContent).toContain("Desert");
    });

    it("should reveal all locked items when enabled", () => {
      view.activeCategory = "ITEMS";
      view.revealAll = true;
      view.render(container);

      const locked = container.querySelectorAll(".skill-action-card.locked");
      expect(locked.length).toBe(0);
      expect(container.textContent).toContain("Goblin Mail");
    });

    it("should make revealed tiles clickable for detail popup", () => {
      view.activeCategory = "MONSTERS";
      view.revealAll = true;
      view.render(container);

      // Click the goblin card (normally locked)
      const goblinCard = Array.from(container.querySelectorAll(".skill-action-card"))
        .find(c => c.textContent.includes("Fight Goblin"));
      goblinCard.click();

      const popup = document.querySelector(".game-modal.codex-popup");
      expect(popup).not.toBeNull();
      expect(popup.textContent).toContain("Fight Goblin");
      popup.remove();
    });

    it("should show active class on toggle when enabled", () => {
      view.revealAll = true;
      view.render(container);
      const toggle = container.querySelector(".codex-reveal-toggle");
      expect(toggle.classList.contains("active")).toBe(true);
    });
  });

  describe("update", () => {
    it("should not throw", () => {
      view.activeCategory = null;
      view.update(container); // Should not throw
    });
  });
});
