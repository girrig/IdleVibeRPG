export class Character {
  constructor(id, name, type = "WARRIOR") {
    this.id = id;
    this.name = name;
    this.type = type; // WARRIOR or RANGER
    this.gender = Math.random() > 0.5 ? "MALE" : "FEMALE";
    this.sprite = this.gender === "MALE" ? "character" : "character_female";
    this.stats = {
      level: 1,
      xp: 0,
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
    this.currentActivity = null; // e.g. { type: 'MINING', target: 'copper_ore', startTime: 12345 }
  }

  startActivity(type, target) {
    this.currentActivity = {
      type,
      target,
      startTime: Date.now(),
    };
    console.log(`${this.name} started ${type} on ${target}`);
  }

  stopActivity() {
    this.currentActivity = null;
    console.log(`${this.name} stopped activity`);
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
      console.log(`Level Up! ${skillId} is now level ${skill.level}`);
      // TODO: Notify UI of level up (via GameState listeners)
    }
  }
}
