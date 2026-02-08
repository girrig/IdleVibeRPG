import { getItemDefinition } from "./ItemRegistry.js";
import { GAME_CONFIG, RESOURCE_NODES } from "./Constants.js";
import { mapManager } from "./MapManager.js";
import { TERRAIN_TYPES } from "./TerrainTypes.js";
import { ICONS } from "./Icons.js";

// Reverse mapping: itemId → [{ nodeType, biome }]
// e.g. "maple_log" → [{ nodeType: "tree_node", biome: "TEMPERATE_DECIDUOUS_FOREST" }]
function buildItemToNodeMap() {
  const map = {};
  Object.entries(RESOURCE_NODES).forEach(([nodeType, nodeDef]) => {
    if (nodeDef.biome_drops) {
      Object.entries(nodeDef.biome_drops).forEach(([biome, drops]) => {
        drops.forEach(({ item }) => {
          if (!map[item]) map[item] = [];
          map[item].push({ nodeType, biome });
        });
      });
    }
    if (nodeDef.default_drops) {
      nodeDef.default_drops.forEach(({ item }) => {
        if (!map[item]) map[item] = [];
        (nodeDef.allowedBiomes || []).forEach((biome) => {
          if (!nodeDef.biome_drops || !nodeDef.biome_drops[biome]) {
            map[item].push({ nodeType, biome });
          }
        });
      });
    }
  });
  return map;
}

export const ITEM_TO_NODE_MAP = buildItemToNodeMap();

