import { sourceRegistry } from "./SourceRegistry";
import { gameState } from "./GameState";

export class GoalManager {
  constructor() {
    // Singleton logic if needed, but we'll mainly use static or instance attached to GameState
  }

  // Assign a goal to a character
  setGoal(character, itemId, quantity = 1) {
    const source = sourceRegistry.getSource(itemId);

    // Validation
    if (!source) {
      gameState.triggerNotification(
        `Cannot find source for ${itemId}`,
        "error",
      );
      return false;
    }

    // Create Goal Object
    const newGoal = {
      targetItem: itemId,
      targetQuantity: quantity,
      source: source,
      startTime: Date.now(),
      startCount: gameState.inventory.getCount(itemId),
      status: "EXECUTING",
      steps: [], // For future multi-step
    };

    // If already has a goal, Queue it
    if (character.activeGoal) {
      if (!character.goalQueue) character.goalQueue = [];
      character.goalQueue.push(newGoal);
      gameState.triggerNotification(
        `${character.name}: Queued Goal - Get ${quantity} ${itemId}`,
        "info",
      );
      return true;
    }

    character.activeGoal = newGoal;

    gameState.triggerNotification(
      `${character.name} goal set: Get ${quantity} ${itemId}`,
      "info",
    );

    // Execute immediately
    this.executeGoal(character);
    return true;
  }

  clearGoal(character) {
    if (!character.activeGoal) return;

    gameState.triggerNotification(
      `${character.name}: Cancelled goal - Get ${character.activeGoal.targetQuantity} ${character.activeGoal.targetItem}`,
      "info",
    );

    character.activeGoal = null;
    character.stopActivity(); // Clear current physical activity

    // Check Queue
    if (character.goalQueue && character.goalQueue.length > 0) {
      const nextGoal = character.goalQueue.shift();
      // Reset start count for the new goal
      nextGoal.startCount = gameState.inventory.getCount(nextGoal.targetItem);
      nextGoal.startTime = Date.now();

      character.activeGoal = nextGoal;
      gameState.triggerNotification(
        `${character.name} starting next goal: Get ${nextGoal.targetQuantity} ${nextGoal.targetItem}`,
        "info",
      );
      this.executeGoal(character);
    }
  }

  update(gameState) {
    // Iterate all characters and update their goals
    gameState.characters.forEach((char) => {
      if (char.activeGoal) {
        this.checkGoalProgress(char);
      }
    });
  }

  removeGoalFromQueue(character, index) {
    if (character.goalQueue && character.goalQueue[index]) {
      const removed = character.goalQueue.splice(index, 1)[0];
      gameState.triggerNotification(
        `${character.name}: Removed queued goal - Get ${removed.targetQuantity} ${removed.targetItem}`,
        "info",
      );
    }
  }

  checkGoalProgress(char) {
    const goal = char.activeGoal;
    if (!goal) return;

    // Check if obtained
    const currentCount = gameState.inventory.getCount(goal.targetItem);
    const targetTotal = goal.startCount + goal.targetQuantity;

    if (currentCount >= targetTotal) {
      // Objective Complete!
      gameState.triggerNotification(
        `${char.name} obtained ${goal.targetQuantity} ${goal.targetItem}!`,
        "success",
      );

      // Check Queue
      char.activeGoal = null;
      if (char.goalQueue && char.goalQueue.length > 0) {
        const nextGoal = char.goalQueue.shift();
        // Reset start count for the new goal to current count
        nextGoal.startCount = gameState.inventory.getCount(nextGoal.targetItem);
        nextGoal.startTime = Date.now();

        char.activeGoal = nextGoal;
        gameState.triggerNotification(
          `${char.name} starting next goal: Get ${nextGoal.targetQuantity} ${nextGoal.targetItem}`,
          "info",
        );
        this.executeGoal(char);
      } else {
        // Stop activity if no more goals
        char.stopActivity();
      }
      return;
    }

    // If not executing the right task, correct it
    // This handles if the user manually stopped it or it got interrupted
    if (goal.status === "EXECUTING") {
      this.executeGoal(char);
    }
  }

  executeGoal(char) {
    const goal = char.activeGoal;
    if (!goal) return;

    const { source } = goal;

    // Simple 1-step logic for now
    if (source.type === "SKILL") {
      const current = char.currentActivity;
      // If not doing it, start it
      if (
        !current ||
        current.type !== source.skillId ||
        current.target !== source.target
      ) {
        char.startActivity(source.skillId, source.target);
      }
    }
  }
}

export const goalManager = new GoalManager();
