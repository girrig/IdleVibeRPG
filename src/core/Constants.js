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

export const RESOURCE_GENERATION_CONFIG = {
  // Config for Factorio-style resource patches
  // Scale: Lower = larger, spread out patches. Higher = smaller, frequent spots.
  // Threshold: Value (0-1) to spawn. Higher = rarer.

  oak_log: {
    type: "oak_log", name: "Oak Tree", icon: "🌳",
    scale: 0.05, threshold: 0.6, amount: 20,
    allowedBiomes: ["TEMPERATE_DECIDUOUS_FOREST", "SHRUBLAND", "TEMPERATE_GRASSLAND"]
  },
  willow_log: {
    type: "willow_log", name: "Willow Tree", icon: "🌿",
    scale: 0.05, threshold: 0.7, amount: 20,
    allowedBiomes: ["TEMPERATE_RAINFOREST", "SWAMP"]
  },
  yew_log: {
    type: "yew_log", name: "Yew Tree", icon: "🌲",
    scale: 0.04, threshold: 0.75, amount: 20,
    allowedBiomes: ["BOREAL_FOREST"]
  },
  magic_log: {
    type: "magic_log", name: "Magic Tree", icon: "✨",
    scale: 0.03, threshold: 0.85, amount: 5,
    allowedBiomes: ["TROPICAL_RAINFOREST"]
  },
  copper_ore: {
    type: "copper_ore", name: "Copper Vein", icon: "🟠",
    scale: 0.08, threshold: 0.7, amount: 15,
    allowedBiomes: ["ALPINE", "SUBTROPICAL_DESERT", "TEMPERATE_DESERT", "TEMPERATE_GRASSLAND", "SHRUBLAND"]
  },
  iron_ore: {
    type: "iron_ore", name: "Iron Vein", icon: "⚪",
    scale: 0.08, threshold: 0.75, amount: 10,
    allowedBiomes: ["ALPINE", "TEMPERATE_DESERT", "ALPINE_TUNDRA", "TUNDRA"]
  },
  coal: {
    type: "coal", name: "Coal Deposit", icon: "⚫",
    scale: 0.06, threshold: 0.7, amount: 10,
    allowedBiomes: ["ALPINE_TUNDRA", "SWAMP", "TEMPERATE_DECIDUOUS_FOREST"]
  },
  gold_ore: {
    type: "gold_ore", name: "Gold Vein", icon: "🟡",
    scale: 0.04, threshold: 0.8, amount: 5,
    allowedBiomes: ["ALPINE", "SUBTROPICAL_DESERT"]
  },
  mithril_ore: {
    type: "mithril_ore", name: "Mithril Vein", icon: "🔵",
    scale: 0.03, threshold: 0.85, amount: 5,
    allowedBiomes: ["POLAR_DESERT", "ICE_SHEET"]
  },
  // Fishing spots (Water)
  raw_trout: {
    type: "raw_trout", name: "Trout Spot", icon: "🐟",
    scale: 0.1, threshold: 0.6, amount: 20,
    allowedBiomes: ["SHALLOW_OCEAN", "BEACH"]
  },
  raw_salmon: {
    type: "raw_salmon", name: "Salmon Spot", icon: "🐠",
    scale: 0.1, threshold: 0.65, amount: 15,
    allowedBiomes: ["SHALLOW_OCEAN"]
  },
  raw_tuna: {
    type: "raw_tuna", name: "Tuna Shoal", icon: "🦈",
    scale: 0.05, threshold: 0.6, amount: 10,
    allowedBiomes: ["OCEAN"]
  },
  raw_lobster: {
    type: "raw_lobster", name: "Lobster Cage", icon: "🦞",
    scale: 0.05, threshold: 0.7, amount: 5,
    allowedBiomes: ["OCEAN"]
  },
  raw_swordfish: {
    type: "raw_swordfish", name: "Swordfish", icon: "🗡️",
    scale: 0.03, threshold: 0.8, amount: 2,
    allowedBiomes: ["OCEAN"]
  }

};
