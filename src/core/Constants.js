export const SKILL_COLORS = {
  MINING: "#e67e22", // Orange
  WOODCUTTING: "#2ecc71", // Emerald Green
  FISHING: "#3498db", // Blue
  FIGHTING: "#e74c3c", // Red
  SMITHING: "#a9a9a9", // Grey
  EXPLORING: "#8e44ad", // Purple
  DEFAULT: "#ccc",
};

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
  NOTIFICATIONS: {
    MASTER: true,
    LEVEL_UP: true,
    ACTIVITY: true,
    AUTOSAVE: true,
    ITEM: true,
  },
  STARTING_POSITION: { x: 250, y: 250 },
};

export const RESOURCE_NODES = {
  // --- MINING NODES ---
  mineral_node: {
    id: "mineral_node",
    name: "Mineral Vein",
    icon: "🪨",
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
      // Hot / Dry -> Copper, Gold
      TEMPERATE_DESERT: [
        { item: "copper_ore", weight: 50 },
        { item: "gold_ore", weight: 20 },
        { item: "stone", weight: 30 }
      ],
      SUBTROPICAL_DESERT: [
        { item: "copper_ore", weight: 40 },
        { item: "gold_ore", weight: 30 },
        { item: "stone", weight: 30 }
      ],
      // Mountain -> Iron, Coal
      ALPINE: [
        { item: "iron_ore", weight: 45 },
        { item: "coal", weight: 35 },
        { item: "stone", weight: 20 }
      ],
      ALPINE_TUNDRA: [
        { item: "iron_ore", weight: 30 },
        { item: "coal", weight: 30 },
        { item: "mithril_ore", weight: 10 },
        { item: "stone", weight: 30 }
      ],
      // Cold -> Rare Mithril
      POLAR_DESERT: [
        { item: "mithril_ore", weight: 30 },
        { item: "iron_ore", weight: 30 },
        { item: "stone", weight: 40 }
      ],
      ICE_SHEET: [
        { item: "mithril_ore", weight: 50 },
        { item: "stone", weight: 50 }
      ],
      // Plains -> Basic Copper
      TEMPERATE_GRASSLAND: [
        { item: "copper_ore", weight: 30 },
        { item: "stone", weight: 70 }
      ],
      SHRUBLAND: [
        { item: "copper_ore", weight: 20 },
        { item: "stone", weight: 80 }
      ]
    }
  },

  // --- WOODCUTTING NODES ---
  tree_node: {
    id: "tree_node",
    name: "Forest Patch",
    icon: "🌲",
    scale: 0.05,
    threshold: 0.6,
    amount: 50,
    allowedBiomes: [
      "TEMPERATE_DECIDUOUS_FOREST", "TEMPERATE_RAINFOREST",
      "BOREAL_FOREST", "TROPICAL_RAINFOREST", "TROPICAL_SAVANNA"
    ],
    default_drops: [{ item: "oak_log", weight: 100 }],
    biome_drops: {
      // Standard Forest
      TEMPERATE_DECIDUOUS_FOREST: [
        { item: "oak_log", weight: 90 },
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
      ]
    }
  },

  // --- FISHING NODES ---
  fishing_spot: {
    id: "fishing_spot",
    name: "Fishing Spot",
    icon: "🐟",
    scale: 0.08,
    threshold: 0.6,
    amount: 30, // 30 Fish per spot
    allowedBiomes: ["OCEAN", "SHALLOW_OCEAN", "BEACH"],
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
      ]
    }
  }
};
