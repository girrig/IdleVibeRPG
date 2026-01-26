import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoalManager } from "./GoalManager";

// Mock Dependencies
vi.mock("./TaskPlanner", () => ({
  taskPlanner: {
    getProjectedInventory: vi.fn(() => ({})),
    resolveDependencies: vi.fn(),
  },
}));

vi.mock("./TaskRunner", () => ({
  taskRunner: {
    startTask: vi.fn(),
    ensureActivity: vi.fn(),
    checkProgress: vi.fn(),
  },
}));

import { taskPlanner } from "./TaskPlanner";
import { taskRunner } from "./TaskRunner";

describe("GoalManager", () => {
  let goalManager;
  let mockGameState;
  let mockChar;

  beforeEach(() => {
    vi.clearAllMocks();
    goalManager = new GoalManager();

    mockGameState = {
      inventory: { items: {} },
      triggerNotification: vi.fn(),
      saveGame: vi.fn(),
      characters: [],
    };

    mockChar = {
      name: "TestChar",
      activeGoal: null,
      activeGoalGroup: null,
      goalQueue: [],
      stopActivity: vi.fn(),
      activeActivity: null,
    };
  });

  describe("setGoal", () => {
    it("should successfully set a goal and start it if idle", () => {
      // Mock Setup: Plan returns 1 step
      taskPlanner.resolveDependencies.mockReturnValue([
        {
          itemId: "copper_ore",
          quantity: 1,
          source: { type: "MINING" },
          status: "PENDING",
        },
      ]);

      const success = goalManager.setGoal(
        mockGameState,
        mockChar,
        "copper_ore",
        1,
      );

      expect(success).toBe(true);
      expect(taskPlanner.resolveDependencies).toHaveBeenCalled();
      expect(mockChar.activeGoalGroup).not.toBeNull();
      expect(mockChar.activeGoalGroup.mainGoal.itemId).toBe("copper_ore");

      // Should start the task immediately
      expect(taskRunner.startTask).toHaveBeenCalled();
      expect(taskRunner.ensureActivity).toHaveBeenCalled();
    });

    it("should queue goal if character is busy", () => {
      // Setup: Character already has a group
      mockChar.activeGoalGroup = { id: 123, steps: [] };
      taskPlanner.resolveDependencies.mockReturnValue([
        { itemId: "wood", quantity: 1 },
      ]);

      goalManager.setGoal(mockGameState, mockChar, "wood", 1);

      expect(mockChar.goalQueue).toHaveLength(1);
      expect(mockChar.goalQueue[0].mainGoal.itemId).toBe("wood");
      // Should NOT start task (busy)
      expect(taskRunner.startTask).not.toHaveBeenCalled();
    });

    it("should handle planning failure", () => {
      taskPlanner.resolveDependencies.mockImplementation(() => {
        throw new Error("Cannot plan");
      });

      const success = goalManager.setGoal(
        mockGameState,
        mockChar,
        "impossible_item",
      );

      expect(success).toBe(false);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("Cannot plan"),
        "error",
      );
    });
  });

  describe("Goal Progression", () => {
    it("should completion of a step and advance to next", () => {
      // Setup: Active group with 2 steps. Step 0 is active.
      const group = {
        steps: [
          { itemId: "ore", status: "PENDING" },
          { itemId: "bar", status: "PENDING" },
        ],
        currentStepIndex: 0,
        mainGoal: { itemId: "bar", quantity: 1 },
      };
      mockChar.activeGoalGroup = group;
      mockChar.activeGoal = group.steps[0];

      // Action: Check Progress -> Returns COMPLETED
      taskRunner.checkProgress.mockReturnValue("COMPLETED");

      goalManager.checkGoalProgress(mockGameState, mockChar);

      // Expect: Index advanced, next step started
      expect(group.currentStepIndex).toBe(1);
      expect(taskRunner.startTask).toHaveBeenCalledWith(
        mockGameState,
        mockChar,
        group.steps[1],
        group,
      );
    });

    it("should complete group and start next queued item", () => {
      // Setup: Active group with 1 step (finished). Queue has 1 group.
      const group1 = {
        id: 1,
        steps: [{ itemId: "ore" }],
        currentStepIndex: 0,
        mainGoal: { itemId: "ore", quantity: 1 },
      };

      const group2 = {
        id: 2,
        mainGoal: { itemId: "wood", quantity: 1 },
        steps: [{ itemId: "placeholder" }], // Needs steps to trigger re-plan logic
        currentStepIndex: 0,
      };

      mockChar.activeGoalGroup = group1;
      mockChar.activeGoal = group1.steps[0];
      mockChar.goalQueue = [group2];

      taskRunner.checkProgress.mockReturnValue("COMPLETED");
      // Mock re-planning for queue item invocation
      taskPlanner.resolveDependencies.mockReturnValue([
        { itemId: "wood", quantity: 1, status: "PENDING" },
      ]);

      goalManager.checkGoalProgress(mockGameState, mockChar);

      // Expect: activeGroup1 cleared, activeGroup2 started
      expect(mockChar.activeGoalGroup.id).toBe(2);
      expect(taskRunner.startTask).toHaveBeenCalled();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("completed group"),
        "success",
      );
    });
  });

  describe("Queue Management", () => {
    it("should clear current goal", () => {
      mockChar.activeGoalGroup = { mainGoal: { itemId: "stuff" } };
      goalManager.clearGoal(mockGameState, mockChar);

      expect(mockChar.activeGoalGroup).toBeNull();
      expect(mockChar.stopActivity).toHaveBeenCalled();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("Cancelled"),
        "info",
      );
    });
  });
});
