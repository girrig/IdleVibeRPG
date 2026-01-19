export const TALENT_DEFINITIONS = {
  // Strength Path
  str_1: {
    id: "str_1",
    name: "Brawn",
    description: "Increases Strength by 5",
    icon: "💪",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 0 },
    effect: (char) => {
      char.stats.strength += 5;
    },
    removeEffect: (char) => {
      char.stats.strength -= 5;
    },
  },
  str_2: {
    id: "str_2",
    name: "Mighty Blow",
    description: "Increases Strength by 10",
    icon: "💥",
    cost: 1,
    prerequisites: ["str_1"],
    position: { row: 1, col: 0 },
    effect: (char) => {
      char.stats.strength += 10;
    },
    removeEffect: (char) => {
      char.stats.strength -= 10;
    },
  },
  // Dexterity Path
  dex_1: {
    id: "dex_1",
    name: "Agility",
    description: "Increases Dexterity by 5",
    icon: "🦵",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 1 },
    effect: (char) => {
      char.stats.dexterity += 5;
    },
    removeEffect: (char) => {
      char.stats.dexterity -= 5;
    },
  },
  dex_2: {
    id: "dex_2",
    name: "Swift Step",
    description: "Increases Dexterity by 10",
    icon: "💨",
    cost: 1,
    prerequisites: ["dex_1"],
    position: { row: 1, col: 1 },
    effect: (char) => {
      char.stats.dexterity += 10;
    },
    removeEffect: (char) => {
      char.stats.dexterity -= 10;
    },
  },
  // Intelligence Path
  int_1: {
    id: "int_1",
    name: "Focus",
    description: "Increases Intelligence by 5",
    icon: "🧠",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 2 },
    effect: (char) => {
      char.stats.intelligence += 5;
    },
    removeEffect: (char) => {
      char.stats.intelligence -= 5;
    },
  },
  int_2: {
    id: "int_2",
    name: "Mind Blast",
    description: "Increases Intelligence by 10",
    icon: "🔮",
    cost: 1,
    prerequisites: ["int_1"],
    position: { row: 1, col: 2 },
    effect: (char) => {
      char.stats.intelligence += 10;
    },
    removeEffect: (char) => {
      char.stats.intelligence -= 10;
    },
  },
  // Mining Path
  mining_1: {
    id: "mining_1",
    name: "Sharp Pick",
    description: "Increases Mining XP by 10%",
    icon: "⛏️",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 3 },
    effect: (char) => {}, // Handled in gainXp
  },
  mining_2: {
    id: "mining_2",
    name: "Double Ore",
    description: "10% chance to mine double ore",
    icon: "💎",
    cost: 1,
    prerequisites: ["mining_1"],
    position: { row: 1, col: 3 },
    effect: (char) => {}, // Handled in Mining Action
  },

  // Woodcutting Path
  woodcutting_1: {
    id: "woodcutting_1",
    name: "Sharp Axe",
    description: "Increases Woodcutting XP by 10%",
    icon: "🪓",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 4 },
    effect: (char) => {}, // Handled in gainXp
  },
  woodcutting_2: {
    id: "woodcutting_2",
    name: "Lumberjack",
    description: "10% chance to chop double logs",
    icon: "🌲",
    cost: 1,
    prerequisites: ["woodcutting_1"],
    position: { row: 1, col: 4 },
    effect: (char) => {}, // Handled in Woodcutting Action
  },

  // Fishing Path
  fishing_1: {
    id: "fishing_1",
    name: "Angler",
    description: "Increases Fishing XP by 10%",
    icon: "🎣",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 5 },
    effect: (char) => {}, // Handled in gainXp
  },
  fishing_2: {
    id: "fishing_2",
    name: "Net Master",
    description: "10% chance to catch double fish",
    icon: "🐟",
    cost: 1,
    prerequisites: ["fishing_1"],
    position: { row: 1, col: 5 },
    effect: (char) => {}, // Handled in Fishing Action
  },

  // Fighting Path
  fighting_1: {
    id: "fighting_1",
    name: "Warrior",
    description: "Increases Fighting XP by 10%",
    icon: "⚔️",
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 6 },
    effect: (char) => {}, // Handled in gainXp
  },
  fighting_2: {
    id: "fighting_2",
    name: "Loot Goblin",
    description: "10% chance for double loot",
    icon: "💰",
    cost: 1,
    prerequisites: ["fighting_1"],
    position: { row: 1, col: 6 },
    effect: (char) => {}, // Handled in Fighting Action
  },

  // Fighting Defense
  fighting_def_1: {
    id: "fighting_def_1",
    name: "Stone Skin",
    description: "Reduces damage taken by 5%",
    icon: "🛡️",
    cost: 1,
    prerequisites: ["fighting_1"], // Branch from Fighting 1
    position: { row: 1, col: 7 }, // Next to Loot Goblin (Col 6)
    effect: (char) => {},
  },
  fighting_def_2: {
    id: "fighting_def_2",
    name: "Iron Will",
    description: "Reduces damage taken by 10%",
    icon: "🏰",
    cost: 2,
    prerequisites: ["fighting_def_1"],
    position: { row: 2, col: 7 },
    effect: (char) => {},
  },

  // --- Level 3 & 4 Talents ---

  // Strength
  str_3: {
    id: "str_3",
    name: "Giant's Strength",
    description: "Increases Strength by 15",
    icon: "👹",
    cost: 2,
    prerequisites: ["str_2"],
    position: { row: 2, col: 0 },
    effect: (char) => {
      char.stats.strength += 15;
    },
    removeEffect: (char) => {
      char.stats.strength -= 15;
    },
  },
  str_4: {
    id: "str_4",
    name: "Titan's Grip",
    description: "Increases Strength by 20",
    icon: "✊",
    cost: 3,
    prerequisites: ["str_3"],
    position: { row: 3, col: 0 },
    effect: (char) => {
      char.stats.strength += 20;
    },
    removeEffect: (char) => {
      char.stats.strength -= 30; // Wait, previous was 20. Correct to 20.
      // Actually, let me check the original code I wrote in previous turn.
      // str_4 effect was += 20. So removeEffect should be -= 20.
      char.stats.strength -= 20;
    },
  },

  // Dexterity
  dex_3: {
    id: "dex_3",
    name: "Lightning Reflexes",
    description: "Increases Dexterity by 15",
    icon: "⚡",
    cost: 2,
    prerequisites: ["dex_2"],
    position: { row: 2, col: 1 },
    effect: (char) => {
      char.stats.dexterity += 15;
    },
    removeEffect: (char) => {
      char.stats.dexterity -= 15;
    },
  },
  dex_4: {
    id: "dex_4",
    name: "Godspeed",
    description: "Increases Dexterity by 20",
    icon: "🐆",
    cost: 3,
    prerequisites: ["dex_3"],
    position: { row: 3, col: 1 },
    effect: (char) => {
      char.stats.dexterity += 20;
    },
    removeEffect: (char) => {
      char.stats.dexterity -= 20;
    },
  },

  // Intelligence
  int_3: {
    id: "int_3",
    name: "Arcane Wisdom",
    description: "Increases Intelligence by 15",
    icon: "📜",
    cost: 2,
    prerequisites: ["int_2"],
    position: { row: 2, col: 2 },
    effect: (char) => {
      char.stats.intelligence += 15;
    },
    removeEffect: (char) => {
      char.stats.intelligence -= 15;
    },
  },
  int_4: {
    id: "int_4",
    name: "Omniscience",
    description: "Increases Intelligence by 20",
    icon: "👁️",
    cost: 3,
    prerequisites: ["int_3"],
    position: { row: 3, col: 2 },
    effect: (char) => {
      char.stats.intelligence += 20;
    },
    removeEffect: (char) => {
      char.stats.intelligence -= 20;
    },
  },

  // Mining
  mining_3: {
    id: "mining_3",
    name: "Deep Excavation",
    description: "Mining XP +20%",
    icon: "⛰️",
    cost: 2,
    prerequisites: ["mining_2"],
    position: { row: 2, col: 3 },
    effect: (char) => {},
  },
  mining_4: {
    id: "mining_4",
    name: "Gem Finder",
    description: "Chance to find gems while mining (Placeholder)",
    icon: "💎",
    cost: 3,
    prerequisites: ["mining_3"],
    position: { row: 3, col: 3 },
    effect: (char) => {},
  },

  // Woodcutting
  woodcutting_3: {
    id: "woodcutting_3",
    name: "Forest Wrath",
    description: "Woodcutting XP +20%",
    icon: "🌳",
    cost: 2,
    prerequisites: ["woodcutting_2"],
    position: { row: 2, col: 4 },
    effect: (char) => {},
  },
  woodcutting_4: {
    id: "woodcutting_4",
    name: "Nature's Bounty",
    description: "Chance to find rare wood (Placeholder)",
    icon: "🍁",
    cost: 3,
    prerequisites: ["woodcutting_3"],
    position: { row: 3, col: 4 },
    effect: (char) => {},
  },

  // Fishing
  fishing_3: {
    id: "fishing_3",
    name: "Trawler",
    description: "Fishing XP +20%",
    icon: "🕸️",
    cost: 2,
    prerequisites: ["fishing_2"],
    position: { row: 2, col: 5 },
    effect: (char) => {},
  },
  fishing_4: {
    id: "fishing_4",
    name: "Legendary Bait",
    description: "Chance to catch legendary fish (Placeholder)",
    icon: "🦈",
    cost: 3,
    prerequisites: ["fishing_3"],
    position: { row: 3, col: 5 },
    effect: (char) => {},
  },

  // Fighting
  fighting_3: {
    id: "fighting_3",
    name: "Berserker",
    description: "Fighting XP +20%",
    icon: "😡",
    cost: 2,
    prerequisites: ["fighting_2"],
    position: { row: 2, col: 6 },
    effect: (char) => {},
  },
  fighting_4: {
    id: "fighting_4",
    name: "Champion",
    description: "Critical Strike Chance +5% (Placeholder)",
    icon: "🏆",
    cost: 3,
    prerequisites: ["fighting_3"],
    position: { row: 3, col: 6 },
    effect: (char) => {},
  },
};

export const getTalentDefinition = (id) => TALENT_DEFINITIONS[id];
