import { describe, it, expect, vi, beforeEach } from "vitest";
import { Character } from "./Character";

// Mock dependencies
vi.mock("./GameState", () => ({
  gameState: {
    triggerNotification: vi.fn(),
    saveGame: vi.fn(),
  },
}));

// Mock window.gameState
global.window = {
  gameState: {
    triggerNotification: vi.fn(),
    saveGame: vi.fn(),
  },
};

describe("Character Core Logic", () => {
  let char;

  beforeEach(() => {
    vi.clearAllMocks();
    char = new Character("char1", "Hero");
  });

  describe("Initialization & Persistence", () => {
    it("should initialize with default stats", () => {
      expect(char.name).toBe("Hero");
      expect(char.stats.level).toBe(1);
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
      expect(window.gameState.triggerNotification).toHaveBeenCalledWith(
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
});
