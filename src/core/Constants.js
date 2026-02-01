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

export const BIOME_RESOURCE_MAP = {
  // Woodcutting
  TEMPERATE_DECIDUOUS_FOREST: { oak_log: 20 },
  BOREAL_FOREST: { yew_log: 20 },
  TEMPERATE_RAINFOREST: { willow_log: 20 },
  TROPICAL_RAINFOREST: { magic_log: 5 },
  SHRUBLAND: { oak_log: 5 },

  // Mining
  ALPINE: { copper_ore: 15, iron_ore: 5 },
  ALPINE_TUNDRA: { iron_ore: 15, coal: 10 },
  SUBTROPICAL_DESERT: { copper_ore: 20 },
  TEMPERATE_DESERT: { copper_ore: 10, iron_ore: 5 },
  POLAR_DESERT: { mithril_ore: 2 }, // Rare

  // Fishing (Optional - visiting water adds fish?)
  SHALLOW_OCEAN: { raw_trout: 15, raw_salmon: 5 },
  OCEAN: { raw_tuna: 10, raw_lobster: 5, raw_swordfish: 2 },
  BEACH: { raw_trout: 5 },
};
