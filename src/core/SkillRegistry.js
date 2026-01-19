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
      let amount = 1;
      // mining_2: 10% chance for double ore
      if (char.talents.mining_2 && Math.random() < 0.1) {
        amount = 2;
        // Optional: Notify double drop?
        // gameState.triggerNotification("Double Ore!", "success");
      }
      gameState.inventory.addItem(targetId, amount);
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
      let amount = 1;
      // woodcutting_2: 10% chance for double logs
      if (char.talents.woodcutting_2 && Math.random() < 0.1) amount = 2;

      gameState.inventory.addItem(targetId, amount);
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
      let amount = 1;
      // fishing_2: 10% chance for double fish
      if (char.talents.fishing_2 && Math.random() < 0.1) amount = 2;

      gameState.inventory.addItem(targetId, amount);
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
        let amount = 1;
        // fighting_2: 10% chance for double loot
        if (char.talents.fighting_2 && Math.random() < 0.1) amount = 2;

        gameState.inventory.addItem(option.drop, amount);
        char.gainXp("fighting", option.xp);
      }
    },
  },
};

export const getSkillDefinition = (type) => {
  return SKILL_DEFINITIONS[type] || null;
};
