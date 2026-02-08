import { ICONS } from "./Icons.js";

export const ITEM_DEFINITIONS = {
  // Ores
  copper_ore: { name: "Copper Ore", icon: ICONS.items.copper_ore, value: 5, category: "Ore" },
  iron_ore: { name: "Iron Ore", icon: ICONS.items.iron_ore, value: 10, category: "Ore" },
  coal: { name: "Coal", icon: ICONS.items.coal, value: 5, category: "Ore" },
  gold_ore: { name: "Gold Ore", icon: ICONS.items.gold_ore, value: 20, category: "Ore" },
  mithril_ore: { name: "Mithril Ore", icon: ICONS.items.mithril_ore, value: 30, category: "Ore" },
  stone: { name: "Stone", icon: ICONS.items.stone, value: 1, category: "Resource" },

  // Logs
  oak_log: { name: "Oak Log", icon: ICONS.items.oak_log, value: 2, category: "Log" },
  willow_log: { name: "Willow Log", icon: ICONS.items.willow_log, value: 5, category: "Log" },
  maple_log: { name: "Maple Log", icon: ICONS.items.maple_log, value: 10, category: "Log" },
  yew_log: { name: "Yew Log", icon: ICONS.items.yew_log, value: 20, category: "Log" },
  magic_log: { name: "Magic Log", icon: ICONS.items.magic_log, value: 40, category: "Log" },

  // Fish
  raw_trout: { name: "Raw Trout", icon: ICONS.items.raw_trout, value: 3, category: "Fish" },
  raw_salmon: { name: "Raw Salmon", icon: ICONS.items.raw_salmon, value: 6, category: "Fish" },
  raw_tuna: { name: "Raw Tuna", icon: ICONS.items.raw_tuna, value: 15, category: "Fish" },
  raw_lobster: { name: "Raw Lobster", icon: ICONS.items.raw_lobster, value: 25, category: "Fish" },
  raw_swordfish: {
    name: "Raw Swordfish",
    icon: ICONS.items.raw_swordfish,
    value: 40,
    category: "Fish",
  },

  // Drops
  rat_bones: { name: "Rat Bones", icon: ICONS.items.rat_bones, value: 1, category: "Drop" },
  goblin_mail: { name: "Goblin Mail", icon: ICONS.items.goblin_mail, value: 50, category: "Drop" },
  wolf_fur: { name: "Wolf Fur", icon: ICONS.items.wolf_fur, value: 20, category: "Drop" },
  bones: { name: "Bones", icon: ICONS.items.bones, value: 1, category: "Drop" },
  demon_ashes: { name: "Demon Ashes", icon: ICONS.items.demon_ashes, value: 10, category: "Drop" },

  // Forageables
  red_berries: { name: "Red Berries", icon: ICONS.items.red_berries, value: 2, category: "Food" },
  blueberries: { name: "Blueberries", icon: ICONS.items.blueberries, value: 3, category: "Food" },
  fiber: { name: "Fiber", icon: ICONS.items.fiber, value: 1, category: "Resource" },
  mushroom: { name: "Mushroom", icon: ICONS.items.mushroom, value: 5, category: "Food" },

  // Gems
  ruby: { name: "Ruby", icon: ICONS.items.ruby, value: 100, category: "Gem" },
  sapphire: { name: "Sapphire", icon: ICONS.items.sapphire, value: 100, category: "Gem" },
  emerald: { name: "Emerald", icon: ICONS.items.emerald, value: 100, category: "Gem" },
  topaz: { name: "Topaz", icon: ICONS.items.topaz, value: 80, category: "Gem" },
  diamond: { name: "Diamond", icon: ICONS.items.diamond, value: 500, category: "Gem" },

  // Bars
  copper_bar: { name: "Copper Bar", icon: ICONS.items.copper_bar, value: 15, category: "Bar" },
  iron_bar: { name: "Iron Bar", icon: ICONS.items.iron_bar, value: 30, category: "Bar" },
  steel_bar: { name: "Steel Bar", icon: ICONS.items.steel_bar, value: 45, category: "Bar" },
  gold_bar: { name: "Gold Bar", icon: ICONS.items.gold_bar, value: 100, category: "Bar" },
  mithril_bar: { name: "Mithril Bar", icon: ICONS.items.mithril_bar, value: 150, category: "Bar" },

  // Currency
  coins: { name: "Coins", icon: ICONS.items.coins, value: 1, category: "Currency" },
};

export const getItemDefinition = (id) => {
  return ITEM_DEFINITIONS[id] || { name: id, icon: ICONS.misc.unknown };
};
