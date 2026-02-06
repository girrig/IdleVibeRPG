import { describe, it, expect, vi, beforeEach } from "vitest";
import { Character } from "./Character";

// Mock game context for dependency injection
const mockGameContext = {
  triggerNotification: vi.fn(),
  saveGame: vi.fn(),
};

describe("Character Core Logic", () => {
  let char;

  beforeEach(() => {
    vi.clearAllMocks();
    char = new Character("char1", "Hero");
    char.setGameContext(mockGameContext);
  });

  describe("Initialization & Persistence", () => {
    it("should initialize with default stats", () => {
      expect(char.name).toBe("Hero");
      expect(char.stats.level).toBe(1);
      expect(char.stats.sightRange).toBe(5); // Default
      expect(char.talentPoints).toBe(3);
    });

    it("should restore from save data correctly", () => {
      const saveData = {
        id: "char1",
        name: "SavedHero",
        stats: { level: 5, strength: 20 },
        talentPoints: 10,
        skills: {
          mining: { level: 5, xp: 500, talentPoints: 1 },
        },
      };

      const loadedChar = Character.fromData(saveData);

      expect(loadedChar.name).toBe("SavedHero");
      expect(loadedChar.stats.level).toBe(5);
      expect(loadedChar.stats.strength).toBe(20);
      expect(loadedChar.stats.dexterity).toBe(10); // Preserved default
      expect(loadedChar.stats.sightRange).toBe(5); // Should default if missing or 5 if saved
      expect(loadedChar.skills.mining.level).toBe(5);
    });

    it("should handle missing fields in save data gracefully", () => {
      const partialData = { id: "char1", name: "Partial" };
      const loadedChar = Character.fromData(partialData);

      expect(loadedChar.stats.strength).toBe(10); // Default
      expect(loadedChar.skills.mining.level).toBe(1); // Default
      expect(loadedChar.talentPoints).toBe(3); // Default injected
    });
  });

  describe("Progression (gainXp)", () => {
    it("should level up when enough XP is gained", () => {
      // Level 1 -> 2 needs 100 XP
      char.gainXp("mining", 50);
      expect(char.skills.mining.level).toBe(1);
      expect(char.skills.mining.xp).toBe(50);

      char.gainXp("mining", 50);
      expect(char.skills.mining.level).toBe(2);
      expect(char.skills.mining.xp).toBe(0);

      // Should trigger notification
      expect(mockGameContext.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("Level Up"),
        expect.anything(),
      );
    });

    it("should award talent points every 5 levels", () => {
      // Mock a skill at level 4, 99/400 XP
      char.skills.woodcutting.level = 4;
      char.skills.woodcutting.xp = 0;
      char.skills.woodcutting.talentPoints = 0;

      // Gain enough for level 5 (400 XP needed)
      char.gainXp("woodcutting", 400);

      expect(char.skills.woodcutting.level).toBe(5);
      expect(char.skills.woodcutting.talentPoints).toBe(1);
    });
  });

  describe("Activity Logic", () => {
    it("should start activity if idle", () => {
      char.startActivity("mining", "copper_ore");
      expect(char.currentActivity).not.toBeNull();
      expect(char.currentActivity.type).toBe("mining");
      expect(char.currentActivity.target).toBe("copper_ore");
    });

    it("should queue activity if busy", () => {
      char.startActivity("mining", "copper_ore"); // Active
      char.startActivity("woodcutting", "oak_log"); // Queued

      expect(char.currentActivity.type).toBe("mining");
      expect(char.activityQueue).toHaveLength(1);
      expect(char.activityQueue[0].type).toBe("woodcutting");
    });

    it("should auto-start queued activity upon completion", () => {
      char.startActivity("mining", "copper_ore");
      char.startActivity("woodcutting", "oak_log");

      char.completeCurrentTask(); // Finishes mining

      expect(char.currentActivity.type).toBe("woodcutting");
      expect(char.activityQueue).toHaveLength(0);
    });
  });

  it("should trigger return trip on stopActivity if exploring", () => {
    char.position = { x: 100, y: 100 }; // Far form home
    char.startActivity("EXPLORING", "wander", 0);

    // startActivity resets to 250,250. So let's move them AWAY manually to simulate time passed.
    char.position = { x: 100, y: 100 };

    // First Stop
    char.stopActivity();

    expect(char.currentActivity).not.toBeNull();
    expect(char.currentActivity.phase).toBe("RETURNING");

    // Second Stop (Force Quit)
    char.stopActivity();
    expect(char.currentActivity).toBeNull();
  });

  describe("stopActivity edge cases", () => {
    it("should force stop exploring without return trip", () => {
      char.startActivity("EXPLORING", "wander", 0);
      char.position = { x: 100, y: 100 };

      char.stopActivity(true); // Force

      expect(char.currentActivity).toBeNull();
      expect(char.position).toEqual({ x: 250, y: 250 });
    });

    it("should stop immediately if already at home", () => {
      char.startActivity("EXPLORING", "wander", 0);
      char.position = { x: 250, y: 250 }; // Already home

      char.stopActivity();

      expect(char.currentActivity).toBeNull();
    });

    it("should stop non-exploring activity immediately", () => {
      char.startActivity("MINING", "copper_ore");
      char.position = { x: 100, y: 100 };

      char.stopActivity();

      expect(char.currentActivity).toBeNull();
      expect(char.activityQueue).toHaveLength(0);
    });

    it("should clear activity queue on stop", () => {
      char.startActivity("MINING", "copper_ore");
      char.startActivity("MINING", "iron_ore"); // queued
      expect(char.activityQueue).toHaveLength(1);

      char.stopActivity();

      expect(char.activityQueue).toHaveLength(0);
    });

    it("should handle stopActivity when RETURNING phase", () => {
      char.startActivity("EXPLORING", "wander", 0);
      char.position = { x: 100, y: 100 };
      char.currentActivity.phase = "RETURNING";

      char.stopActivity(); // Already returning -> should stop

      expect(char.currentActivity).toBeNull();
      expect(char.position).toEqual({ x: 250, y: 250 });
    });
  });

  describe("unlockTalent", () => {
    it("should return false for already unlocked talent", () => {
      char.talents["mining_1"] = true;
      expect(char.unlockTalent("mining_1")).toBe(false);
    });

    it("should return false for unknown talent", () => {
      expect(char.unlockTalent("nonexistent_talent")).toBe(false);
    });

    it("should return false when prerequisites not met", () => {
      // mining_2 requires mining_1
      expect(char.unlockTalent("mining_2")).toBe(false);
    });
  });

  describe("refundTalent", () => {
    it("should return false for talent not unlocked", () => {
      expect(char.refundTalent("mining_1")).toBe(false);
    });

    it("should return false for unknown talent", () => {
      expect(char.refundTalent("nonexistent_talent")).toBe(false);
    });
  });

  describe("gainXp edge cases", () => {
    it("should do nothing for unknown skill", () => {
      char.gainXp("unknown_skill", 100);
      // Should not throw
    });

    it("should apply talent XP multiplier when talent unlocked", () => {
      char.talents["mining_1"] = true;
      char.gainXp("mining", 100); // 100 * 1.1 = 110
      expect(char.skills.mining.xp).toBeCloseTo(10); // Level up at 100, remainder = 10
      expect(char.skills.mining.level).toBe(2);
    });

    it("should initialize talentPoints on skill if undefined", () => {
      delete char.skills.mining.talentPoints;
      char.skills.mining.level = 4;
      char.skills.mining.xp = 0;
      char.gainXp("mining", 400); // Level up to 5
      expect(char.skills.mining.talentPoints).toBe(1);
    });
  });

  describe("completeCurrentTask edge cases", () => {
    it("should do nothing if no current activity", () => {
      char.currentActivity = null;
      char.completeCurrentTask(); // Should not throw
    });
  });

  describe("fromData edge cases", () => {
    it("should initialize talentPoints to 0 for skills missing it", () => {
      const data = {
        id: "c1",
        name: "Test",
        skills: {
          mining: { level: 3, xp: 50 },
        },
      };
      const loaded = Character.fromData(data);
      expect(loaded.skills.mining.talentPoints).toBe(0);
    });

    it("should preserve position from save", () => {
      const data = {
        id: "c1",
        name: "Test",
        position: { x: 100, y: 200 },
      };
      const loaded = Character.fromData(data);
      expect(loaded.position).toEqual({ x: 100, y: 200 });
    });

    it("should restore goalQueue and activeGoalGroup", () => {
      const data = {
        id: "c1",
        name: "Test",
        goalQueue: [{ id: 1 }],
        activeGoalGroup: { id: 2 },
        activityQueue: [{ type: "MINING" }],
      };
      const loaded = Character.fromData(data);
      expect(loaded.goalQueue).toHaveLength(1);
      expect(loaded.activeGoalGroup.id).toBe(2);
      expect(loaded.activityQueue).toHaveLength(1);
    });
  });
});
