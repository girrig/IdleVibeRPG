import { getItemDefinition } from "./ItemRegistry.js";
import { SKILL_COLORS, GAME_CONFIG, RESOURCE_NODES } from "./Constants.js";
import { mapManager } from "./MapManager.js";
import { TERRAIN_TYPES } from "./TerrainTypes.js";

export const SKILL_DEFINITIONS = {
  MINING: {
    id: "MINING",
    name: "Mining",
    icon: "⛏️",
    color: SKILL_COLORS.MINING,
    options: {
      mine_minerals: {
        resourceId: "mineral_node",
        name: "Mine Minerals",
        level: 1,
        xp: 15, // Base XP, effectively varied by drop? Or constant? Constant is fine for now.
        icon: "🌑", // Replaced 🪨
        interval: 3000,
      },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      // Find available mineral nodes
      const allResources = gameState.availableResources;
      const mineralKeys = Object.keys(allResources).filter((k) =>
        k.startsWith("mineral_node:"),
      );

      if (mineralKeys.length === 0) {
        // Double check generic "mineral_node" just in case of legacy/fallback
        if (gameState.getAvailableResourceCount("mineral_node") > 0) {
          // Fallback for generic nodes without biome?
          // Treat as default.
        } else {
          gameState.triggerNotification(
            "No mineral veins found! Explore more areas.",
            "error",
          );
          char.stopActivity();
          return;
        }
      }

      // Weighted Random Selection of Source Node
      // P(Biome) = Count(Biome) / TotalCounts
      let totalNodes = 0;
      const candidates = [];
      mineralKeys.forEach((key) => {
        const count = allResources[key];
        if (count > 0) {
          totalNodes += count;
          candidates.push({ key, count });
        }
      });

      if (totalNodes === 0) {
        char.stopActivity();
        return;
      }

      let r = Math.random() * totalNodes;
      let selectedKey = candidates[0].key;
      for (const c of candidates) {
        if (r < c.count) {
          selectedKey = c.key;
          break;
        }
        r -= c.count;
      }

      // Logic: Biome is suffix
      const biome = selectedKey.split(":")[1];
      const nodeDef = RESOURCE_NODES.mineral_node;

      // Get Loot Table
      let table = nodeDef.default_drops;
      if (nodeDef.biome_drops && nodeDef.biome_drops[biome]) {
        table = nodeDef.biome_drops[biome];
      }

      // Roll Loot
      // Sum weights
      const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = Math.random() * totalWeight;
      let dropItem = table[0].item;
      for (const entry of table) {
        if (roll < entry.weight) {
          dropItem = entry.item;
          break;
        }
        roll -= entry.weight;
      }

      // Action
      // 1. Consume Node
      // Talent: mining_2 (Double Ore?) -> Does it mean consume 1 get 2? Or just double resource?
      // Let's keep it simple: consume 1 node, get 1 item (chance for 2 items)
      gameState.consumeAvailableResource(selectedKey, 1);

      let amount = 1;
      if (char.talents.mining_2 && Math.random() < 0.1) {
        amount = 2;
        gameState.triggerNotification("Double Ore!", "success");
      }

      gameState.inventory.addItem(dropItem, amount);
      char.gainXp("mining", 20); // Flat XP for mining the node
    },
  },
  WOODCUTTING: {
    id: "WOODCUTTING",
    name: "Woodcutting",
    icon: "🪓",
    color: SKILL_COLORS.WOODCUTTING,
    options: {
      chop_wood: { name: "Chop Wood", resourceId: "tree_node", level: 1, xp: 20, icon: "🌲", interval: 3000 },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      // Find available tree nodes
      const allResources = gameState.availableResources;
      const treeKeys = Object.keys(allResources).filter((k) =>
        k.startsWith("tree_node:")
      );

      if (treeKeys.length === 0) {
        gameState.triggerNotification("No forests found! Explore more areas.", "error");
        char.stopActivity();
        return;
      }

      // Weighted Random Selection
      let totalNodes = 0;
      const candidates = [];
      treeKeys.forEach((key) => {
        const count = allResources[key];
        if (count > 0) {
          totalNodes += count;
          candidates.push({ key, count });
        }
      });

      if (totalNodes === 0) {
        char.stopActivity();
        return;
      }

      let r = Math.random() * totalNodes;
      let selectedKey = candidates[0].key;
      for (const c of candidates) {
        if (r < c.count) {
          selectedKey = c.key;
          break;
        }
        r -= c.count;
      }

      // Logic: Biome is suffix
      const biome = selectedKey.split(":")[1];
      const nodeDef = RESOURCE_NODES.tree_node;

      let table = nodeDef.default_drops;
      if (nodeDef.biome_drops && nodeDef.biome_drops[biome]) {
        table = nodeDef.biome_drops[biome];
      }

      const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = Math.random() * totalWeight;
      let dropItem = table[0].item;
      for (const entry of table) {
        if (roll < entry.weight) {
          dropItem = entry.item;
          break;
        }
        roll -= entry.weight;
      }

      // Action
      gameState.consumeAvailableResource(selectedKey, 1);

      let amount = 1;
      if (char.talents.woodcutting_2 && Math.random() < 0.1) {
        amount = 2;
      }

      gameState.inventory.addItem(dropItem, amount);
      char.gainXp("woodcutting", 20);
    },
  },
  FISHING: {
    id: "FISHING",
    name: "Fishing",
    icon: "🎣",
    color: SKILL_COLORS.FISHING,
    options: {
      fish_spot: { name: "Catch Fish", resourceId: "fishing_spot", level: 1, xp: 15, icon: "🐟", interval: 3000 },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      // Find available fishing spots
      const allResources = gameState.availableResources;
      const fishKeys = Object.keys(allResources).filter((k) =>
        k.startsWith("fishing_spot:")
      );

      if (fishKeys.length === 0) {
        gameState.triggerNotification("No fishing spots found! Explore the coast.", "error");
        char.stopActivity();
        return;
      }

      // Weighted Random Selection
      let totalNodes = 0;
      const candidates = [];
      fishKeys.forEach((key) => {
        const count = allResources[key];
        if (count > 0) {
          totalNodes += count;
          candidates.push({ key, count });
        }
      });

      if (totalNodes === 0) {
        char.stopActivity();
        return;
      }

      let r = Math.random() * totalNodes;
      let selectedKey = candidates[0].key;
      for (const c of candidates) {
        if (r < c.count) {
          selectedKey = c.key;
          break;
        }
        r -= c.count;
      }

      // Logic: Biome is suffix
      const biome = selectedKey.split(":")[1];
      const nodeDef = RESOURCE_NODES.fishing_spot;

      let table = nodeDef.default_drops;
      if (nodeDef.biome_drops && nodeDef.biome_drops[biome]) {
        table = nodeDef.biome_drops[biome];
      }

      const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = Math.random() * totalWeight;
      let dropItem = table[0].item;
      for (const entry of table) {
        if (roll < entry.weight) {
          dropItem = entry.item;
          break;
        }
        roll -= entry.weight;
      }

      // Action
      gameState.consumeAvailableResource(selectedKey, 1);

      let amount = 1;
      if (char.talents.fishing_2 && Math.random() < 0.1) {
        amount = 2;
        // gameState.triggerNotification("Double Fish!", "success");
      }

      gameState.inventory.addItem(dropItem, amount);
      char.gainXp("fishing", 20);
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
      wander_expansion: {
        name: "Expansion",
        level: 1,
        xp: 15,
        icon: "🏡",
        description: "Reveals new areas near home.",
        risk: "Low",
      },

      // Level 1-2: Easy / Common
      find_grassland: {
        // ...

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
        if (targetId.startsWith("wander")) char.currentActivity.phase = "WANDERING";

        gameState.triggerNotification("Departing from home...", "activity");
      }

      const phase = char.currentActivity.phase;
      const { x, y } = char.position;
      let nextPos = null;

      const isValidMove = (nx, ny) => {
        const width = mapManager.width || 500;
        const height = mapManager.height || 500;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
        const t = mapManager.getTile(nx, ny);
        if (t && (t.type === TERRAIN_TYPES.OCEAN.id || t.type === TERRAIN_TYPES.SHALLOW_OCEAN.id)) return false;
        return true;
      };

      const tryStep = (nx, ny) => {
        if (isValidMove(nx, ny)) {
          nextPos = { x: nx, y: ny };
          return true;
        }
        return false;
      };

      const moveTowards = (dx, dy) => {
        if (dx !== 0 && dy !== 0) {
          if (Math.random() < 0.5) {
            if (!tryStep(x + dx, y)) tryStep(x, y + dy);
          } else {
            if (!tryStep(x, y + dy)) tryStep(x + dx, y);
          }
        } else if (dx !== 0) {
          tryStep(x + dx, y);
        } else if (dy !== 0) {
          tryStep(x, y + dy);
        }
      };

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
            // Basic pathfinding
            moveTowards(dx, dy);
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

          if (dx === 0 && dy === 0) {
            nextPos = { x, y }; // Visit current
          }
          else if (dx !== 0 && Math.random() < 0.5) nextPos = { x: x + dx, y: y };
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

      // --- PHASE 0: WANDERING (Specific Algorithmic Support) ---
      if (char.currentActivity.phase === "WANDERING") {
        const type = targetId.split("_")[1] || "frontier"; // expansion, frontier, expedition


        // 1. EXPANSION: Fill gaps near HOME
        if (type === "expansion") {
          // Find nearest FRONTIER tile spanning out from Home (250, 250)
          // This prioritizes revealing the Fog of War closest to town.
          const target = mapManager.findNearestFrontierTile(250, 250);

          if (target) {
            const dx = Math.sign(target.x - x);
            const dy = Math.sign(target.y - y);

            if (dx === 0 && dy === 0) {
              // We are AT the frontier (Explored edge).
              // Step randomly to push into Unexplored
              const neighbors = [
                { x: x + 1, y: y },
                { x: x - 1, y: y },
                { x: x, y: y + 1 },
                { x: x, y: y - 1 },
              ];
              const unknown = neighbors.find((n) => {
                if (!isValidMove(n.x, n.y)) return false; // Don't step into water/out of bounds
                const t = mapManager.getTile(n.x, n.y);
                return t && !t.explored;
              });
              if (unknown) nextPos = unknown;
              else {
                // Fallback if surrounded by explored?
                // Should theoretically find new frontier next tick?
                // Just random walk to acceptable tile
                const validNeighbors = neighbors.filter((n) =>
                  isValidMove(n.x, n.y),
                );
                if (validNeighbors.length > 0) {
                  nextPos =
                    validNeighbors[
                    Math.floor(Math.random() * validNeighbors.length)
                    ];
                }
              }
            } else {
              moveTowards(dx, dy);
            }
          }
        }
      }

      // Fallback if logic failed to produce nextPos (e.g. map fully explored)
      if (!nextPos && char.currentActivity.phase === "WANDERING") {
        // Random walk
        const neighbors = [
          { x: x + 1, y: y }, { x: x - 1, y: y },
          { x: x, y: y + 1 }, { x: x, y: y - 1 },
        ];
        const valid = neighbors.filter(n => isValidMove(n.x, n.y));
        if (valid.length > 0) nextPos = valid[Math.floor(Math.random() * valid.length)];
      }

      if (!nextPos) return;

      // Move
      char.position = nextPos;
      // Move
      char.position = nextPos;
      const isNewVisit = mapManager.visitTile(nextPos.x, nextPos.y);
      // isNewVisit logic for resources REMOVED. Resources are now discovered on EXPLORE (visibility).

      // Explore with Radius
      const sightRadius = char.stats.sightRange || 3;
      const revealedTiles = mapManager.exploreRadius(
        nextPos.x,
        nextPos.y,
        sightRadius,
      );

      // XP Logic
      // Base rate from specific Wander option or default to safe
      let wanderXp = 10;
      if (SKILL_DEFINITIONS.EXPLORING.options[targetId]) {
        wanderXp = SKILL_DEFINITIONS.EXPLORING.options[targetId].xp;
      }

      let totalXp = 0;

      if (revealedTiles.length > 0) {
        revealedTiles.forEach((tile) => {
          // 1. RESOURCE DISCOVERY
          if (tile.resource) {
            const key = `${tile.resource.type}:${tile.type}`;
            gameState.addAvailableResource(key, tile.resource.amount);
            // Optional: Notification for big finds?
            // gameState.triggerNotification(`Found ${tile.resource.amount} ${tile.resource.type}!`, "success");
          }

          let tileXp = wanderXp;

          // Bonus if it's the specific target biome we want
          // "specific tiles we want ... should be the base rate plus a bonus"
          // We use option.xp as the total value (Base + Bonus)
          if (option && option.biomeId && tile.type === option.biomeId) {
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
