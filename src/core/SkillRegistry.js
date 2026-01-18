export const SKILL_DEFINITIONS = {
  MINING: {
    id: "MINING",
    name: "Mining",
    icon: "⛏️",
    options: {
      copper_ore: { name: "Copper Ore", level: 1, xp: 10, icon: "🟠" },
      iron_ore: { name: "Iron Ore", level: 5, xp: 20, icon: "⚪" },
      coal: { name: "Coal", level: 10, xp: 30, icon: "⚫" },
    },
    interval: 3000,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.MINING.options[targetId];
      gameState.inventory.addItem(targetId, 1);
      if (option) char.gainXp("mining", option.xp);
    },
  },
  WOODCUTTING: {
    id: "WOODCUTTING",
    name: "Woodcutting",
    icon: "🪓",
    options: {
      oak_log: { name: "Oak Log", level: 1, xp: 10, icon: "🌳" },
      willow_log: { name: "Willow Log", level: 5, xp: 20, icon: "🌿" },
      maple_log: { name: "Maple Log", level: 10, xp: 30, icon: "🍁" },
    },
    interval: 3000,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.WOODCUTTING.options[targetId];
      gameState.inventory.addItem(targetId, 1);
      if (option) char.gainXp("woodcutting", option.xp);
    },
  },
  FISHING: {
    id: "FISHING",
    name: "Fishing",
    icon: "🎣",
    options: {
      raw_trout: { name: "Raw Trout", level: 1, xp: 10, icon: "🐟" },
      raw_salmon: { name: "Raw Salmon", level: 5, xp: 20, icon: "🐠" },
      raw_tuna: { name: "Raw Tuna", level: 10, xp: 30, icon: "🦈" },
    },
    interval: 3000,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.FISHING.options[targetId];
      gameState.inventory.addItem(targetId, 1);
      if (option) char.gainXp("fishing", option.xp);
    },
  },
  FIGHTING: {
    id: "FIGHTING",
    name: "Fighting",
    icon: "⚔️",
    options: {
      rat: { name: "Rat", level: 1, xp: 10, drop: "rat_bones", icon: "🐀" },
      goblin: {
        name: "Goblin",
        level: 5,
        xp: 20,
        drop: "goblin_mail",
        icon: "👹",
      },
      wolf: { name: "Wolf", level: 10, xp: 30, drop: "wolf_fur", icon: "🐺" },
    },
    interval: 3000,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.FIGHTING.options[targetId];
      if (option) {
        gameState.inventory.addItem(option.drop, 1);
        char.gainXp("fighting", option.xp);
      }
    },
  },
};

export const getSkillDefinition = (type) => {
  return SKILL_DEFINITIONS[type] || null;
};
