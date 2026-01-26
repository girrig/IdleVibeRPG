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