export const SKILL_DEFINITIONS = {
  MINING: {
    id: "MINING",
    name: "Mining",
    icon: ICONS.skills.mining,
    color: "#e67e22",
    options: {
      mine_minerals: {
        resourceId: "mineral_node",
        name: "Mine Minerals",
        level: 1,
        xp: 15, // Base XP, effectively varied by drop? Or constant? Constant is fine for now.
        icon: ICONS.skillOptions.mine_minerals,
        interval: 3000,
      },
      mine_coal: {
        resourceId: "coal_vein",
        name: "Mine Coal",
        level: 5,
        xp: 25,
        icon: ICONS.skillOptions.mine_coal,
        interval: 3500,
      },
      mine_gems: {
        resourceId: "gem_node",
        name: "Crack Geode",
        level: 15,
        xp: 40,
        icon: ICONS.skillOptions.mine_gems,
        interval: 5000,
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
    icon: ICONS.skills.woodcutting,
    color: "#2ecc71",
    options: {
      chop_wood: { name: "Chop Wood", resourceId: "tree_node", level: 1, xp: 20, icon: ICONS.skillOptions.chop_wood, interval: 3000 },
      chop_ancient: { name: "Chop Ancient", resourceId: "ancient_tree", level: 25, xp: 50, icon: ICONS.skillOptions.chop_ancient, interval: 3000 },
    },
    continuous: true,
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.WOODCUTTING.options[targetId];
      if (!option) return;

      const targetItem = char.activeGoal ? char.activeGoal.targetItem : null;

      // --- PHASE INITIALIZATION ---
      if (!char.currentActivity.phase) {
        char.position = { x: 250, y: 250 };
        char.currentActivity.phase = "TRAVELING";
        char.currentActivity.targetTile = null;
        gameState.triggerNotification("Setting out to find trees...", "activity");
      }

      const { x, y } = char.position;
      let nextPos = null;

      // --- Movement helpers (same as exploring) ---
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

      const moveTowards = (tx, ty) => {
        const dx = Math.sign(tx - x);
        const dy = Math.sign(ty - y);
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

      // --- PHASE 1: TRAVELING ---
      if (char.currentActivity.phase === "TRAVELING") {
        if (!char.currentActivity.targetTile) {
          let validSources;
          if (targetItem && ITEM_TO_NODE_MAP[targetItem]) {
            validSources = ITEM_TO_NODE_MAP[targetItem].filter(
              s => s.nodeType === option.resourceId
            );
          } else {
            const nodeDef = RESOURCE_NODES[option.resourceId];
            validSources = (nodeDef.allowedBiomes || []).map(biome => ({
              nodeType: option.resourceId,
              biome
            }));
          }

          const target = mapManager.findNearestExploredResourceTile(validSources, x, y);

          if (!target) {
            gameState.triggerNotification(
              targetItem
                ? `No trees found for ${getItemDefinition(targetItem)?.name || targetItem}! Explore more forests.`
                : "No trees found! Explore more forests.",
              "error"
            );
            char.stopActivity();
            return;
          }

          char.currentActivity.targetTile = target;
        }

        const target = char.currentActivity.targetTile;

        if (x === target.x && y === target.y) {
          const tile = mapManager.getTile(x, y);
          if (!tile || !tile.resource || tile.resource.type !== target.nodeType) {
            char.currentActivity.targetTile = null;
            return;
          }
          char.currentActivity.phase = "CHOPPING";
        } else {
          moveTowards(target.x, target.y);
        }
      }

      // --- PHASE 2: CHOPPING ---
      if (char.currentActivity.phase === "CHOPPING") {
        const tile = mapManager.getTile(x, y);

        let dropItem;
        if (targetItem) {
          dropItem = targetItem;
        } else {
          const nodeDef = RESOURCE_NODES[option.resourceId];
          let table = nodeDef.default_drops;
          if (nodeDef.biome_drops && nodeDef.biome_drops[tile.type]) {
            table = nodeDef.biome_drops[tile.type];
          }
          const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
          let roll = Math.random() * totalWeight;
          dropItem = table[0].item;
          for (const entry of table) {
            if (roll < entry.weight) { dropItem = entry.item; break; }
            roll -= entry.weight;
          }
        }

        const resourceKey = `${tile.resource.type}:${tile.type}`;
        gameState.consumeAvailableResource(resourceKey, 1);
        tile.resource = null; // Remove from map so icon disappears

        let amount = 1;
        if (char.talents.woodcutting_2 && Math.random() < 0.1) {
          amount = 2;
        }

        gameState.inventory.addItem(dropItem, amount);
        char.gainXp("woodcutting", option.xp || 20);

        char.currentActivity.targetTile = null;
        char.currentActivity.phase = "RETURNING";
        return;
      }

      // --- PHASE 3: RETURNING ---
      if (char.currentActivity.phase === "RETURNING") {
        const homeX = 250;
        const homeY = 250;

        if (x === homeX && y === homeY) {
          if (char.currentActivity.stopping) {
            char.position = { x: 250, y: 250 };
            char.currentActivity = null;
            char.activityQueue = [];
            gameState.triggerNotification("Returned home safely.", "success");
            return;
          }
          char.currentActivity.phase = "TRAVELING";
          return;
        }

        moveTowards(homeX, homeY);
      }

      // --- MOVE + FOG REVEAL ---
      if (nextPos) {
        char.position = nextPos;
        mapManager.visitTile(nextPos.x, nextPos.y);

        const sightRadius = char.stats.sightRange || 3;
        const revealedTiles = mapManager.exploreRadius(nextPos.x, nextPos.y, sightRadius);

        if (revealedTiles.length > 0) {
          revealedTiles.forEach((tile) => {
            if (tile.resource) {
              const key = `${tile.resource.type}:${tile.type}`;
              gameState.addAvailableResource(key, 1);
              gameState.addDiscovery(`node:${tile.resource.type}`);
            }
            gameState.addDiscovery(`biome:${tile.type}`);
          });
        }
      }
    },
  },
  FISHING: {
    id: "FISHING",
    name: "Fishing",
    icon: ICONS.skills.fishing,
    color: "#3498db",
    options: {
      fish_spot: { name: "Catch Fish", resourceId: "fishing_spot", level: 1, xp: 15, icon: ICONS.skillOptions.fish_spot, interval: 3000 },
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
  FORAGING: {
    id: "FORAGING",
    name: "Foraging",
    icon: ICONS.skills.foraging,
    color: "#16a34a",
    options: {
      forage_bush: { name: "Forage Bushes", resourceId: "bush_node", level: 1, xp: 10, icon: ICONS.skillOptions.forage_bush, interval: 2500 },
      forage_fungi: { name: "Gather Fungi", resourceId: "fungi_node", level: 5, xp: 15, icon: ICONS.skillOptions.forage_fungi, interval: 3000 },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      // Determine target resource based on option
      const targetId = char.currentActivity.target; // e.g. "forage_bush"
      const option = SKILL_DEFINITIONS.FORAGING.options[targetId];
      if (!option) return;

      const resourceType = option.resourceId; // "bush_node" or "fungi_node"

      // Find available nodes
      const allResources = gameState.availableResources;
      const validKeys = Object.keys(allResources).filter((k) =>
        k.startsWith(`${resourceType}:`)
      );

      if (validKeys.length === 0) {
        gameState.triggerNotification(`No ${resourceType === "bush_node" ? "bushes" : "fungi"} found! Explore more.`, "error");
        char.stopActivity();
        return;
      }

      // Weighted Random Selection
      let totalNodes = 0;
      const candidates = [];
      validKeys.forEach((key) => {
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

      // Logic: Drop Table
      const biome = selectedKey.split(":")[1];
      const nodeDef = RESOURCE_NODES[resourceType];

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
      // Future Talent: foraging_2 (Double Yield)
      if (char.talents.foraging_2 && Math.random() < 0.1) amount = 2;

      gameState.inventory.addItem(dropItem, amount);
      char.gainXp("foraging", option.xp);
    },
  },
  FIGHTING: {
    id: "FIGHTING",
    name: "Fighting",
    icon: ICONS.skills.fighting,
    color: "#e74c3c",
    options: {
      rat: {
        name: "Rat", level: 1, xp: 10, icon: ICONS.monsters.rat,
        category: "Outskirts",
        drops: [
          { item: "rat_bones", weight: 80 },
          { item: "coins", weight: 20 },
        ],
      },
      goblin: {
        name: "Goblin", level: 5, xp: 20, icon: ICONS.monsters.goblin,
        category: "Outskirts",
        drops: [
          { item: "goblin_mail", weight: 40 },
          { item: "coins", weight: 40 },
          { item: "bones", weight: 20 },
        ],
      },
      wolf: {
        name: "Wolf", level: 10, xp: 30, icon: ICONS.monsters.wolf,
        category: "Wilderness",
        drops: [
          { item: "wolf_fur", weight: 60 },
          { item: "raw_trout", weight: 25 },
          { item: "bones", weight: 15 },
        ],
      },
      skeleton: {
        name: "Skeleton", level: 20, xp: 45, icon: ICONS.monsters.skeleton,
        category: "Dungeon",
        drops: [
          { item: "bones", weight: 50 },
          { item: "coins", weight: 30 },
          { item: "iron_ore", weight: 20 },
        ],
      },
      demon: {
        name: "Demon", level: 30, xp: 60, icon: ICONS.monsters.demon,
        category: "Infernal Plane",
        drops: [
          { item: "demon_ashes", weight: 50 },
          { item: "coal", weight: 25 },
          { item: "gold_ore", weight: 15 },
          { item: "ruby", weight: 10 },
        ],
      },
    },
    interval: GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
    action: (gameState, char) => {
      const targetId = char.currentActivity.target;
      const option = SKILL_DEFINITIONS.FIGHTING.options[targetId];
      if (!option) return;

      // Weighted loot roll
      const table = option.drops;
      const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
      let roll = Math.random() * totalWeight;
      let dropItem = table[0].item;
      for (const entry of table) {
        if (roll < entry.weight) { dropItem = entry.item; break; }
        roll -= entry.weight;
      }

      let amount = 1;
      // fighting_2: 10% chance for double loot
      if (char.talents.fighting_2 && Math.random() < 0.1) amount = 2;

      gameState.inventory.addItem(dropItem, amount);
      gameState.addDiscovery(`monster:${targetId}`);
      char.gainXp("fighting", option.xp);
    },
  },
  SMITHING: {
    id: "SMITHING",
    name: "Smithing",
    icon: ICONS.skills.smithing,
    color: "#a9a9a9",
    options: {
      copper_bar: {
        name: "Copper Bar",
        level: 1,
        xp: 15,
        icon: ICONS.items.copper_bar,
        cost: { copper_ore: 1 },
      },
      iron_bar: {
        name: "Iron Bar",
        level: 5,
        xp: 30,
        icon: ICONS.items.iron_bar,
        cost: { iron_ore: 1, coal: 1 },
      },
      steel_bar: {
        name: "Steel Bar",
        level: 10,
        xp: 45,
        icon: ICONS.items.steel_bar,
        cost: { iron_ore: 1, coal: 2 },
      },
      gold_bar: {
        name: "Gold Bar",
        level: 20,
        xp: 60,
        icon: ICONS.items.gold_bar,
        cost: { gold_ore: 1 },
      },
      mithril_bar: {
        name: "Mithril Bar",
        level: 30,
        xp: 80,
        icon: ICONS.items.mithril_bar,
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
      gameState.addDiscovery(`recipe:${targetId}`);
      char.gainXp("smithing", option.xp);
    },
  },
  EXPLORING: {
    id: "EXPLORING",
    name: "Exploring",
    icon: ICONS.skills.exploring,
    color: "#8e44ad",
    continuous: true,
    options: {
      wander_expansion: {
        name: "Expansion",
        level: 1,
        xp: 15,
        icon: ICONS.skillOptions.wander_expansion,
        description: "Reveals new areas near home.",
        risk: "Low",
      },

      // Level 1-2: Easy / Common
      find_grassland: {
        name: `Find ${TERRAIN_TYPES.TEMPERATE_GRASSLAND.name}`,
        level: 1,
        xp: 20,
        icon: TERRAIN_TYPES.TEMPERATE_GRASSLAND.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_GRASSLAND.id,
      },
      find_beach: {
        name: `Find ${TERRAIN_TYPES.BEACH.name}`,
        level: 2,
        xp: 22,
        icon: TERRAIN_TYPES.BEACH.symbol,
        biomeId: TERRAIN_TYPES.BEACH.id,
      },
      // Level 3-5

      find_forest: {
        name: `Find ${TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.name}`,
        level: 5,
        xp: 30,
        icon: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_DECIDUOUS_FOREST.id,
      },
      find_shrubland: {
        name: `Find ${TERRAIN_TYPES.SHRUBLAND.name}`,
        level: 5,
        xp: 30,
        icon: TERRAIN_TYPES.SHRUBLAND.symbol,
        biomeId: TERRAIN_TYPES.SHRUBLAND.id,
      },
      // Level 10
      find_desert: {
        name: `Find ${TERRAIN_TYPES.SUBTROPICAL_DESERT.name}`,
        level: 10,
        xp: 40,
        icon: TERRAIN_TYPES.SUBTROPICAL_DESERT.symbol,
        biomeId: TERRAIN_TYPES.SUBTROPICAL_DESERT.id,
      },
      find_boreal_forest: {
        name: `Find ${TERRAIN_TYPES.BOREAL_FOREST.name}`,
        level: 10,
        xp: 40,
        icon: TERRAIN_TYPES.BOREAL_FOREST.symbol,
        biomeId: TERRAIN_TYPES.BOREAL_FOREST.id,
      },
      find_swamp: {
        name: `Find ${TERRAIN_TYPES.SWAMP.name}`,
        level: 10,
        xp: 45,
        icon: TERRAIN_TYPES.SWAMP.symbol,
        biomeId: TERRAIN_TYPES.SWAMP.id,
      },
      // Level 15
      find_temperate_rainforest: {
        name: `Find ${TERRAIN_TYPES.TEMPERATE_RAINFOREST.name}`,
        level: 15,
        xp: 50,
        icon: TERRAIN_TYPES.TEMPERATE_RAINFOREST.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_RAINFOREST.id,
      },
      find_tropical_savanna: {
        name: `Find ${TERRAIN_TYPES.TROPICAL_SAVANNA.name}`,
        level: 15,
        xp: 50,
        icon: TERRAIN_TYPES.TROPICAL_SAVANNA.symbol,
        biomeId: TERRAIN_TYPES.TROPICAL_SAVANNA.id,
      },
      // Level 20
      find_mountain: {
        name: `Find ${TERRAIN_TYPES.ALPINE.name}`,
        level: 20,
        xp: 60,
        icon: TERRAIN_TYPES.ALPINE.symbol,
        biomeId: TERRAIN_TYPES.ALPINE.id,
      },
      find_temperate_desert: {
        name: `Find ${TERRAIN_TYPES.TEMPERATE_DESERT.name}`,
        level: 20,
        xp: 60,
        icon: TERRAIN_TYPES.TEMPERATE_DESERT.symbol,
        biomeId: TERRAIN_TYPES.TEMPERATE_DESERT.id,
      },
      find_tropical_rainforest: {
        name: `Find ${TERRAIN_TYPES.TROPICAL_RAINFOREST.name}`,
        level: 20,
        xp: 65,
        icon: TERRAIN_TYPES.TROPICAL_RAINFOREST.symbol,
        biomeId: TERRAIN_TYPES.TROPICAL_RAINFOREST.id,
      },
      // Level 25
      find_tundra: {
        name: `Find ${TERRAIN_TYPES.TUNDRA.name}`,
        level: 25,
        xp: 70,
        icon: TERRAIN_TYPES.TUNDRA.symbol,
        biomeId: TERRAIN_TYPES.TUNDRA.id,
      },
      // Level 30

      find_alpine_tundra: {
        name: `Find ${TERRAIN_TYPES.ALPINE_TUNDRA.name}`,
        level: 30,
        xp: 80,
        icon: TERRAIN_TYPES.ALPINE_TUNDRA.symbol,
        biomeId: TERRAIN_TYPES.ALPINE_TUNDRA.id,
      },
      // Level 35
      find_polar_desert: {
        name: `Find ${TERRAIN_TYPES.POLAR_DESERT.name}`,
        level: 35,
        xp: 90,
        icon: TERRAIN_TYPES.POLAR_DESERT.symbol,
        biomeId: TERRAIN_TYPES.POLAR_DESERT.id,
      },
      find_ice_sheet: {
        name: `Find ${TERRAIN_TYPES.ICE_SHEET.name}`,
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
          // 1. RESOURCE DISCOVERY (count 1 per node tile)
          if (tile.resource) {
            const key = `${tile.resource.type}:${tile.type}`;
            gameState.addAvailableResource(key, 1);
            gameState.addDiscovery(`node:${tile.resource.type}`);
          }

          // 2. BIOME DISCOVERY
          gameState.addDiscovery(`biome:${tile.type}`);

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
