import { ICONS } from "./Icons.js";

export const TERRAIN_TYPES = {
  // WATER TYPES
  OCEAN: { id: "OCEAN", name: "Ocean", color: "#1a4485", symbol: ICONS.biomes.OCEAN },
  SHALLOW_OCEAN: { id: "SHALLOW_OCEAN", name: "Shallow Ocean", color: "#4169E1", symbol: ICONS.biomes.SHALLOW_OCEAN },
  BEACH: { id: "BEACH", name: "Beach", color: "#deb887", symbol: ICONS.biomes.BEACH },

  // COLD BIOMES
  POLAR_DESERT: { id: "POLAR_DESERT", name: "Polar Desert", color: "#552200", symbol: ICONS.biomes.POLAR_DESERT },
  ICE_SHEET: { id: "ICE_SHEET", name: "Ice Sheet", color: "#FFFAFA", symbol: ICONS.biomes.ICE_SHEET },
  ALPINE_TUNDRA: { id: "ALPINE_TUNDRA", name: "Alpine Tundra", color: "#a0a0a0", symbol: ICONS.biomes.ALPINE_TUNDRA },
  TUNDRA: { id: "TUNDRA", name: "Tundra", color: "#b0e0e6", symbol: ICONS.biomes.TUNDRA },
  BOREAL_FOREST: { id: "BOREAL_FOREST", name: "Boreal Forest", color: "#5d7663", symbol: ICONS.biomes.BOREAL_FOREST },
  ALPINE: { id: "ALPINE", name: "Mountain", color: "#808080", symbol: ICONS.biomes.ALPINE },

  // TEMPERATE BIOMES
  TEMPERATE_DESERT: { id: "TEMPERATE_DESERT", name: "Temperate Desert", color: "#c2b280", symbol: ICONS.biomes.TEMPERATE_DESERT },
  SHRUBLAND: { id: "SHRUBLAND", name: "Shrubland", color: "#808000", symbol: ICONS.biomes.SHRUBLAND },
  TEMPERATE_GRASSLAND: { id: "TEMPERATE_GRASSLAND", name: "Grassland", color: "#90EE90", symbol: ICONS.biomes.TEMPERATE_GRASSLAND },
  TEMPERATE_DECIDUOUS_FOREST: { id: "TEMPERATE_DECIDUOUS_FOREST", name: "Forest", color: "#228B22", symbol: ICONS.biomes.TEMPERATE_DECIDUOUS_FOREST },
  TEMPERATE_RAINFOREST: { id: "TEMPERATE_RAINFOREST", name: "Rainforest", color: "#004400", symbol: ICONS.biomes.TEMPERATE_RAINFOREST },

  // HOT BIOMES
  SUBTROPICAL_DESERT: { id: "SUBTROPICAL_DESERT", name: "Desert", color: "#F4A460", symbol: ICONS.biomes.SUBTROPICAL_DESERT },
  TROPICAL_SAVANNA: { id: "TROPICAL_SAVANNA", name: "Savanna", color: "#9ca728", symbol: ICONS.biomes.TROPICAL_SAVANNA },
  TROPICAL_RAINFOREST: { id: "TROPICAL_RAINFOREST", name: "Jungle", color: "#006400", symbol: ICONS.biomes.TROPICAL_RAINFOREST },

  // SPECIAL
  HOME: { id: "HOME", name: "Home", color: "#FFD700", symbol: ICONS.biomes.HOME },
  SWAMP: { id: "SWAMP", name: "Swamp", color: "#2f4f4f", symbol: ICONS.biomes.SWAMP },
};
