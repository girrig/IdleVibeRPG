import { getItemDefinition } from "./ItemRegistry";
import { SKILL_COLORS, GAME_CONFIG } from "./Constants";

export const SKILL_DEFINITIONS = {
  MINING: {
    id: "MINING",
    name: "Mining",
    icon: "⛏️",
    color: SKILL_COLORS.MINING,
    options: {
      copper_ore: {
        name: "Copper Ore",
        level: 1,
        xp: 10,
        icon: "🟠",
        interval: 2000,
      },
      iron_ore: {
        name: "Iron Ore",
        level: 5,
        xp: 20,
        icon: "⚪",
        interval: 4000,
      },
      coal: { name: "Coal", level: 10, xp: 30, icon: "⚫", interval: 6000 },
      gold_ore: {
        name: "Gold Ore",
        level: 20,
        xp: 45,
        icon: "🟡",
        interval: 8000,
      },
      mithril_ore: {
        name: "Mithril Ore",
        level: 30,
        xp: 60,
        icon: "🔵",
        interval: 10000,
      },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
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
    color: SKILL_COLORS.WOODCUTTING,
    options: {
      oak_log: { name: "Oak Log", level: 1, xp: 10, icon: "🌳" },
      willow_log: { name: "Willow Log", level: 5, xp: 20, icon: "🌿" },
      maple_log: { name: "Maple Log", level: 10, xp: 30, icon: "🍁" },
      yew_log: { name: "Yew Log", level: 20, xp: 45, icon: "🌲" },
      magic_log: { name: "Magic Log", level: 30, xp: 60, icon: "✨" },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
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
    color: SKILL_COLORS.FISHING,
    options: {
      raw_trout: { name: "Raw Trout", level: 1, xp: 10, icon: "🐟" },
      raw_salmon: { name: "Raw Salmon", level: 5, xp: 20, icon: "🐠" },
      raw_tuna: { name: "Raw Tuna", level: 10, xp: 30, icon: "🦈" },
      raw_lobster: { name: "Raw Lobster", level: 20, xp: 45, icon: "🦞" },
      raw_swordfish: { name: "Raw Swordfish", level: 30, xp: 60, icon: "🗡️" },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
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
    color: SKILL_COLORS.FIGHTING,
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
      skeleton: {
        name: "Skeleton",
        level: 20,
        xp: 45,
        drop: "bones",
        icon: "💀",
      },
      demon: {
        name: "Demon",
        level: 30,
        xp: 60,
        drop: "demon_ashes",
        icon: "👿",
      },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
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
  SMITHING: {
    id: "SMITHING",
    name: "Smithing",
    icon: "🔨",
    color: SKILL_COLORS.SMITHING,
    options: {
      copper_bar: {
        name: "Copper Bar",
        level: 1,
        xp: 15,
        icon: "🟧",
        cost: { copper_ore: 1 },
      },
      iron_bar: {
        name: "Iron Bar",
        level: 5,
        xp: 30,
        icon: "⬜",
        cost: { iron_ore: 1, coal: 1 },
      },
      steel_bar: {
        name: "Steel Bar",
        level: 10,
        xp: 45,
        icon: "⚙️",
        cost: { iron_ore: 1, coal: 2 },
      },
      gold_bar: {
        name: "Gold Bar",
        level: 20,
        xp: 60,
        icon: "🟨",
        cost: { gold_ore: 1 },
      },
      mithril_bar: {
        name: "Mithril Bar",
        level: 30,
        xp: 80,
        icon: "🔷",
        cost: { mithril_ore: 1, coal: 2 },
      },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.SMITHING.options[targetId];
      if (!option) return;

      // Check Costs
      if (option.cost) {
        const canAfford = Object.entries(option.cost).every(([item, qty]) => {
          return gameState.inventory.getCount(item) >= qty;
        });

        if (!canAfford) {
          gameState.triggerNotification("Not enough resources!", "error");
          char.stopActivity();
          return;
        }

        // Consume Resources
        Object.entries(option.cost).forEach(([item, qty]) => {
          gameState.inventory.removeItem(item, qty);
          // Optional: Negative notification?
          // const def = getItemDefinition(item);
          // gameState.triggerNotification(`-${qty} ${def.name}`, "item");
        });
      }

      let amount = 1;
      // smithing_2: 10% chance for double bars
      if (char.talents.smithing_2 && Math.random() < 0.1) amount = 2;

      gameState.inventory.addItem(targetId, amount);
      char.gainXp("smithing", option.xp);
    },
  },
};

export const getSkillDefinition = (type) => {
  return SKILL_DEFINITIONS[type] || null;
};
