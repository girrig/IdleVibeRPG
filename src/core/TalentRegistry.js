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
};

export const getTalentDefinition = (id) => TALENT_DEFINITIONS[id];
