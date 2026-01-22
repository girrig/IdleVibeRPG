import { taskPlanner } from "./TaskPlanner";
import { taskRunner } from "./TaskRunner";

export class GoalManager {
  constructor() {
    // Singleton logic
  }

  // Assign a goal to a character
  setGoal(gameState, character, itemId, quantity = 1) {
    // 1. Calculate Projected Inventory (Current + Queued Net Change)
    const projectedInventory = taskPlanner.getProjectedInventory(
      character,
      gameState.inventory.items,
    );

    // 2. Resolve based on Projection
    const plan = taskPlanner.resolveDependencies(
      itemId,
      quantity,
      projectedInventory,
    );

    if (plan.length === 0) {
      gameState.triggerNotification(
        `Could not formulate plan for ${itemId}`,
        "error",
      );
      return false;
    }

    // Create Goal Group
    const goalGroup = {
      id: Date.now(),
      mainGoal: { itemId, quantity },
      steps: plan.map((step) => ({
        targetItem: step.itemId,
        targetQuantity: step.quantity,
        source: step.source,
        startTime: null, // Will be set when executed
        status: "PENDING",
      })),
      currentStepIndex: 0,
      createdAt: Date.now(),
    };

    if (character.activeGoalGroup || character.activeGoal) {
      if (!character.goalQueue) character.goalQueue = [];
      character.goalQueue.push(goalGroup);
      gameState.triggerNotification(
        `${character.name}: Queued Group - Get ${quantity} ${itemId}`,
        "info",
      );
    } else {
      character.activeGoalGroup = goalGroup;
      this.startFlaggedGoal(gameState, character, goalGroup);
    }

    return true;
  }

  startFlaggedGoal(gameState, character, group) {
    if (!group || group.currentStepIndex >= group.steps.length) return;

    const step = group.steps[group.currentStepIndex];
    taskRunner.startTask(gameState, character, step, group);
    this.executeGoal(character);
  }

  clearGoal(gameState, character) {
    // Clears the entire current GROUP
    if (!character.activeGoalGroup && !character.activeGoal) return;

    if (character.activeGoalGroup) {
      gameState.triggerNotification(
        `${character.name}: Cancelled Goal Group - Get ${character.activeGoalGroup.mainGoal.quantity} ${character.activeGoalGroup.mainGoal.itemId}`,
        "info",
      );
    } else if (character.activeGoal) {
      gameState.triggerNotification(
        `${character.name}: Cancelled goal - Get ${character.activeGoal.targetQuantity} ${character.activeGoal.targetItem}`,
        "info",
      );
    }

    character.activeGoal = null;
    character.activeGoalGroup = null;
    character.stopActivity(); // Clear current physical activity

    this.checkQueue(gameState, character);
  }

  checkQueue(gameState, character) {
    if (character.goalQueue && character.goalQueue.length > 0) {
      const nextGroup = character.goalQueue.shift();

      // DYNAMIC RE-CHECK: Before starting, verify dependencies for the resumed step
      if (nextGroup.steps && nextGroup.steps.length > 0) {
        // Ensure index is valid
        if (nextGroup.currentStepIndex === undefined)
          nextGroup.currentStepIndex = 0;

        const currentIdx = nextGroup.currentStepIndex;
        if (currentIdx < nextGroup.steps.length) {
          // DYNAMIC RE-CHECK LOGIC (Full Re-Plan)
          if (nextGroup.mainGoal) {
            console.log(
              `[checkQueue] Re-Planning Group ${nextGroup.id} (Resuming)`,
            );

            // IGNORE existing inventory for the Main Goal item itself.
            const planningInventory = { ...gameState.inventory.items };
            planningInventory[nextGroup.mainGoal.itemId] = 0;

            const newPlan = taskPlanner.resolveDependencies(
              nextGroup.mainGoal.itemId,
              nextGroup.mainGoal.quantity,
              planningInventory, // Modified Inventory
              true, // generateFullTrace
            );

            // Update Group Steps
            nextGroup.steps = newPlan.map((s) => ({
              targetItem: s.itemId,
              targetQuantity: s.quantity,
              source: s.source,
              startTime: null,
              status: s.status || "PENDING",
            }));

            // Find where to start (First non-completed step)
            const firstPendingIndex = nextGroup.steps.findIndex(
              (s) => s.status !== "COMPLETED",
            );
            nextGroup.currentStepIndex =
              firstPendingIndex >= 0 ? firstPendingIndex : 0;
          }
        }
      }

      character.activeGoalGroup = nextGroup;

      gameState.triggerNotification(
        `${character.name} starting next group: Get ${nextGroup.mainGoal.quantity} ${nextGroup.mainGoal.itemId}`,
        "info",
      );

      this.startFlaggedGoal(gameState, character, nextGroup);
    }
  }

