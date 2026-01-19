export const ITEM_DEFINITIONS = {
  // Ores
  copper_ore: { name: "Copper Ore", icon: "🟠", value: 5 },
  iron_ore: { name: "Iron Ore", icon: "⚪", value: 10 },
  coal: { name: "Coal", icon: "⚫", value: 5 },

  // Logs
  oak_log: { name: "Oak Log", icon: "🌳", value: 2 },
  willow_log: { name: "Willow Log", icon: "🌿", value: 5 },
  maple_log: { name: "Maple Log", icon: "🍁", value: 10 },

  // Fish
  raw_trout: { name: "Raw Trout", icon: "🐟", value: 3 },
  raw_salmon: { name: "Raw Salmon", icon: "🐠", value: 6 },
  raw_tuna: { name: "Raw Tuna", icon: "🦈", value: 15 },

  // Drops
  rat_bones: { name: "Rat Bones", icon: "🦴", value: 1 },
  goblin_mail: { name: "Goblin Mail", icon: "👕", value: 50 },
  wolf_fur: { name: "Wolf Fur", icon: "🧶", value: 20 },

  // Bars
  copper_bar: { name: "Copper Bar", icon: "🟧", value: 15 },
  iron_bar: { name: "Iron Bar", icon: "⬜", value: 30 },

  // Currency
  coins: { name: "Coins", icon: "💰", value: 1 },
};

export const getItemDefinition = (id) => {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "🎒" };
};
