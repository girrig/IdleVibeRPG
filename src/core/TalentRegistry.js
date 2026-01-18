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
};

export const getTalentDefinition = (id) => TALENT_DEFINITIONS[id];