  update(gameState) {
    // Iterate all characters and update their goals
    gameState.characters.forEach((char) => {
      if (char.activeGoal) {
        this.checkGoalProgress(gameState, char);
      }
    });
  }

  removeGoalFromQueue(gameState, character, index) {
    if (character.goalQueue && character.goalQueue[index]) {
      const removed = character.goalQueue.splice(index, 1)[0];
      gameState.triggerNotification(
        `${character.name}: Removed queued group - Get ${removed.mainGoal.quantity} ${removed.mainGoal.itemId}`,
        "info",
      );
    }
  }

  reorderGoalQueue(gameState, character, fromIndex, toIndex) {
    // Handle Active Task logic via special index -1
    const isActiveSource = fromIndex === -1;
    const isActiveTarget = toIndex === -1;

    if (isActiveSource) {
      // Active -> Queue (Insert at toIndex)
      if (!character.activeGoalGroup) return; // Nothing to move

      const groupToMove = character.activeGoalGroup;

      // Stop current activity
      character.activeGoal = null;
      character.activeGoalGroup = null;
      character.stopActivity();

      // Insert into queue
      if (!character.goalQueue) character.goalQueue = [];
      character.goalQueue.splice(toIndex, 0, groupToMove);

      gameState.triggerNotification(
        `${character.name}: Paused active task`,
        "info",
      );

      // Start next task
      this.checkQueue(gameState, character);
      return;
    }

    if (isActiveTarget) {
      // Queue -> Active (Swap/Start)
      if (!character.goalQueue || !character.goalQueue[fromIndex]) return;

      const newActive = character.goalQueue.splice(fromIndex, 1)[0];
      const oldActive = character.activeGoalGroup;

      if (oldActive) {
        // If OldActive exists, push it to Queue[fromIndex].
        character.goalQueue.splice(fromIndex, 0, oldActive);
      }

      // Unshift NewActive to [0].
      character.goalQueue.unshift(newActive);

      // Clear Active.
      character.activeGoal = null;
      character.activeGoalGroup = null;
      character.stopActivity();

      // Call checkQueue(). checkQueue will take [0] (NewActive) and run re-check.
      this.checkQueue(gameState, character);
      return;
    }

    // Standard Queue Reorder
    if (!character.goalQueue) return;
    if (fromIndex < 0 || fromIndex >= character.goalQueue.length) return;
    if (toIndex < 0 || toIndex >= character.goalQueue.length) return;

    const [movedGoal] = character.goalQueue.splice(fromIndex, 1);
    character.goalQueue.splice(toIndex, 0, movedGoal);
    gameState.saveGame();
  }

  checkGoalProgress(gameState, char) {
    const goal = char.activeGoal;
    if (!goal || !char.activeGoalGroup) return;

    const status = taskRunner.checkProgress(gameState, char);

    if (status === "COMPLETED") {
      // Advance to next step in group
      char.activeGoalGroup.currentStepIndex++;

      if (
        char.activeGoalGroup.currentStepIndex <
        char.activeGoalGroup.steps.length
      ) {
        // Next step in same group
        this.startFlaggedGoal(gameState, char, char.activeGoalGroup);
      } else {
        // Group Complete
        gameState.triggerNotification(
          `${char.name} completed group: Get ${char.activeGoalGroup.mainGoal.quantity} ${char.activeGoalGroup.mainGoal.itemId}`,
          "success",
        );
        char.activeGoal = null;
        char.activeGoalGroup = null;
        char.stopActivity();

        this.checkQueue(gameState, char);
      }
    }
  }

  executeGoal(char) {
    taskRunner.ensureActivity(char);
  }
}

export const goalManager = new GoalManager();
