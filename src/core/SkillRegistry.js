export const SKILL_DEFINITIONS = {
  MINING: {
    id: "MINING",
    name: "Mining",
    options: {
      copper_ore: { name: "Copper Ore", level: 1, xp: 10 },
      iron_ore: { name: "Iron Ore", level: 5, xp: 20 },
      coal: { name: "Coal", level: 10, xp: 30 },
    },
    interval: 1000,
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
    options: {
      oak_log: { name: "Oak Log", level: 1, xp: 10 },
      willow_log: { name: "Willow Log", level: 5, xp: 20 },
      maple_log: { name: "Maple Log", level: 10, xp: 30 },
    },
    interval: 1000,
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
    options: {
      raw_trout: { name: "Raw Trout", level: 1, xp: 10 },
      raw_salmon: { name: "Raw Salmon", level: 5, xp: 20 },
      raw_tuna: { name: "Raw Tuna", level: 10, xp: 30 },
    },
    interval: 1000,
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
    options: {
      rat: { name: "Rat", level: 1, xp: 10, drop: "rat_bones" },
      goblin: { name: "Goblin", level: 5, xp: 20, drop: "goblin_mail" },
      wolf: { name: "Wolf", level: 10, xp: 30, drop: "wolf_fur" },
    },
    interval: 1000,
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
