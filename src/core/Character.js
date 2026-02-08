import { getTalentDefinition, TALENT_DEFINITIONS } from "./TalentRegistry.js";
import { SKILL_DEFINITIONS } from "./SkillRegistry.js";

// Maps talent column position to skill ID for talent point costs
const COLUMN_TO_SKILL = {
  3: "mining",
  4: "woodcutting",
  5: "fishing",
  6: "fighting",
  7: "fighting", // Defense branch shares fighting points
  8: "smithing",
  9: "exploring",
};

function getSkillForTalentColumn(col) {
  return COLUMN_TO_SKILL[col] || null;
}

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
      sightRange: 5, // Radius of fog clear
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
    this.skills = Object.fromEntries(
      Object.keys(SKILL_DEFINITIONS).map((id) => [
        id.toLowerCase(),
        { level: 1, xp: 0 },
      ]),
    );
    this.talents = {}; // { talentId: true }
    this.talentPoints = 3; // Start with 3 for testing
    this.position = { x: 250, y: 250 }; // Default starting position
    this.currentActivity = null; // e.g. { type: 'MINING', target: 'copper_ore', startTime: 12345, quantity: 10, progress: 0 }
    this.activityQueue = []; // Array of { type, target, quantity }
    this.activeGoalGroup = null; // Current GoalGroup being executed
    // Non-enumerable so JSON.stringify skips it (avoids circular reference)
    Object.defineProperty(this, "gameContext", {
      value: null,
      writable: true,
      enumerable: false,
    });
  }

  setGameContext(ctx) {
    this.gameContext = ctx;
  }

  static fromData(data) {
    const char = new Character(data.id, data.name, data.type);
    Object.assign(char, data);
    // Deep merge stats and skills to ensure defaults are preserved if missing in data
    const defaultStats = new Character(0, "").stats;
    char.stats = { ...defaultStats, ...(data.stats || {}) };
    if (!char.stats.sightRange) char.stats.sightRange = defaultStats.sightRange;

    char.skills = { ...new Character(0, "").skills, ...(data.skills || {}) };
    // Ensure all skills have initialized talentPoints
    for (const key in char.skills) {
      if (char.skills[key].talentPoints === undefined) {
        char.skills[key].talentPoints = 0;
      }
    }
    char.talents = { ...(data.talents || {}) };
    if (data.talentPoints === undefined) char.talentPoints = 3; // Retroactive grant for old saves

    // Position
    char.position = data.position || { x: 250, y: 250 };

    // Resume queue
    char.activityQueue = data.activityQueue || [];
    char.goalQueue = data.goalQueue || [];
    char.activeGoalGroup = data.activeGoalGroup || null;

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
      skillIdForPoints = getSkillForTalentColumn(def.position.col);
    }

    // Check Resources (Do not deduct yet)
    if (isAttribute) {
      if (this.talentPoints < def.cost) return false;
    } else {
      if (!skillIdForPoints || !this.skills[skillIdForPoints]) return false;
      if (this.skills[skillIdForPoints].talentPoints < def.cost) return false;
    }

    // Check Prerequisites
    for (const req of def.prerequisites) {
      if (!this.talents[req]) return false;
    }

    // All checks passed. Deduct cost and unlock.
    if (isAttribute) {
      this.talentPoints -= def.cost;
    } else {
      this.skills[skillIdForPoints].talentPoints -= def.cost;
    }

    // Unlock
    this.talents[talentId] = true;

    // Apply Effect
    if (def.effect) {
      def.effect(this);
    }

    if (this.gameContext)
      this.gameContext.triggerNotification(
        `Unlocked talent: ${def.name}`,
        "master",
      );
    return true;
  }

  refundTalent(talentId) {
    if (!this.talents[talentId]) return false; // Not unlocked

    const def = getTalentDefinition(talentId);
    if (!def) return false;

    // 1. Recursive Refund of Dependents
    // Find talents that require this one
    const dependents = Object.values(TALENT_DEFINITIONS).filter(
      (d) => d.prerequisites.includes(talentId) && this.talents[d.id],
    );

    dependents.forEach((dep) => {
      this.refundTalent(dep.id);
    });

    // 2. Remove Effect
    if (def.removeEffect) {
      def.removeEffect(this);
    }

    // 3. Refund Cost
    const isAttribute = def.position.col <= 2;
    if (isAttribute) {
      this.talentPoints += def.cost;
    } else {
      const skillIdForPoints = getSkillForTalentColumn(def.position.col);
      if (skillIdForPoints && this.skills[skillIdForPoints]) {
        this.skills[skillIdForPoints].talentPoints += def.cost;
      }
    }

    // 4. Remove Talent
    delete this.talents[talentId];

    if (this.gameContext)
      this.gameContext.triggerNotification(
        `Refunded talent: ${def.name}`,
        "info",
      );

    return true;
  }

  startActivity(type, target, quantity = 0) {
    // If busy, add to queue
    if (this.currentActivity) {
      this.activityQueue.push({ type, target, quantity });
      if (this.gameContext)
        this.gameContext.triggerNotification(
          `${this.name}: Queued ${target} (x${quantity > 0 ? quantity : "∞"})`,
          "activity",
        );
      return;
    }

    this.currentActivity = {
      type,
      target,
      startTime: Date.now(),
      lastActionTime: Date.now(),
      quantity: quantity,
      progress: 0,
    };

    const def = SKILL_DEFINITIONS[type];
    const notifType =
      def && def.color ? { id: "activity", color: def.color } : "activity";

    // Only notify if NOT driven by a goal (TaskRunner handles goal start notification)
    if (this.gameContext) {
      this.gameContext.triggerNotification(
        `${this.name} started ${type} on ${target} (x${quantity > 0 ? quantity : "∞"})`,
        notifType,
      );
    }
  }

  completeCurrentTask() {
    if (!this.currentActivity) return;

    if (this.gameContext)
      this.gameContext.triggerNotification(
        `${this.name} finished ${this.currentActivity.target}`,
        "activity",
      );
    this.currentActivity = null;

    // Check Queue
    if (this.activityQueue.length > 0) {
      const next = this.activityQueue.shift();
      this.startActivity(next.type, next.target, next.quantity);
    }
  }

  stopActivity(force = false) {
    // If movement-based skill and NOT Returning and NOT at home, trigger Return Trip first
    // UNLESS force is true
    const movementSkills = ["EXPLORING", "WOODCUTTING", "MINING", "FISHING", "FORAGING"];
    const isMovementSkill = this.currentActivity &&
      movementSkills.includes(this.currentActivity.type);

    if (
      !force &&
      isMovementSkill &&
      this.currentActivity.phase !== "RETURNING"
    ) {
      const homeX = 250;
      const homeY = 250;
      if (this.position.x !== homeX || this.position.y !== homeY) {
        this.currentActivity.phase = "RETURNING";
        this.currentActivity.stopping = true;
        if (this.gameContext)
          this.gameContext.triggerNotification(
            `${this.name}: "Heading back to town..."`,
            "activity",
          );
        return; // Cancel the immediate stop
      }
    }

    // Force Cancel / Normal Stop logic
    // If we were on a movement-based skill, ensure we are removed from the map (teleport to home).
    if (isMovementSkill) {
      this.position = { x: 250, y: 250 };
    }

    this.currentActivity = null;
    this.activityQueue = []; // Clear queue on manual stop
    if (this.gameContext)
      this.gameContext.triggerNotification(
        `${this.name} stopped activity (Queue Cleared)`,
        "activity",
      );
  }

  gainXp(skillId, amount) {
    const skill = this.skills[skillId];
    if (!skill) return;

    // Convention: <skillId>_1 talent is always +10% XP bonus
    let multiplier = 1;
    if (this.talents[`${skillId}_1`]) multiplier += 0.1;

    skill.xp += amount * multiplier;

    const xpNeeded = skill.level * 100;
    if (skill.xp >= xpNeeded) {
      skill.xp -= xpNeeded;
      skill.level++;

      // Award Skill Talent Point EVERY 5 levels
      if (skill.talentPoints === undefined) skill.talentPoints = 0;

      let msg = `Level Up! ${skillId} is now level ${skill.level}.`;

      if (skill.level % 5 === 0) {
        skill.talentPoints++;
        msg += ` +1 ${skillId} Talent Point!`;
      }

      const def = SKILL_DEFINITIONS[skillId.toUpperCase()];
      const notifType =
        def && def.color ? { id: "levelUp", color: def.color } : "levelUp";

      if (this.gameContext) {
        this.gameContext.triggerNotification(msg, notifType);
        this.gameContext.saveGame();
      }
    }
  }
}
