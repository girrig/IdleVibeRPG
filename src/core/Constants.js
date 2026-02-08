import { ICONS } from "./Icons.js";

export const UI_COLORS = {
  ATTRIBUTE_POINTS: "#fbbf24", // Gold
  LOCKED: "#ccc",
  AVAILABLE: "#888",
  PURCHASED: "#4ade80", // Green
  COST: "#ffab40", // Orange for costs

  // Status / Badges
  STATUS_IDLE: "#94a3b8",
  STATUS_ACTIVE: "#fbbf24",

  // Rarities / Stat Colors (from CharacterDetail.js)
  STAT_STR: "#f87171",
  STAT_DEX: "#4ade80",
  STAT_INT: "#60a5fa",
};

export const GAME_CONFIG = {
  TICK_RATE: 1000,
  AUTOSAVE_INTERVAL: 60000,
  DEFAULT_SKILL_INTERVAL: 3000,
  MOVEMENT_INTERVAL: 1000,
  BAG_CAPACITY: 5,
  NOTIFICATIONS: {
    MASTER: true,
    LEVEL_UP: true,
    ACTIVITY: true,
    AUTOSAVE: true,
    ITEM: true,
  },
  STARTING_POSITION: { x: 250, y: 250 },
  XP_PER_LEVEL: 100,
  DOUBLE_LOOT_CHANCE: 0.1,
};

