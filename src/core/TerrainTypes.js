export const TERRAIN_TYPES = {
  // WATER TYPES
  OCEAN: { id: "OCEAN", color: "#1a4485", symbol: "🌊" }, // Deep water
  SHALLOW_OCEAN: { id: "SHALLOW_OCEAN", color: "#4169E1", symbol: "🐟" }, // Formerly WATER
  BEACH: { id: "BEACH", color: "#deb887", symbol: "🏖️" },

  // COLD BIOMES
  POLAR_DESERT: { id: "POLAR_DESERT", color: "#552200", symbol: "🌨️" }, // Formerly SCORCHED
  ICE_SHEET: { id: "ICE_SHEET", color: "#FFFAFA", symbol: "❄️" }, // Formerly SNOW
  ALPINE_TUNDRA: { id: "ALPINE_TUNDRA", color: "#a0a0a0", symbol: "🐐" }, // Formerly BARE
  TUNDRA: { id: "TUNDRA", color: "#b0e0e6", symbol: "🏔️" }, // Replaced 🧊 with 🏔️
  BOREAL_FOREST: { id: "BOREAL_FOREST", color: "#5d7663", symbol: "🌲" }, // Formerly TAIGA
  ALPINE: { id: "ALPINE", color: "#808080", symbol: "⛰️" }, // Formerly MOUNTAIN

  // TEMPERATE BIOMES
  TEMPERATE_DESERT: { id: "TEMPERATE_DESERT", color: "#c2b280", symbol: "🐍" }, // Replaced 🦎 with 🐍
  SHRUBLAND: { id: "SHRUBLAND", color: "#808000", symbol: "🌿" },
  TEMPERATE_GRASSLAND: {
    id: "TEMPERATE_GRASSLAND",
    color: "#90EE90",
    symbol: "🌾",
  }, // Formerly GRASSLAND
  TEMPERATE_DECIDUOUS_FOREST: {
    id: "TEMPERATE_DECIDUOUS_FOREST",
    color: "#228B22",
    symbol: "🌳",
  },
  TEMPERATE_RAINFOREST: {
    id: "TEMPERATE_RAINFOREST",
    color: "#004400",
    symbol: "🐻",
  },

  // HOT BIOMES
  SUBTROPICAL_DESERT: {
    id: "SUBTROPICAL_DESERT",
    color: "#F4A460",
    symbol: "🌵",
  }, // Formerly DESERT
  TROPICAL_SAVANNA: { id: "TROPICAL_SAVANNA", color: "#9ca728", symbol: "🐘" }, // Replaced 🦁 with 🐘
  TROPICAL_RAINFOREST: {
    id: "TROPICAL_RAINFOREST",
    color: "#006400",
    symbol: "🌴", // Replaced 🦜 with 🌴
  },

  // SPECIAL
  HOME: { id: "HOME", color: "#FFD700", symbol: "🏠" },
  SWAMP: { id: "SWAMP", color: "#2f4f4f", symbol: "🐊" },
};
