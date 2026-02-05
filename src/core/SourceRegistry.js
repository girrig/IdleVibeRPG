import { SKILL_DEFINITIONS } from "./SkillRegistry";
import { RESOURCE_NODES } from "./Constants";

class SourceRegistry {
  constructor() {
    this.sources = {}; // itemId -> { type, id, target, ... }
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    // Index Skills
    Object.values(SKILL_DEFINITIONS).forEach((skill) => {
      if (skill.options) {
        Object.entries(skill.options).forEach(([targetId, option]) => {
          // 1. Generic Resource Node (New System)
          if (option.resourceId && RESOURCE_NODES[option.resourceId]) {
            const node = RESOURCE_NODES[option.resourceId];
            const allDrops = new Set();

            // Collect all possible drops
            if (node.default_drops) node.default_drops.forEach(d => allDrops.add(d.item));
            if (node.biome_drops) {
              Object.values(node.biome_drops).forEach(drops => {
                drops.forEach(d => allDrops.add(d.item));
              });
            }

            // Register source for each drop
            allDrops.forEach(itemId => {
              // Only register if not already found (or overwrite? usually first is fine)
              if (!this.sources[itemId]) {
                this.sources[itemId] = {
                  type: "SKILL",
                  skillId: skill.id,
                  target: targetId, // e.g. 'mine_minerals'
                  reqLevel: option.level || 1,
                  detail: `Found in ${node.name}`
                };
              }
            });
            return; // Done with this option
          }

          // 2. Loot Table Drops (Fighting)
          if (option.drops) {
            option.drops.forEach(({ item }) => {
              if (!this.sources[item]) {
                this.sources[item] = {
                  type: "SKILL",
                  skillId: skill.id,
                  target: targetId,
                  reqLevel: option.level || 1,
                };
              }
            });
          } else if (option.drop) {
            // Legacy single drop
            this.sources[option.drop] = {
              type: "SKILL",
              skillId: skill.id,
              target: targetId,
              reqLevel: option.level || 1,
            };
          } else {
            // 3. Legacy / Direct Item (Smithing, etc.)
            // Key is the item ID
            this.sources[targetId] = {
              type: "SKILL",
              skillId: skill.id,
              target: targetId,
              reqLevel: option.level || 1,
            };
          }
        });
      }
    });

    this.initialized = true;
    console.log(
      "SourceRegistry initialized. Sources:",
      Object.keys(this.sources).length,
    );
  }

  getSource(itemId) {
    if (!this.initialized) this.initialize();
    return this.sources[itemId];
  }
}

export const sourceRegistry = new SourceRegistry();
