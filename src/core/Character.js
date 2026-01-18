import { getTalentDefinition } from "./TalentRegistry";

import { gameState } from "./GameState";

export class Character {
  constructor(id, name, type = "WARRIOR") {
    this.id = id;
    this.name = name;
    this.type = type; // WARRIOR or RANGER
    this.gender = "MALE";
    this.sprite = "character";
    this.stats = {
      level: 1,

      strength: 10,
      dexterity: 10,
      intelligence: 10,
    };
    this.equipment = {
      head: null,
      chest: null,
      belt: null,
      gloves: null,
      legs: null,
      feet: null,
      ring1: null,
      ring2: null,
      trinket1: null,
      trinket2: null,
      mainHand: null,
      offHand: null,
    };
    this.skills = {
      mining: { level: 1, xp: 0 },
      fighting: { level: 1, xp: 0 },
      woodcutting: { level: 1, xp: 0 },
      fishing: { level: 1, xp: 0 },
    };
    this.talents = {}; // { talentId: true }
    this.talentPoints = 3; // Start with 3 for testing
    this.currentActivity = null; // e.g. { type: 'MINING', target: 'copper_ore', startTime: 12345 }
  }

  static fromData(data) {
    const char = new Character(data.id, data.name, data.type);
    Object.assign(char, data);
    // Deep merge stats and skills to ensure defaults are preserved if missing in data
    char.stats = { ...new Character(0, "").stats, ...(data.stats || {}) };
    char.skills = { ...new Character(0, "").skills, ...(data.skills || {}) };
    char.talents = { ...(data.talents || {}) };
    if (data.talentPoints === undefined) char.talentPoints = 3; // Retroactive grant for old saves
    return char;
  }

  unlockTalent(talentId) {
    if (this.talents[talentId]) return false; // Already unlocked
    if (this.talentPoints <= 0) return false;

    const def = getTalentDefinition(talentId);
    if (!def) return false;

    // Check Prerequisites
    for (const req of def.prerequisites) {
      if (!this.talents[req]) return false;
    }

    // Unlock
    this.talentPoints -= def.cost;
    this.talents[talentId] = true;

    // Apply Effect
    if (def.effect) {
      def.effect(this);
    }
    console.log(`Unlocked talent ${talentId} for ${this.name}`);
    return true;
  }

  startActivity(type, target) {
    this.currentActivity = {
      type,
      target,
      startTime: Date.now(),
    };
    if (
      gameState.settings &&
      gameState.settings.notifications.master &&
      gameState.settings.notifications.activity
    ) {
      console.log(`${this.name} started ${type} on ${target}`);
    }
  }

  stopActivity() {
    this.currentActivity = null;
    if (
      gameState.settings &&
      gameState.settings.notifications.master &&
      gameState.settings.notifications.activity
    ) {
      console.log(`${this.name} stopped activity`);
    }
  }

  gainXp(skillId, amount) {
    const skill = this.skills[skillId];
    if (!skill) return;

    skill.xp += amount;
    // Simple formula: XP needed for next level = Level * 100
    // e.g. Level 1 needs 100 XP to reach Level 2
    // If we want cumulative: total XP for Level 2 = 100.
    // Let's assume 'xp' is current progress into the level, simplifying.
    // Or 'xp' is total. Let's do: 'xp' resets on level up for simplicity now.

    const xpNeeded = skill.level * 100;
    if (skill.xp >= xpNeeded) {
      skill.xp -= xpNeeded;
      skill.level++;
      if (
        gameState.settings &&
        gameState.settings.notifications.master &&
        gameState.settings.notifications.levelUp
      ) {
        console.log(`Level Up! ${skillId} is now level ${skill.level}`);
      }
      // TODO: Notify UI of level up (via GameState listeners)
    }
  }
}
