import { describe, it, expect, vi, beforeEach } from "vitest";
import { taskRunner } from "./TaskRunner";
import { gameState } from "./GameState";

vi.mock("./GameState", () => ({
  gameState: {
    inventory: {
      getCount: vi.fn(),
    },
    triggerNotification: vi.fn(),
  },
}));

describe("TaskRunner", () => {
  let mockChar;
  let mockGroup;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChar = {
      name: "Tester",
      activeGoal: null,
      currentActivity: null,
      startActivity: vi.fn(),
      stopActivity: vi.fn(),
    };
    mockGroup = {
      mainGoal: { itemId: "mainItem", quantity: 10 },
      steps: [],
    };
  });

  describe("startTask", () => {
    it("should start a task and set status to EXECUTING", () => {
      const step = {
        targetItem: "wood",
        targetQuantity: 5,
        source: { type: "SKILL" },
      };
      taskRunner.startTask(gameState, mockChar, step, mockGroup);

      expect(step.status).toBe("EXECUTING");
      expect(step.startTime).toBeDefined();
      expect(mockChar.activeGoal).toBe(step);
    });

    it("should use RELATIVE progress for Main Goal steps", () => {
      const step = {
        targetItem: "mainItem",
        targetQuantity: 5,
        source: { type: "SKILL" },
      };
      gameState.inventory.getCount.mockReturnValue(50); // Already have 50

      taskRunner.startTask(gameState, mockChar, step, mockGroup);

      expect(step.startCount).toBe(50); // Should snapshot current inventory
    });

    it("should use ABSOLUTE progress for Dependency steps", () => {
      const step = {
        targetItem: "subItem",
        targetQuantity: 5,
        source: { type: "SKILL" },
      };
      gameState.inventory.getCount.mockReturnValue(50);

      taskRunner.startTask(gameState, mockChar, step, mockGroup);

      // Different item than mainGoal -> Dependency -> StartCount 0
      expect(step.startCount).toBe(0);
    });
  });

  describe("ensureActivity", () => {
    it("should start activity if idle", () => {
      const step = {
        targetQuantity: 5,
        source: { type: "SKILL", skillId: "mining", target: "rock" },
      };
      mockChar.activeGoal = step;

      taskRunner.ensureActivity(mockChar);

      expect(mockChar.startActivity).toHaveBeenCalledWith("mining", "rock", 5);
    });

    it("should switch activity if doing something else", () => {
      const step = {
        targetQuantity: 3,
        source: { type: "SKILL", skillId: "mining", target: "rock" },
      };
      mockChar.activeGoal = step;
      mockChar.currentActivity = { type: "mining", target: "dirt" }; // Wrong target

      taskRunner.ensureActivity(mockChar);

      expect(mockChar.stopActivity).toHaveBeenCalled();
      expect(mockChar.startActivity).toHaveBeenCalledWith("mining", "rock", 3);
    });

    it("should do nothing if doing correct activity", () => {
      const step = {
        source: { type: "SKILL", skillId: "mining", target: "rock" },
      };
      mockChar.activeGoal = step;
      mockChar.currentActivity = { type: "mining", target: "rock" };

      taskRunner.ensureActivity(mockChar);

      expect(mockChar.stopActivity).not.toHaveBeenCalled();
      expect(mockChar.startActivity).not.toHaveBeenCalled();
    });
  });

  describe("checkProgress", () => {
    it("should return COMPLETED when target met", () => {
      const step = {
        targetItem: "wood",
        targetQuantity: 10,
        startCount: 0,
        status: "EXECUTING",
      };
      mockChar.activeGoal = step;
      gameState.inventory.getCount.mockReturnValue(10);

      const status = taskRunner.checkProgress(gameState, mockChar);

      expect(status).toBe("COMPLETED");
      expect(step.status).toBe("COMPLETED");
      expect(gameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("obtained"),
        "success",
      );
    });

    it("should return EXECUTING when target not met", () => {
      const step = {
        targetItem: "wood",
        targetQuantity: 10,
        startCount: 0,
        status: "EXECUTING",
      };
      // Mock ensureActivity logic indirectly or check it calls it?
      // ensureActivity logic is inside checkProgress.
      step.source = { type: "SKILL", skillId: "woodcutting", target: "tree" };
      mockChar.activeGoal = step;
      gameState.inventory.getCount.mockReturnValue(5);

      const status = taskRunner.checkProgress(gameState, mockChar);

      expect(status).toBe("EXECUTING");
      // Should verify it called ensureActivity?
      // Since we mock ensureActivity in tests often, here we test the real one.
      // Character is idle, so it should attempt start.
      expect(mockChar.startActivity).toHaveBeenCalledWith(
        "woodcutting",
        "tree",
        10,
      );
    });

    it("should adjust startCount if inventory dips below start (Resource Debt)", () => {
      // Started with 10. Goal: +5 (Total 15).
      // Spent 5. Inventory now 5.
      // Should reset startCount to 5. New Target: 10.
      const step = {
        targetItem: "wood",
        targetQuantity: 5,
        startCount: 10,
        status: "EXECUTING",
        source: { type: "SKILL" },
      };
      gameState.inventory.getCount.mockReturnValue(5);
      mockChar.activeGoal = step;

      taskRunner.checkProgress(gameState, mockChar);

      expect(step.startCount).toBe(5);
    });
  });
});
