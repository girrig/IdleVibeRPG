import { getItemDefinition } from "./ItemRegistry.js";
import { SKILL_COLORS, GAME_CONFIG } from "./Constants.js";
import { mapManager } from "./MapManager.js";
import { TERRAIN_TYPES } from "./TerrainTypes.js";

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
  EXPLORING: {
    id: "EXPLORING",
    name: "Exploring",
    icon: "🧭",
    color: SKILL_COLORS.EXPLORING,
    continuous: true,
    options: {
      wander: {
        name: "Wander",
        level: 1,
        xp: 15,
        icon: "🥾",
      },
      // Level 1-2: Easy / Common
      find_grassland: {
        name: "Find Grassland",
        level: 1,
        xp: 20,
        icon: TERRAIN_TYPES.TEMPERATE_GRASSLAND.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id,
      },
      find_beach: {
        name: "Find Beach",
        level: 2,
        xp: 22,
        icon: TERRAIN_TYPES.BEACH.symbol,
        biomeId: TERRAIN_TYPES.BEACH.id,
      },
      // Level 3-5
      find_shallow_ocean: {
        name: "Find Shallows",
        level: 3,
        xp: 25,
        icon: TERRAIN_TYPES.SHALLOW_OCEAN.symbol,
        biomeId: TERRAIN_TYPES.SHALLOW_OCEAN.id,
      },
      find_forest: {
        name: "Find Forest",
        level: 5,
        xp: 30,
        icon: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
      },
      find_shrubland: {
        name: "Find Shrubland",
        level: 5,
        xp: 30,
        icon: TERRAIN_TYPES.SHRUBLAND.symbol,
        biomeId: TERRAIN_TYPES.SHRUBLAND.id,
      },
      // Level 10
      find_desert: {
        name: "Find Desert",
        level: 10,
        xp: 40,
        icon: TERRAIN_TYPES.SUBTROPICAL_DESERT.symbol,
        biomeId: TERRAIN_TYPES.SUBTROPICAL_DESERT.id,
      },
      find_boreal_forest: {
        name: "Find Boreal Forest",
        level: 10,
        xp: 40,
        icon: TERRAIN_TYPES.BOREAL_FOREST.symbol,
        biomeId: TERRAIN_TYPES.BOREAL_FOREST.id,
      },
      find_swamp: {
        name: "Find Swamp",
        level: 10,
        xp: 45,
        icon: TERRAIN_TYPES.SWAMP.symbol,
        biomeId: TERRAIN_TYPES.SWAMP.id,
      },
      // Level 15
      find_temperate_rainforest: {
        name: "Find Temp. Rainforest",
        level: 15,
        xp: 50,
        icon: TERRAIN_TYPES.TEMPERATE_RAINFOREST.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_RAINFOREST.id,
      },
      find_tropical_savanna: {
        name: "Find Savanna",
        level: 15,
        xp: 50,
        icon: TERRAIN_TYPES.TROPICAL_SAVANNA.symbol,
        biomeId: TERRAIN_TYPES.TROPICAL_SAVANNA.id,
      },
      // Level 20
      find_mountain: {
        name: "Find Mountain",
        level: 20,
        xp: 60,
        icon: TERRAIN_TYPES.ALPINE.symbol,
        biomeId: TERRAIN_TYPES.ALPINE.id,
      },
      find_temperate_desert: {
        name: "Find Temp. Desert",
        level: 20,
        xp: 60,
        icon: TERRAIN_TYPES.TEMPERATE_DESERT.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_DESERT.id,
      },
      find_tropical_rainforest: {
        name: "Find Jungle",
        level: 20,
        xp: 65,
        icon: TERRAIN_TYPES.TROPICAL_RAINFOREST.symbol,
        biomeId: TERRAIN_TYPES.TROPICAL_RAINFOREST.id,
      },
      // Level 25
      find_tundra: {
        name: "Find Tundra",
        level: 25,
        xp: 70,
        icon: TERRAIN_TYPES.TUNDRA.symbol,
        biomeId: TERRAIN_TYPES.TUNDRA.id,
      },
      // Level 30
      find_ocean: {
        name: "Find Ocean",
        level: 30,
        xp: 80,
        icon: TERRAIN_TYPES.OCEAN.symbol,
        biomeId: TERRAIN_TYPES.OCEAN.id,
      },
      find_alpine_tundra: {
        name: "Find Alpine Tundra",
        level: 30,
        xp: 80,
        icon: TERRAIN_TYPES.ALPINE_TUNDRA.symbol,
        biomeId: TERRAIN_TYPES.ALPINE_TUNDRA.id,
      },
      // Level 35
      find_polar_desert: {
        name: "Find Polar Desert",
        level: 35,
        xp: 90,
        icon: TERRAIN_TYPES.POLAR_DESERT.symbol,
        biomeId: TERRAIN_TYPES.POLAR_DESERT.id,
      },
      find_ice_sheet: {
        name: "Find Ice Sheet",
        level: 35,
        xp: 95,
        icon: TERRAIN_TYPES.ICE_SHEET.symbol,
        biomeId: TERRAIN_TYPES.ICE_SHEET.id,
      },
    },
    interval: 3000,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.EXPLORING.options[targetId];

      // Initialize Phase if missing
      if (!char.currentActivity.phase) {
        // "Start from the town": Reset position to Home
        char.position = { x: 250, y: 250 };

        char.currentActivity.phase = "SEARCHING"; // Default
        if (targetId === "wander") char.currentActivity.phase = "WANDERING";

        gameState.triggerNotification("Departing from home...", "activity");
      }

      const phase = char.currentActivity.phase;
      const { x, y } = char.position;
      let nextPos = null;

      // --- PHASE 1: SEARCHING ---
      if (phase === "SEARCHING") {
        // If we are ALREADY in the target biome, switch to EXPLORING
        const currentTile = mapManager.getTile(x, y);
        if (option.biomeId && currentTile.type === option.biomeId) {
          char.currentActivity.phase = "EXPLORING";
          // gameState.triggerNotification("Found " + option.name + "! Exploring...", "success"); // Spammy?
          // Fallthrough to EXPLORING logic immediately
        } else {
          // Look for KNOWN but UNVISITED tiles of this type
          const target = mapManager.findNearestExploredUnvisitedTile(
            option.biomeId,
            x,
            y,
          );
          if (target) {
            // Move towards it (Manhattan)
            const dx = Math.sign(target.x - x);
            const dy = Math.sign(target.y - y);
            // Basic pathfinding
            if (dx !== 0 && Math.random() < 0.5) nextPos = { x: x + dx, y: y };
            else if (dy !== 0) nextPos = { x: x, y: y + dy };
            else if (dx !== 0) nextPos = { x: x + dx, y: y };
          }

          // If no known tile of that type, find the FRONTIER to reveal new areas
          if (!nextPos) {
            const frontier = mapManager.findNearestFrontierTile(x, y);
            if (frontier) {
              // If we are AT the frontier, step into the unknown
              if (frontier.x === x && frontier.y === y) {
                const neighbors = [
                  { x: x + 1, y: y },
                  { x: x - 1, y: y },
                  { x: x, y: y + 1 },
                  { x: x, y: y - 1 },
                ];
                // Find any unexplored neighbor
                const unknown = neighbors.find((n) => {
                  const t = mapManager.getTile(n.x, n.y);
                  return t && !t.explored;
                });

                if (unknown) nextPos = unknown;
              } else {
                // Move towards frontier
                const dx = Math.sign(frontier.x - x);
                const dy = Math.sign(frontier.y - y);
                if (dx !== 0 && Math.random() < 0.5)
                  nextPos = { x: x + dx, y: y };
                else if (dy !== 0) nextPos = { x: x, y: y + dy };
                else if (dx !== 0) nextPos = { x: x + dx, y: y };
              }
            }
          }
        }
      }

      // --- PHASE 2: EXPLORING ---
      if (char.currentActivity.phase === "EXPLORING") {
        // We are inside the biome. We want to find UNEXPLORED tiles in this region.
        // 1. Identify Region
        // Optimization: We could cache the region Set in activity, but it might be large.
        // MapManager handles it reasonably fast for small inputs, but 500x500 map...
        // Let's re-calculate for now. Real-time pathfinding.

        // We are inside the biome. We want to find UNEXPLORED tiles in this region.
        // Use "Flooding" logic: Find nearest unexplored tile connected by VISIBLE matching biome tiles.
        // This ensures we fully explore the contiguous biome we discovered without "cheating" through fog.

        let target = null;

        // If we are looking for a SPECIFIC biome, we use that.
        // If we were just WANDERING and stumbled into something, we might want to flood whatever we are standing on.
        // But usually EXPLORING phase is triggered by "Find X". So option.biomeId is set.

        if (option.biomeId) {
          // PRIORITY 1: Look for KNOWN but UNVISITED tiles of this type
          // This ensures we fully "walk" the visible forest before running to the unknown edge.
          target = mapManager.findNearestExploredUnvisitedTile(
            option.biomeId,
            x,
            y,
          );

          // PRIORITY 2: If we have visited all known tiles, find the UNEXPLORED frontier
          if (!target) {
            target = mapManager.findNearestUnexploredInAdjacentBiome(
              x,
              y,
              option.biomeId,
            );
          }
        } else {
          // Fallback if no specific target biome (e.g. wander -> explore? Not implemented yes)
          // Just default to current tile type?
          const currentTile = mapManager.getTile(x, y);
          if (currentTile) {
            // For generic exploration, finding unvisited of current type seems mostly correct too?
            // But for now let's stick to the Frontier logic for generic,
            // or maybe apply the same logic. Let's start with just the directed case.
            target = mapManager.findNearestUnexploredInAdjacentBiome(
              x,
              y,
              currentTile.type,
            );
          }
        }

        if (target) {
          // Move towards it
          const dx = Math.sign(target.x - x);
          const dy = Math.sign(target.y - y);
          if (dx !== 0 && Math.random() < 0.5) nextPos = { x: x + dx, y: y };
          else if (dy !== 0) nextPos = { x: x, y: y + dy };
          else if (dx !== 0) nextPos = { x: x + dx, y: y };
        } else {
          // No unexplored tiles left in this region!
          char.currentActivity.phase = "RETURNING";
          gameState.triggerNotification(
            `${option.name} fully explored! Returning home.`,
            "success",
          );
        }
      }

      // --- PHASE 3: RETURNING ---
      if (char.currentActivity.phase === "RETURNING") {
        const homeX = 250;
        const homeY = 250;

        if (x === homeX && y === homeY) {
          char.stopActivity();
          gameState.triggerNotification("Returned home safely.", "success");
          return;
        }

        const dx = Math.sign(homeX - x);
        const dy = Math.sign(homeY - y);
        if (dx !== 0 && Math.random() < 0.5) nextPos = { x: x + dx, y: y };
        else if (dy !== 0) nextPos = { x: x, y: y + dy };
        else if (dx !== 0) nextPos = { x: x + dx, y: y };
      }

      // --- PHASE 0: WANDERING (Fallback) ---
      if (char.currentActivity.phase === "WANDERING") {
        // 1. Check immediate neighbors for UNEXPLORED tiles
        const neighbors = [
          { x: x + 1, y: y },
          { x: x - 1, y: y },
          { x: x, y: y + 1 },
          { x: x, y: y - 1 },
        ];

        const unexploredNeighbors = neighbors.filter((n) => {
          const t = mapManager.getTile(n.x, n.y);
          return t && !t.explored;
        });

        if (unexploredNeighbors.length > 0) {
          nextPos =
            unexploredNeighbors[
              Math.floor(Math.random() * unexploredNeighbors.length)
            ];
        } else {
          // 2. If all neighbors explored, find nearest Frontier
          const frontier = mapManager.findNearestFrontierTile(x, y);
          if (frontier) {
            const dx = Math.sign(frontier.x - x);
            const dy = Math.sign(frontier.y - y);
            if (dx !== 0 && Math.random() < 0.5) nextPos = { x: x + dx, y: y };
            else if (dy !== 0) nextPos = { x: x, y: y + dy };
            else if (dx !== 0) nextPos = { x: x + dx, y: y };
          }
        }
      }

      // Fallback: Random Wander (if not seeking or no target found)
      if (!nextPos) {
        const neighbors = [
          { x: x + 1, y: y },
          { x: x - 1, y: y },
          { x: x, y: y + 1 },
          { x: x, y: y - 1 },
        ];
        const validNeighbors = neighbors.filter(
          (n) => n.x >= 0 && n.x < 500 && n.y >= 0 && n.y < 500,
        ); // Hardcoded 500 for now or access mapManager.width
        if (validNeighbors.length > 0) {
          nextPos =
            validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        }
      }

      if (!nextPos) return;

      // Move
      char.position = nextPos;
      mapManager.visitTile(nextPos.x, nextPos.y);

      // Explore with Radius
      const sightRadius = char.stats.sightRange || 3;
      const revealedTiles = mapManager.exploreRadius(
        nextPos.x,
        nextPos.y,
        sightRadius,
      );

      // XP Logic
      // Base rate from Wander option
      const wanderXp = SKILL_DEFINITIONS.EXPLORING.options.wander.xp; // e.g. 15

      let totalXp = 0;

      if (revealedTiles.length > 0) {
        revealedTiles.forEach((tile) => {
          let tileXp = wanderXp;

          // Bonus if it's the specific target biome we want
          // "specific tiles we want ... should be the base rate plus a bonus"
          // We use option.xp as the total value (Base + Bonus)
          if (option.biomeId && tile.type === option.biomeId) {
            tileXp = option.xp;
          }
          totalXp += tileXp;
        });

        // Notify removed as per user request
      }

      if (totalXp > 0) {
        if (char.talents.exploring_2 && Math.random() < 0.1) {
          totalXp *= 2;
          // gameState.triggerNotification("Double Exploration XP!", "success");
        }
        char.gainXp("exploring", totalXp);
      }
    },
  },
};

export const getSkillDefinition = (type) => {
  return SKILL_DEFINITIONS[type] || null;
};
