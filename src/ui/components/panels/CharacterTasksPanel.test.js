// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterTasksPanel } from "./CharacterTasksPanel";

vi.mock("../../../core/GameState", () => ({
  gameState: {
    inventory: {
      getCount: vi.fn(),
    },
    saveGame: vi.fn(),
  },
}));

vi.mock("../../../core/GoalManager", () => ({
  goalManager: {
    clearGoal: vi.fn(),
    removeGoalFromQueue: vi.fn(),
    reorderGoalQueue: vi.fn(),
    setGoal: vi.fn(),
  },
}));

vi.mock("../../../core/ItemRegistry", () => ({
  ITEM_DEFINITIONS: {
    copper_ore: { name: "Copper Ore", icon: "🪨" },
    iron_ore: { name: "Iron Ore", icon: "⛏️" },
    coal: { name: "Coal", icon: "�ite" },
  },
}));

vi.mock("../../../core/Constants", () => ({
  UI_COLORS: {
    STATUS_ACTIVE: "#4ade80",
  },
}));

import { gameState } from "../../../core/GameState";
import { goalManager } from "../../../core/GoalManager";

describe("CharacterTasksPanel", () => {
  let container;
  let mockUiManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");
    mockUiManager = {
      renderMainWindow: vi.fn(),
      showItemSelectionModal: vi.fn(),
    };
    gameState.inventory.getCount.mockReturnValue(0);
  });

  describe("render state routing", () => {
    it("should render empty state when no goal and no activity", () => {
      const char = {
        activeGoal: null,
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      expect(container.textContent).toContain("No active tasks");
      expect(container.querySelector(".btn-top-action")).not.toBeNull();
    });

    it("should render active goal state when activeGoal is set", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 10,
          startCount: 0,
          status: "Gathering",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 10, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(3);

      CharacterTasksPanel.render(container, char, mockUiManager);

      expect(container.textContent).toContain("Get 10 Copper Ore");
      expect(container.textContent).toContain("3/10");
      expect(container.textContent).toContain("Gathering");
    });

    it("should render activity state when currentActivity is set", () => {
      const char = {
        activeGoal: null,
        currentActivity: { target: "wander_expansion", phase: "SEARCHING" },
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      expect(container.textContent).toContain("Wander Expansion");
      expect(container.textContent).toContain("SEARCHING");
      expect(
        container.querySelector(".active-goal-card.activity-state"),
      ).not.toBeNull();
    });
  });

  describe("progress calculation", () => {
    it("should calculate progress correctly", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 20,
          startCount: 5,
          status: "Gathering",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 20, startCount: 5 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(15); // collected = 15 - 5 = 10

      CharacterTasksPanel.render(container, char, mockUiManager);

      const bar = container.querySelector(".goal-progress-bar-fill");
      expect(bar.style.width).toBe("50%"); // 10/20 = 50%
    });

    it("should cap progress at 100%", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Complete",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(10); // collected = 10, over target of 5

      CharacterTasksPanel.render(container, char, mockUiManager);

      const bar = container.querySelector(".goal-progress-bar-fill");
      expect(bar.style.width).toBe("100%");
    });

    it("should handle zero startCount", () => {
      const char = {
        activeGoal: {
          targetItem: "iron_ore",
          targetQuantity: 10,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "iron_ore", targetQuantity: 10 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(7);

      CharacterTasksPanel.render(container, char, mockUiManager);

      expect(container.textContent).toContain("7/10");
    });
  });

  describe("activity name formatting", () => {
    it("should format underscore-separated names to title case", () => {
      const char = {
        activeGoal: null,
        currentActivity: { target: "wander_expansion" },
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      expect(container.textContent).toContain("Wander Expansion");
    });
  });

  describe("queue rendering", () => {
    it("should render queued goals", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [
          {
            mainGoal: { itemId: "iron_ore", quantity: 10 },
            steps: [{ targetItem: "iron_ore", targetQuantity: 10, startCount: 0 }],
          },
        ],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      const queueItems = container.querySelectorAll(".queue-item-card");
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].textContent).toContain("Iron Ore");
    });

    it("should return empty string for empty queue", () => {
      const html = CharacterTasksPanel.getQueueHTML({ goalQueue: [] });
      expect(html).toBe("");
    });

    it("should return empty string for null queue", () => {
      const html = CharacterTasksPanel.getQueueHTML({ goalQueue: null });
      expect(html).toBe("");
    });
  });

  describe("group steps rendering", () => {
    it("should render multi-step goals with status indicators", () => {
      gameState.inventory.getCount.mockImplementation((id) => {
        if (id === "copper_ore") return 10;
        if (id === "iron_ore") return 3;
        return 0;
      });

      const char = {
        activeGoal: {
          targetItem: "iron_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Gathering",
        },
        activeGoalGroup: {
          id: 1,
          currentStepIndex: 1,
          steps: [
            { targetItem: "copper_ore", targetQuantity: 10, startCount: 0 },
            { targetItem: "iron_ore", targetQuantity: 5, startCount: 0 },
          ],
        },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      // Should show steps section since steps > 1
      const stepsDiv = container.querySelector(".active-goal-steps");
      expect(stepsDiv).not.toBeNull();

      // Step 1 (copper_ore) should be done (currentStepIndex=1, idx=0 < 1)
      // Step 2 (iron_ore) should be active
      expect(stepsDiv.textContent).toContain("Copper Ore");
      expect(stepsDiv.textContent).toContain("Iron Ore");
      expect(stepsDiv.innerHTML).toContain("Active");
    });
  });

  describe("event bindings", () => {
    it("should cancel goal when cancel button clicked", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      container.querySelector(".btn-cancel-goal").click();

      expect(goalManager.clearGoal).toHaveBeenCalledWith(gameState, char);
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });

    it("should stop activity when stop button clicked", () => {
      const char = {
        activeGoal: null,
        currentActivity: { target: "exploring" },
        goalQueue: [],
        stopActivity: vi.fn(),
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      container.querySelector(".btn-stop-activity").click();

      expect(char.stopActivity).toHaveBeenCalled();
      expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
    });
  });

  describe("update state detection", () => {
    it("should re-render when state changes from empty to goal", () => {
      const char = {
        activeGoal: null,
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);
      expect(container.textContent).toContain("No active tasks");

      // Now char has a goal
      char.activeGoal = {
        targetItem: "copper_ore",
        targetQuantity: 5,
        startCount: 0,
        status: "Working",
      };
      char.activeGoalGroup = { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] };

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.textContent).toContain("Copper Ore");
    });

    it("should re-render when state changes from goal to empty", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);
      expect(container.textContent).toContain("Copper Ore");

      char.activeGoal = null;
      char.activeGoalGroup = null;

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.textContent).toContain("No active tasks");
    });

    it("should re-render when state changes from empty to activity", () => {
      const char = {
        activeGoal: null,
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      char.currentActivity = { target: "wander_expansion", phase: "EXPLORING" };

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.querySelector(".active-goal-card.activity-state")).not.toBeNull();
    });

    it("should re-render when state changes from goal to activity", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      char.activeGoal = null;
      char.activeGoalGroup = null;
      char.currentActivity = { target: "exploring", phase: "SEARCHING" };

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.querySelector(".active-goal-card.activity-state")).not.toBeNull();
    });

    it("should smart-update progress bar when goal state unchanged", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 10,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 10, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(3);
      CharacterTasksPanel.render(container, char, mockUiManager);

      let bar = container.querySelector(".goal-progress-bar-fill");
      expect(bar.style.width).toBe("30%");

      // Inventory advances
      gameState.inventory.getCount.mockReturnValue(7);
      CharacterTasksPanel.update(container, char, mockUiManager);

      bar = container.querySelector(".goal-progress-bar-fill");
      expect(bar.style.width).toBe("70%");
    });

    it("should smart-update status text", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 10,
          startCount: 0,
          status: "Mining",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 10, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      char.activeGoal.status = "Smelting";
      CharacterTasksPanel.update(container, char, mockUiManager);

      const statusSpan = container.querySelector(".goal-status span");
      expect(statusSpan.innerText).toBe("Smelting");
    });

    it("should re-render on group ID change", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      // Switch to new group
      char.activeGoal = {
        targetItem: "iron_ore",
        targetQuantity: 3,
        startCount: 0,
        status: "Working",
      };
      char.activeGoalGroup = { id: 2, steps: [{ targetItem: "iron_ore", targetQuantity: 3, startCount: 0 }] };

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.textContent).toContain("Iron Ore");
    });

    it("should not update DOM when dragging", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 10,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 10, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      gameState.inventory.getCount.mockReturnValue(3);
      CharacterTasksPanel.render(container, char, mockUiManager);

      CharacterTasksPanel.isDragging = true;
      gameState.inventory.getCount.mockReturnValue(7);
      CharacterTasksPanel.update(container, char, mockUiManager);

      // Bar should NOT have updated
      const bar = container.querySelector(".goal-progress-bar-fill");
      expect(bar.style.width).toBe("30%");

      CharacterTasksPanel.isDragging = false;
    });

    it("should do nothing if goal section not found", () => {
      const emptyContainer = document.createElement("div");
      const char = { activeGoal: null, currentActivity: null };
      // Should not throw
      CharacterTasksPanel.update(emptyContainer, char, mockUiManager);
    });

    it("should smart-update activity phase text", () => {
      const char = {
        activeGoal: null,
        currentActivity: { target: "wander_expansion", phase: "SEARCHING" },
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      char.currentActivity.phase = "EXPLORING";
      CharacterTasksPanel.update(container, char, mockUiManager);

      const statusEl = container.querySelector(".goal-text > div:last-child");
      expect(statusEl.innerText).toBe("EXPLORING");
    });

    it("should re-render when steps structure changes", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);
      expect(container.querySelector(".active-goal-steps")).toBeNull();

      // Now group has 2 steps
      char.activeGoalGroup.steps = [
        { targetItem: "copper_ore", targetQuantity: 5, startCount: 0 },
        { targetItem: "iron_ore", targetQuantity: 3, startCount: 0 },
      ];
      char.activeGoalGroup.currentStepIndex = 0;

      CharacterTasksPanel.update(container, char, mockUiManager);

      expect(container.querySelector(".active-goal-steps")).not.toBeNull();
    });
  });

  describe("queue item removal", () => {
    it("should remove queue item when remove button clicked", () => {
      const char = {
        activeGoal: {
          targetItem: "copper_ore",
          targetQuantity: 5,
          startCount: 0,
          status: "Working",
        },
        activeGoalGroup: { id: 1, steps: [{ targetItem: "copper_ore", targetQuantity: 5, startCount: 0 }] },
        currentActivity: null,
        goalQueue: [
          {
            mainGoal: { itemId: "iron_ore", quantity: 10 },
            steps: [{ targetItem: "iron_ore", targetQuantity: 10, startCount: 0 }],
          },
        ],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      const removeBtn = container.querySelector(".btn-remove-queue");
      removeBtn.click();

      expect(goalManager.removeGoalFromQueue).toHaveBeenCalledWith(gameState, char, 0);
    });
  });

  describe("new task button", () => {
    it("should open item selection modal when new task button clicked", () => {
      const char = {
        activeGoal: null,
        currentActivity: null,
        goalQueue: [],
      };

      CharacterTasksPanel.render(container, char, mockUiManager);

      container.querySelector(".btn-top-action").click();

      expect(mockUiManager.showItemSelectionModal).toHaveBeenCalled();
    });
  });
});
