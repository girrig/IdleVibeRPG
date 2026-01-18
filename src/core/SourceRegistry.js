import { SKILL_DEFINITIONS } from "./SkillRegistry";

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
          // Determine the "Item" this produces.
          // Mining/Woodcutting/Fishing: Key IS the item.
          // Fighting: 'rat' drops 'rat_bones'.

          if (option.drop) {
            this.sources[option.drop] = {
              type: "SKILL",
              skillId: skill.id,
              target: targetId, // e.g. 'rat'
              reqLevel: option.level || 1,
            };
          } else {
            // Default: key is item id
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
