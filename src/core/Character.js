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
    // Ensure all skills have initialized talentPoints
    for (const key in char.skills) {
      if (char.skills[key].talentPoints === undefined) {
        char.skills[key].talentPoints = 0;
      }
    }
    char.talents = { ...(data.talents || {}) };
    if (data.talentPoints === undefined) char.talentPoints = 3; // Retroactive grant for old saves
    return char;
  }

  unlockTalent(talentId) {
    if (this.talents[talentId]) return false; // Already unlocked

    const def = getTalentDefinition(talentId);
    if (!def) return false;

    // Determine Cost Type
    // Columns 0 (Str), 1 (Dex), 2 (Int) use Global Attribute Points
    // Columns 3+ use specific Skill Points
    const isAttribute = def.position.col <= 2;
    let skillIdForPoints = null;

    if (!isAttribute) {
      // Find which skill corresponds to this talent
      // Simple mapping based on known structure or we could add 'skillId' to talent def
      // Current mapping: 3->Mining, 4->Woodcutting, 5->Fishing, 6->Fighting
      if (def.position.col === 3) skillIdForPoints = "mining";
      else if (def.position.col === 4) skillIdForPoints = "woodcutting";
      else if (def.position.col === 5) skillIdForPoints = "fishing";
      else if (def.position.col === 6) skillIdForPoints = "fighting";
    }

    if (isAttribute) {
      if (this.talentPoints < def.cost) return false;
      this.talentPoints -= def.cost;
    } else {
      if (!skillIdForPoints || !this.skills[skillIdForPoints]) return false;
      if (this.skills[skillIdForPoints].talentPoints < def.cost) return false;
      this.skills[skillIdForPoints].talentPoints -= def.cost;
    }

    // Check Prerequisites
    for (const req of def.prerequisites) {
      if (!this.talents[req]) return false;
    }

    // Unlock
    this.talents[talentId] = true;

    // Apply Effect
    if (def.effect) {
      def.effect(this);
    }
    // console.log(`Unlocked talent ${talentId} for ${this.name}`);
    // No specific notification type for talents yet, defaulting to info/master or maybe add 'talent' later
    // For now, let's just show it.
    gameState.triggerNotification(`Unlocked talent: ${def.name}`, "master");
    return true;
  }

  startActivity(type, target) {
    this.currentActivity = {
      type,
      target,
      startTime: Date.now(),
      lastActionTime: Date.now(),
    };
    gameState.triggerNotification(
      `${this.name} started ${type} on ${target}`,
      "activity",
    );
  }

  stopActivity() {
    this.currentActivity = null;
    gameState.triggerNotification(`${this.name} stopped activity`, "activity");
  }

  gainXp(skillId, amount) {
    const skill = this.skills[skillId];
    if (!skill) return;

    // Check for XP Bonus Talents
    let multiplier = 1;
    // Simple check for now based on convention: <skill>_1 is always XP bonus
    // Or we can be explicit
    if (skillId === "mining" && this.talents.mining_1) multiplier += 0.1;
    if (skillId === "woodcutting" && this.talents.woodcutting_1)
      multiplier += 0.1;
    if (skillId === "fishing" && this.talents.fishing_1) multiplier += 0.1;
    if (skillId === "fighting" && this.talents.fighting_1) multiplier += 0.1;

    skill.xp += amount * multiplier;

    const xpNeeded = skill.level * 100;
    if (skill.xp >= xpNeeded) {
      skill.xp -= xpNeeded;
      skill.level++;

      // Award Skill Talent Point EVERY level
      if (skill.talentPoints === undefined) skill.talentPoints = 0;
      skill.talentPoints++;

      let msg = `Level Up! ${skillId} is now level ${skill.level}. +1 ${skillId} Talent Point!`;

      gameState.triggerNotification(msg, "levelUp");
      // TODO: Notify UI of level up (via GameState listeners)
    }
  }
}
