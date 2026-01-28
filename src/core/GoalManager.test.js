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
    it("should remove goal from queue", () => {
      const group1 = { id: 1, mainGoal: { itemId: "A", quantity: 1 } };
      const group2 = { id: 2, mainGoal: { itemId: "B", quantity: 1 } };
      mockChar.goalQueue = [group1, group2];

      goalManager.removeGoalFromQueue(mockGameState, mockChar, 0);

      expect(mockChar.goalQueue).toHaveLength(1);
      expect(mockChar.goalQueue[0].id).toBe(2);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining("Removed queued group"),
        "info",
      );
    });

    it("should reorder goal queue (normal swap)", () => {
      const group1 = { id: 1 };
      const group2 = { id: 2 };
      mockChar.goalQueue = [group1, group2];

      // Swap index 0 and 1
      goalManager.reorderGoalQueue(mockGameState, mockChar, 0, 1);

      expect(mockChar.goalQueue[0].id).toBe(2);
      expect(mockChar.goalQueue[1].id).toBe(1);
      expect(mockGameState.saveGame).toHaveBeenCalled();
    });

    it("should handle pausing active task (Active -> Queue)", () => {
      // Moving Active (-1) to Queue (0)
      const activeGroup = {
        id: 99,
        steps: [{ targetItem: "X", targetQuantity: 1 }],
        currentStepIndex: 0,
      };
      mockChar.activeGoalGroup = activeGroup;
      mockChar.goalQueue = [{ id: 1, steps: [] }];

      goalManager.reorderGoalQueue(mockGameState, mockChar, -1, 1);

      // ID 1 should be active (was at 0, now shifted to active)
      expect(mockChar.activeGoalGroup.id).toBe(1);
      // ID 99 was inserted at 1, but after shift of 0, it becomes 0
      expect(mockChar.goalQueue[0].id).toBe(99);
      expect(mockChar.stopActivity).toHaveBeenCalled();
    });
  });

  describe("Regression Tests", () => {
    // Tests migrated from test_dependency_logic_v2.js

    it("should preventing exponential growth of dependencies (Getting Bigger Bug)", () => {
      // Scenario: Queueing multiple identical goals should not cause dependencies to compound unexpectedly.
      // If I queue "make 10 bars" 3 times, each should just require "mine 10 ore".

      const char = { goalQueue: [], activeGoal: null };

      // Setup mock behaviour for this specific test
      // Logic: 10 Bars -> Need 10 Ore.
      taskPlanner.resolveDependencies.mockImplementation((itemId, qty) => {
        if (itemId === "copperBar" && qty === 10) {
          return [
            { itemId: "copper_ore", quantity: 10, source: { type: "MINING" } },
          ];
        }
        return [];
      });

      // 1st
      goalManager.setGoal(mockGameState, char, "copperBar", 10);
      const group1 = char.goalQueue[0]; // Since it was first, might be active or queued depending on logic.
      // But mockChar logic in setGoal says if activeGoalGroup exists... here it doesnt.
      // Wait, standard setGoal behavior: if idle, starts immediately.
      // So char.activeGoalGroup is set.

      // Let's force it to queue by making char busy
      char.activeGoalGroup = { id: "busy" };
      char.goalQueue = [];

      goalManager.setGoal(mockGameState, char, "copperBar", 10);
      const step1 = char.goalQueue[0].steps[0];

      goalManager.setGoal(mockGameState, char, "copperBar", 10);
      const step2 = char.goalQueue[1].steps[0];

      expect(step1.targetQuantity).toBe(10);
      expect(step2.targetQuantity).toBe(10);
    });

    it("should handle Active Task Interference (Strict Conservative)", () => {
      // Scenario: Active task is "Mine 10 Ore". Queue "Smith 10 Bars".
      // Logic: "Smith 10 Bars" needs 10 Ore.
      // Should NOT assume the active Mining task will satisfy the need (unless logic is very advanced).
      // Strict safety means we add the dependency anyway.

      // Mock existing active task
      mockChar.activeGoalGroup = {
        mainGoal: { itemId: "copper_ore", quantity: 10 },
        steps: [{ itemId: "copper_ore", targetQuantity: 10 }],
      };

      // Mock planner to return dependency
      taskPlanner.resolveDependencies.mockReturnValue([
        { itemId: "copper_ore", quantity: 10 },
        { itemId: "copperBar", quantity: 10 },
      ]);

      goalManager.setGoal(mockGameState, mockChar, "copperBar", 10);

      const queuedGroup = mockChar.goalQueue[0];
      const steps = queuedGroup.steps;

      // Expect dependency to be present
      expect(steps.some((s) => s.targetItem === "copper_ore")).toBe(true);
    });

    it("should persist startCount on resume (Persistence)", () => {
      // Scenario: Task was half done.
      const partialStep = {
        targetItem: "copper_ore",
        targetQuantity: 10,
        startCount: 0,
        status: "EXECUTING",
      };

      const group = {
        steps: [partialStep],
        currentStepIndex: 0,
      };

      // Manually setting up a queued item that looks like a saved game state
      mockChar.goalQueue = [group];

      // Trigger checkQueue to start it
      mockChar.activeGoalGroup = null;
      goalManager.checkQueue(mockGameState, mockChar);

      expect(mockChar.activeGoalGroup).toBe(group);
      expect(mockChar.activeGoalGroup.steps[0].startCount).toBe(0);
      // Should not have reset startCount to current inventory
    });
  });
});
