import { ICONS } from "./Icons.js";

export const TALENT_DEFINITIONS = {
  // Mining Path
  mining_1: {
    id: "mining_1",
    name: "Sharp Pick",
    description: "Increases Mining XP by 10%",
    icon: ICONS.talents.mining_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 3 },
    effect: (char) => { }, // Handled in gainXp
  },
  mining_2: {
    id: "mining_2",
    name: "Double Ore",
    description: "10% chance to mine double ore",
    icon: ICONS.talents.mining_2,
    cost: 1,
    prerequisites: ["mining_1"],
    position: { row: 1, col: 3 },
    effect: (char) => { }, // Handled in Mining Action
  },

  // Woodcutting Path
  woodcutting_1: {
    id: "woodcutting_1",
    name: "Sharp Axe",
    description: "Increases Woodcutting XP by 10%",
    icon: ICONS.talents.woodcutting_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 4 },
    effect: (char) => { }, // Handled in gainXp
  },
  woodcutting_2: {
    id: "woodcutting_2",
    name: "Lumberjack",
    description: "10% chance to chop double logs",
    icon: ICONS.talents.woodcutting_2,
    cost: 1,
    prerequisites: ["woodcutting_1"],
    position: { row: 1, col: 4 },
    effect: (char) => { }, // Handled in Woodcutting Action
  },

  // Fishing Path
  fishing_1: {
    id: "fishing_1",
    name: "Angler",
    description: "Increases Fishing XP by 10%",
    icon: ICONS.talents.fishing_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 5 },
    effect: (char) => { }, // Handled in gainXp
  },
  fishing_2: {
    id: "fishing_2",
    name: "Net Master",
    description: "10% chance to catch double fish",
    icon: ICONS.talents.fishing_2,
    cost: 1,
    prerequisites: ["fishing_1"],
    position: { row: 1, col: 5 },
    effect: (char) => { }, // Handled in Fishing Action
  },

  // Fighting Path
  fighting_1: {
    id: "fighting_1",
    name: "Warrior",
    description: "Increases Fighting XP by 10%",
    icon: ICONS.talents.fighting_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 6 },
    effect: (char) => { }, // Handled in gainXp
  },
  fighting_2: {
    id: "fighting_2",
    name: "Loot Goblin",
    description: "10% chance for double loot",
    icon: ICONS.talents.fighting_2,
    cost: 1,
    prerequisites: ["fighting_1"],
    position: { row: 1, col: 6 },
    effect: (char) => { }, // Handled in Fighting Action
  },

  // Fighting Defense
  fighting_def_1: {
    id: "fighting_def_1",
    name: "Stone Skin",
    description: "Reduces damage taken by 5%",
    icon: ICONS.talents.fighting_def_1,
    cost: 1,
    prerequisites: ["fighting_1"], // Branch from Fighting 1
    position: { row: 1, col: 7 },
    effect: (char) => { },
  },
  fighting_def_2: {
    id: "fighting_def_2",
    name: "Iron Will",
    description: "Reduces damage taken by 10%",
    icon: ICONS.talents.fighting_def_2,
    cost: 2,
    prerequisites: ["fighting_def_1"],
    position: { row: 2, col: 7 },
    effect: (char) => { },
  },

  // --- Level 3 & 4 Talents ---

  // Strength
  str_3: {
    id: "str_3",
    name: "Giant's Strength",
    description: "Increases Strength by 15",
    icon: ICONS.talents.str_3,
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
    icon: ICONS.talents.str_4,
    cost: 3,
    prerequisites: ["str_3"],
    position: { row: 3, col: 0 },
    effect: (char) => {
      char.stats.strength += 20;
    },
    removeEffect: (char) => {
      char.stats.strength -= 20;
    },
  },

  // Dexterity

  // Mining
  mining_3: {
    id: "mining_3",
    name: "Deep Excavation",
    description: "Mining XP +20%",
    icon: ICONS.talents.mining_3,
    cost: 2,
    prerequisites: ["mining_2"],
    position: { row: 2, col: 3 },
    effect: (char) => { },
  },
  mining_4: {
    id: "mining_4",
    name: "Gem Finder",
    description: "Chance to find gems while mining (Placeholder)",
    icon: ICONS.talents.mining_4,
    cost: 3,
    prerequisites: ["mining_3"],
    position: { row: 3, col: 3 },
    effect: (char) => { },
  },

  // Woodcutting
  woodcutting_3: {
    id: "woodcutting_3",
    name: "Forest Wrath",
    description: "Woodcutting XP +20%",
    icon: ICONS.talents.woodcutting_3,
    cost: 2,
    prerequisites: ["woodcutting_2"],
    position: { row: 2, col: 4 },
    effect: (char) => { },
  },
  woodcutting_4: {
    id: "woodcutting_4",
    name: "Nature's Bounty",
    description: "Chance to find rare wood (Placeholder)",
    icon: ICONS.talents.woodcutting_4,
    cost: 3,
    prerequisites: ["woodcutting_3"],
    position: { row: 3, col: 4 },
    effect: (char) => { },
  },

  // Fishing
  fishing_3: {
    id: "fishing_3",
    name: "Trawler",
    description: "Fishing XP +20%",
    icon: ICONS.talents.fishing_3,
    cost: 2,
    prerequisites: ["fishing_2"],
    position: { row: 2, col: 5 },
    effect: (char) => { },
  },
  fishing_4: {
    id: "fishing_4",
    name: "Legendary Bait",
    description: "Chance to catch legendary fish (Placeholder)",
    icon: ICONS.talents.fishing_4,
    cost: 3,
    prerequisites: ["fishing_3"],
    position: { row: 3, col: 5 },
    effect: (char) => { },
  },

  // Fighting
  fighting_3: {
    id: "fighting_3",
    name: "Berserker",
    description: "Fighting XP +20%",
    icon: ICONS.talents.fighting_3,
    cost: 2,
    prerequisites: ["fighting_2"],
    position: { row: 2, col: 6 },
    effect: (char) => { },
  },
  fighting_4: {
    id: "fighting_4",
    name: "Champion",
    description: "Critical Strike Chance +5% (Placeholder)",
    icon: ICONS.talents.fighting_4,
    cost: 3,
    prerequisites: ["fighting_3"],
    position: { row: 3, col: 6 },
    effect: (char) => { },
  },
  // Smithing
  smithing_1: {
    id: "smithing_1",
    name: "Blacksmith",
    description: "Increases Smithing XP by 10%",
    icon: ICONS.talents.smithing_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 8 },
    effect: (char) => { }, // Handled in gainXp
  },
  smithing_2: {
    id: "smithing_2",
    name: "Forge Master",
    description: "10% chance to smelt double bars",
    icon: ICONS.talents.smithing_2,
    cost: 1,
    prerequisites: ["smithing_1"],
    position: { row: 1, col: 8 },
    effect: (char) => { }, // Handled in Smithing Action
  },

  // Exploring Path
  exploring_1: {
    id: "exploring_1",
    name: "Surveyor",
    description: "Increases Exploring XP by 10%",
    icon: ICONS.talents.exploring_1,
    cost: 1,
    prerequisites: [],
    position: { row: 0, col: 9 },
    effect: (char) => { }, // Handled in gainXp
  },
  exploring_2: {
    id: "exploring_2",
    name: "Pathfinder",
    description: "10% chance for double XP gain",
    icon: ICONS.talents.exploring_2,
    cost: 1,
    prerequisites: ["exploring_1"],
    position: { row: 1, col: 9 },
    effect: (char) => { }, // Handled in Exploring Action
  },
};

export const getTalentDefinition = (id) => TALENT_DEFINITIONS[id];
