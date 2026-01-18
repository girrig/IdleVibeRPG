export const ITEM_DEFINITIONS = {
  // Ores
  copper_ore: { name: "Copper Ore", icon: "🟠" },
  iron_ore: { name: "Iron Ore", icon: "⚪" },
  coal: { name: "Coal", icon: "⚫" },

  // Logs
  oak_log: { name: "Oak Log", icon: "🌳" },
  willow_log: { name: "Willow Log", icon: "🌿" },
  maple_log: { name: "Maple Log", icon: "🍁" },

  // Fish
  raw_trout: { name: "Raw Trout", icon: "🐟" },
  raw_salmon: { name: "Raw Salmon", icon: "🐠" },
  raw_tuna: { name: "Raw Tuna", icon: "🦈" },

  // Drops
  rat_bones: { name: "Rat Bones", icon: "🦴" },
  goblin_mail: { name: "Goblin Mail", icon: "👕" },
  wolf_fur: { name: "Wolf Fur", icon: "🧶" },
};

export const getItemDefinition = (id) => {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "🎒" };
};
