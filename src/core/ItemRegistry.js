export const ITEM_DEFINITIONS = {
  // Ores
  copper_ore: { name: "Copper Ore", icon: "🟠", value: 5 },
  iron_ore: { name: "Iron Ore", icon: "⚪", value: 10 },
  coal: { name: "Coal", icon: "⚫", value: 5 },
  gold_ore: { name: "Gold Ore", icon: "🟡", value: 20 },
  mithril_ore: { name: "Mithril Ore", icon: "🔵", value: 30 },

  // Logs
  oak_log: { name: "Oak Log", icon: "🌳", value: 2 },
  willow_log: { name: "Willow Log", icon: "🌿", value: 5 },
  maple_log: { name: "Maple Log", icon: "🍁", value: 10 },
  yew_log: { name: "Yew Log", icon: "🌲", value: 20 },
  magic_log: { name: "Magic Log", icon: "✨", value: 40 },

  // Fish
  raw_trout: { name: "Raw Trout", icon: "🐟", value: 3 },
  raw_salmon: { name: "Raw Salmon", icon: "🐠", value: 6 },
  raw_tuna: { name: "Raw Tuna", icon: "🦈", value: 15 },
  raw_lobster: { name: "Raw Lobster", icon: "🦞", value: 25 },
  raw_swordfish: { name: "Raw Swordfish", icon: "🗡️", value: 40 },

  // Drops
  rat_bones: { name: "Rat Bones", icon: "🦴", value: 1 },
  goblin_mail: { name: "Goblin Mail", icon: "👕", value: 50 },
  wolf_fur: { name: "Wolf Fur", icon: "🧶", value: 20 },
  bones: { name: "Bones", icon: "☠️", value: 1 },
  demon_ashes: { name: "Demon Ashes", icon: "🌋", value: 10 },

  // Bars
  copper_bar: { name: "Copper Bar", icon: "🟧", value: 15 },
  iron_bar: { name: "Iron Bar", icon: "⬜", value: 30 },
  steel_bar: { name: "Steel Bar", icon: "⚙️", value: 45 },
  gold_bar: { name: "Gold Bar", icon: "🟨", value: 100 },
  mithril_bar: { name: "Mithril Bar", icon: "🔷", value: 150 },

  // Currency
  coins: { name: "Coins", icon: "💰", value: 1 },
};

export const getItemDefinition = (id) => {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "🎒" };
};