export const RESOURCE_NODES = {
  // --- MINING NODES ---
  mineral_node: {
    id: "mineral_node",
    name: "Mineral Vein",
    priority: 0,
    icon: ICONS.nodes.mineral_node,
    scale: 0.1, // Frequent but varied
    threshold: 0.65,
    amount: 25, // Capacity of the node (how many Mining actions)
    allowedBiomes: [
      "TEMPERATE_DESERT", "SUBTROPICAL_DESERT", // Hot
      "ALPINE", "ALPINE_TUNDRA", // Mountains
      "TEMPERATE_GRASSLAND", "SHRUBLAND", // Plains
      "POLAR_DESERT", "ICE_SHEET" // Cold
    ],
    // Drop Table: [ { item, weight } ]
    // Weights are relative.
    default_drops: [{ item: "stone", weight: 100 }],
    biome_drops: {
      // Hot / Dry -> Copper, Gold, Topaz
      TEMPERATE_DESERT: [
        { item: "copper_ore", weight: 50 },
        { item: "gold_ore", weight: 20 },
        { item: "stone", weight: 25 },
        { item: "topaz", weight: 5 }
      ],
      SUBTROPICAL_DESERT: [
        { item: "copper_ore", weight: 40 },
        { item: "gold_ore", weight: 30 },
        { item: "stone", weight: 25 },
        { item: "topaz", weight: 5 }
      ],
      // Mountain -> Iron, Coal, Emerald
      ALPINE: [
        { item: "iron_ore", weight: 45 },
        { item: "coal", weight: 35 },
        { item: "stone", weight: 15 },
        { item: "emerald", weight: 5 }
      ],
      ALPINE_TUNDRA: [
        { item: "iron_ore", weight: 30 },
        { item: "coal", weight: 30 },
        { item: "mithril_ore", weight: 10 },
        { item: "stone", weight: 25 },
        { item: "emerald", weight: 5 }
      ],
      // Cold -> Rare Mithril, Sapphire
      POLAR_DESERT: [
        { item: "mithril_ore", weight: 30 },
        { item: "iron_ore", weight: 30 },
        { item: "stone", weight: 35 },
        { item: "sapphire", weight: 5 }
      ],
      ICE_SHEET: [
        { item: "mithril_ore", weight: 50 },
        { item: "stone", weight: 45 },
        { item: "sapphire", weight: 5 }
      ],
      // Plains -> Basic Copper
      TEMPERATE_GRASSLAND: [
        { item: "copper_ore", weight: 30 },
        { item: "stone", weight: 69 },
        { item: "ruby", weight: 1 } // Very Rare
      ],
      SHRUBLAND: [
        { item: "copper_ore", weight: 20 },
        { item: "stone", weight: 79 },
        { item: "diamond", weight: 1 } // Ultra Rare
      ]
    }
  },

  gem_node: {
    id: "gem_node",
    name: "Crystal Geode",
    priority: 10, // High priority to spawn before standard ores
    icon: ICONS.nodes.gem_node,
    scale: 0.05, // Rare
    threshold: 0.8, // Very specific spots
    amount: 10,
    allowedBiomes: ["TEMPERATE_DESERT", "SUBTROPICAL_DESERT", "ALPINE", "ICE_SHEET"],
    default_drops: [{ item: "stone", weight: 100 }],
    biome_drops: {
      TEMPERATE_DESERT: [{ item: "topaz", weight: 80 }, { item: "stone", weight: 20 }],
      SUBTROPICAL_DESERT: [{ item: "topaz", weight: 80 }, { item: "stone", weight: 20 }],
      ALPINE: [{ item: "emerald", weight: 80 }, { item: "stone", weight: 20 }],
      ICE_SHEET: [{ item: "sapphire", weight: 80 }, { item: "stone", weight: 20 }]
    }
  },

  coal_vein: {
    id: "coal_vein",
    name: "Coal Deposit",
    priority: 5,
    icon: ICONS.nodes.coal_vein,
    scale: 0.08,
    threshold: 0.7,
    amount: 50,
    allowedBiomes: ["ALPINE", "ALPINE_TUNDRA", "BOREAL_FOREST"],
    default_drops: [{ item: "coal", weight: 100 }]
  },

  // --- WOODCUTTING NODES ---
  tree_node: {
    id: "tree_node",
    name: "Forest Patch",
    priority: 0,
    icon: ICONS.nodes.tree_node,
    scale: 0.05,
    threshold: 0.6,
    amount: 50,
    allowedBiomes: [
      "TEMPERATE_DECIDUOUS_FOREST", "TEMPERATE_RAINFOREST",
      "BOREAL_FOREST", "TROPICAL_RAINFOREST", "TROPICAL_SAVANNA", "SWAMP"
    ],
    default_drops: [{ item: "oak_log", weight: 100 }],
    biome_drops: {
      // Standard Forest - Added Maple
      TEMPERATE_DECIDUOUS_FOREST: [
        { item: "oak_log", weight: 60 },
        { item: "maple_log", weight: 30 },
        { item: "willow_log", weight: 10 }
      ],
      // Wet Forest -> Willow
      TEMPERATE_RAINFOREST: [
        { item: "willow_log", weight: 60 },
        { item: "oak_log", weight: 40 }
      ],
      // Cold -> Yew
      BOREAL_FOREST: [
        { item: "yew_log", weight: 80 },
        { item: "oak_log", weight: 20 }
      ],
      // Tropical -> Magic
      TROPICAL_RAINFOREST: [
        { item: "willow_log", weight: 50 },
        { item: "magic_log", weight: 20 },
        { item: "oak_log", weight: 30 }
      ],
      TROPICAL_SAVANNA: [
        { item: "oak_log", weight: 80 },
        { item: "magic_log", weight: 5 },
        { item: "willow_log", weight: 15 } // Acacia? (Mapped to Willow for now)
      ],
      // Swamp -> Willow dominant
      SWAMP: [
        { item: "willow_log", weight: 80 },
        { item: "oak_log", weight: 20 }
      ]
    }
  },

  ancient_tree: {
    id: "ancient_tree",
    name: "Ancient Tree",
    priority: 10,
    icon: ICONS.nodes.ancient_tree,
    scale: 0.03, // Very Rare
    threshold: 0.85,
    amount: 100, // Massive amount
    allowedBiomes: ["TROPICAL_RAINFOREST", "TEMPERATE_DECIDUOUS_FOREST"],
    default_drops: [{ item: "magic_log", weight: 50 }, { item: "yew_log", weight: 50 }]
  },

  // --- FISHING NODES ---
  fishing_spot: {
    id: "fishing_spot",
    name: "Fishing Spot",
    priority: 0,
    icon: ICONS.nodes.fishing_spot,
    scale: 0.08,
    threshold: 0.6,
    amount: 30, // 30 Fish per spot
    allowedBiomes: ["OCEAN", "SHALLOW_OCEAN", "BEACH", "SWAMP"],
    default_drops: [{ item: "raw_trout", weight: 100 }],
    biome_drops: {
      BEACH: [
        { item: "raw_trout", weight: 80 },
        { item: "raw_salmon", weight: 20 }
      ],
      SHALLOW_OCEAN: [
        { item: "raw_salmon", weight: 60 },
        { item: "raw_trout", weight: 40 }
      ],
      OCEAN: [
        { item: "raw_tuna", weight: 50 },
        { item: "raw_lobster", weight: 30 },
        { item: "raw_swordfish", weight: 20 }
      ],
      // Swamp Fishing
      SWAMP: [
        { item: "raw_trout", weight: 70 },
        { item: "raw_salmon", weight: 30 }
      ]
    }
  },

  // --- FORAGING NODES ---
  bush_node: {
    id: "bush_node",
    name: "Berry Bush",
    priority: 0,
    icon: ICONS.nodes.bush_node,
    scale: 0.15, // Common
    threshold: 0.6,
    amount: 20,
    allowedBiomes: [
      "TEMPERATE_GRASSLAND", "SHRUBLAND", "TEMPERATE_DECIDUOUS_FOREST"
    ],
    default_drops: [{ item: "red_berries", weight: 100 }],
    biome_drops: {
      TEMPERATE_GRASSLAND: [
        { item: "red_berries", weight: 70 },
        { item: "fiber", weight: 30 }
      ],
      SHRUBLAND: [
        { item: "blueberries", weight: 60 },
        { item: "fiber", weight: 40 }
      ],
      TEMPERATE_DECIDUOUS_FOREST: [
        { item: "blueberries", weight: 50 },
        { item: "red_berries", weight: 50 }
      ]
    }
  },
  fungi_node: {
    id: "fungi_node",
    name: "Fungi Patch",
    priority: 0,
    icon: ICONS.nodes.fungi_node,
    scale: 0.1,
    threshold: 0.65,
    amount: 15,
    allowedBiomes: ["TEMPERATE_RAINFOREST", "SWAMP", "BOREAL_FOREST"],
    default_drops: [{ item: "mushroom", weight: 100 }],
    biome_drops: {
      // Swamps are rich in fungi
      SWAMP: [
        { item: "mushroom", weight: 90 },
        { item: "red_berries", weight: 10 } // Uncommon
      ],
      // Damp forests
      TEMPERATE_RAINFOREST: [
        { item: "mushroom", weight: 100 }
      ],
      BOREAL_FOREST: [
        { item: "mushroom", weight: 100 }
      ]
    }
  }
};
