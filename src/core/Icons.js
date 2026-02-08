// Centralized emoji registry — single source of truth for all icons/symbols.
// Import from here instead of using inline emoji strings.

export const ICONS = {
  // ── Skills ────────────────────────────────────────────
  skills: {
    mining: "⛏️",
    woodcutting: "⚒️",
    fishing: "🎣",
    foraging: "🍃",
    fighting: "⚔️",
    smithing: "🔨",
    exploring: "🧭",
  },

  // ── Items ─────────────────────────────────────────────
  items: {
    // Ores
    copper_ore: "🟠",
    iron_ore: "⚪",
    coal: "⚫",
    gold_ore: "🟡",
    mithril_ore: "🔵",
    stone: "🌑",

    // Logs
    oak_log: "🌳",
    willow_log: "🌿",
    maple_log: "🍁",
    yew_log: "🌲",
    magic_log: "✨",

    // Fish
    raw_trout: "🐟",
    raw_salmon: "🐠",
    raw_tuna: "🦈",
    raw_lobster: "🦀",
    raw_swordfish: "🗡️",

    // Drops
    rat_bones: "🦴",
    goblin_mail: "👕",
    wolf_fur: "🧶",
    bones: "☠️",
    demon_ashes: "🌋",

    // Forageables
    red_berries: "🍒",
    blueberries: "🍇",
    fiber: "🧵",
    mushroom: "🍄",

    // Gems
    ruby: "🔴",
    sapphire: "💠",
    emerald: "🟢",
    topaz: "🔶",
    diamond: "💎",

    // Bars
    copper_bar: "🟧",
    iron_bar: "⬜",
    steel_bar: "🔩",
    gold_bar: "🟨",
    mithril_bar: "🔷",

    // Currency
    coins: "💰",
  },

  // ── Resource Nodes ────────────────────────────────────
  nodes: {
    mineral_node: "⛏️",
    gem_node: "🔮",
    coal_vein: "⚫",
    tree_node: "🌲",
    ancient_tree: "✨",
    fishing_spot: "🐟",
    bush_node: "🍒",
    fungi_node: "🍄",
  },

  // ── Skill Options (sub-actions) ───────────────────────
  skillOptions: {
    mine_minerals: "🌑",
    mine_coal: "⚫",
    mine_gems: "🔮",
    chop_wood: "🌲",
    chop_ancient: "✨",
    fish_spot: "🐟",
    forage_bush: "🍒",
    forage_fungi: "🍄",
    wander_expansion: "🏡",
  },

  // ── Monsters ──────────────────────────────────────────
  monsters: {
    rat: "🐀",
    goblin: "👹",
    wolf: "🐺",
    skeleton: "💀",
    demon: "👿",
  },

  // ── Terrain / Biomes ──────────────────────────────────
  biomes: {
    OCEAN: "🌊",
    SHALLOW_OCEAN: "🐚",
    BEACH: "🏖️",
    POLAR_DESERT: "🌨️",
    ICE_SHEET: "❄️",
    ALPINE_TUNDRA: "🐐",
    TUNDRA: "🏔️",
    BOREAL_FOREST: "🌲",
    ALPINE: "⛰️",
    TEMPERATE_DESERT: "🐍",
    SHRUBLAND: "🌿",
    TEMPERATE_GRASSLAND: "🌾",
    TEMPERATE_DECIDUOUS_FOREST: "🌳",
    TEMPERATE_RAINFOREST: "🐻",
    SUBTROPICAL_DESERT: "🌵",
    TROPICAL_SAVANNA: "🐘",
    TROPICAL_RAINFOREST: "🌴",
    HOME: "🏠",
    SWAMP: "🐊",
  },

  // ── Talents ───────────────────────────────────────────
  talents: {
    // Mining path
    mining_1: "⛏️",
    mining_2: "💎",
    mining_3: "⛰️",
    mining_4: "🔍",

    // Woodcutting path
    woodcutting_1: "⚒️",
    woodcutting_2: "🌲",
    woodcutting_3: "🌳",
    woodcutting_4: "🍁",

    // Fishing path
    fishing_1: "🎣",
    fishing_2: "🐟",
    fishing_3: "🕸️",
    fishing_4: "🦈",

    // Fighting path
    fighting_1: "⚔️",
    fighting_2: "💰",
    fighting_3: "😡",
    fighting_4: "🏆",

    // Fighting defense
    fighting_def_1: "🛡️",
    fighting_def_2: "🏰",

    // Strength
    str_3: "💪",
    str_4: "✊",

    // Smithing path
    smithing_1: "🔨",
    smithing_2: "🔥",

    // Exploring path
    exploring_1: "🧭",
    exploring_2: "🗺️",
  },

  // ── Stores ────────────────────────────────────────────
  stores: {
    general_store: "🏪",
    blacksmith: "🔨",
  },

  // ── UI Navigation ─────────────────────────────────────
  nav: {
    characters: "🦸",
    inventory: "🎒",
    equipment: "🛡️",
    codex: "📖",
    talents: "🌳",
    store: "🏪",
    map: "🗺️",
    settings: "⚙️",
  },

  // ── Equipment Slots ───────────────────────────────────
  equipSlots: {
    head: "🧢",
    chest: "👕",
    belt: "🥋",
    gloves: "🧤",
    legs: "👖",
    feet: "👢",
    mainHand: "⚔️",
    offHand: "🛡️",
    ring: "💍",
    trinket: "🧿",
    avatar: "👤",
  },

  // ── Codex Categories ──────────────────────────────────
  codex: {
    monsters: "⚔️",
    nodes: "⛏️",
    recipes: "🔨",
    biomes: "🌍",
    items: "📦",
  },

  // ── Misc ──────────────────────────────────────────────
  misc: {
    unknown: "🎒",
    locked: "❓",
    character: "🧙‍♂️",
    home: "🏠",
    checkmark: "✔",
    package: "📦",
  },
};
