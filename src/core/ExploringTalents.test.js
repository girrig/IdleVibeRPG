import { describe, it, expect, vi, beforeEach } from "vitest";
import { Character } from "./Character";
import { TALENT_DEFINITIONS } from "./TalentRegistry";

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

describe("Exploring Talents", () => {
  let char;

  beforeEach(() => {
    vi.clearAllMocks();
    char = new Character("char1", "Explorer");
    // Ensure exploring skill exists
    char.skills.exploring = { level: 10, xp: 0, talentPoints: 0 };
  });

  it("should have Exploring talents defined", () => {
    expect(TALENT_DEFINITIONS.exploring_1).toBeDefined();
    expect(TALENT_DEFINITIONS.exploring_2).toBeDefined();
  });

  it("should unlock exploring_1 with sufficient points", () => {
    // Give points
    char.skills.exploring.talentPoints = 1;

    const success = char.unlockTalent("exploring_1");
    expect(success).toBe(true);
    expect(char.talents.exploring_1).toBe(true);
    expect(char.skills.exploring.talentPoints).toBe(0);
  });

  it("should apply 10% XP bonus when exploring_1 is unlocked", () => {
    // Unlock exploring_1
    char.talents.exploring_1 = true;

    // Gain 100 XP
    // Expected: 100 * 1.1 = 110
    char.gainXp("exploring", 100);

    expect(char.skills.exploring.xp).toBeCloseTo(110);
  });

  it("should not apply XP bonus if exploring_1 is locked", () => {
    char.gainXp("exploring", 100);
    expect(char.skills.exploring.xp).toBe(100);
  });
});
