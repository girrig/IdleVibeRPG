export const ITEM_DEFINITIONS = {
  // Ores
  copper_ore: { name: "Copper Ore", icon: "🟠", value: 5, category: "Ore" },
  iron_ore: { name: "Iron Ore", icon: "⚪", value: 10, category: "Ore" },
  coal: { name: "Coal", icon: "⚫", value: 5, category: "Ore" },
  gold_ore: { name: "Gold Ore", icon: "🟡", value: 20, category: "Ore" },
  mithril_ore: { name: "Mithril Ore", icon: "🔵", value: 30, category: "Ore" },
  stone: { name: "Stone", icon: "🪨", value: 1, category: "Resource" },

  // Logs
  oak_log: { name: "Oak Log", icon: "🌳", value: 2, category: "Log" },
  willow_log: { name: "Willow Log", icon: "🌿", value: 5, category: "Log" },
  maple_log: { name: "Maple Log", icon: "🍁", value: 10, category: "Log" },
  yew_log: { name: "Yew Log", icon: "🌲", value: 20, category: "Log" },
  magic_log: { name: "Magic Log", icon: "✨", value: 40, category: "Log" },

  // Fish
  raw_trout: { name: "Raw Trout", icon: "🐟", value: 3, category: "Fish" },
  raw_salmon: { name: "Raw Salmon", icon: "🐠", value: 6, category: "Fish" },
  raw_tuna: { name: "Raw Tuna", icon: "🦈", value: 15, category: "Fish" },
  raw_lobster: { name: "Raw Lobster", icon: "🦞", value: 25, category: "Fish" },
  raw_swordfish: {
    name: "Raw Swordfish",
    icon: "🗡️",
    value: 40,
    category: "Fish",
  },

  // Drops
  rat_bones: { name: "Rat Bones", icon: "🦴", value: 1, category: "Drop" },
  goblin_mail: { name: "Goblin Mail", icon: "👕", value: 50, category: "Drop" },
  wolf_fur: { name: "Wolf Fur", icon: "🧶", value: 20, category: "Drop" },
  bones: { name: "Bones", icon: "☠️", value: 1, category: "Drop" },
  demon_ashes: { name: "Demon Ashes", icon: "🌋", value: 10, category: "Drop" },

  // Bars
  copper_bar: { name: "Copper Bar", icon: "🟧", value: 15, category: "Bar" },
  iron_bar: { name: "Iron Bar", icon: "⬜", value: 30, category: "Bar" },
  steel_bar: { name: "Steel Bar", icon: "⚙️", value: 45, category: "Bar" },
  gold_bar: { name: "Gold Bar", icon: "🟨", value: 100, category: "Bar" },
  mithril_bar: { name: "Mithril Bar", icon: "🔷", value: 150, category: "Bar" },

  // Currency
  coins: { name: "Coins", icon: "💰", value: 1, category: "Currency" },
};

export const getItemDefinition = (id) => {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "🎒" };
};
