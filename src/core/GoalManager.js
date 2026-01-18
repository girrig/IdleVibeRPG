import { sourceRegistry } from "./SourceRegistry";
import { gameState } from "./GameState";

export class GoalManager {
  constructor() {
    // Singleton logic if needed, but we'll mainly use static or instance attached to GameState
  }

  // Assign a goal to a character
  setGoal(character, itemId) {
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
    character.activeGoal = {
      targetItem: itemId,
      source: source,
      startTime: Date.now(),
      startCount: gameState.inventory.getCount(itemId),
      status: "EXECUTING",
      steps: [], // For future multi-step
    };

    gameState.triggerNotification(
      `${character.name} goal set: Get ${itemId}`,
      "info",
    );

    // Execute immediately
    this.executeGoal(character);
    return true;
  }

  clearGoal(character) {
    character.activeGoal = null;
    character.stopActivity();
  }

  update(gameState) {
    // Iterate all characters and update their goals
    gameState.characters.forEach((char) => {
      if (char.activeGoal) {
        this.checkGoalProgress(char);
      }
    });
  }

  checkGoalProgress(char) {
    const goal = char.activeGoal;
    if (!goal) return;

    // Check if obtained
    const currentCount = gameState.inventory.getCount(goal.targetItem);
    if (currentCount > goal.startCount) {
      // Objective Complete!
      gameState.triggerNotification(
        `${char.name} obtained ${goal.targetItem}!`,
        "success",
      );

      // For now, clear goal (Single Item Fetch).
      // The prompt implied "queue of everything i needs to do", which might imply multiple steps,
      // but "until item has been obtained" usually means "Mission Accomplished".
      // Since it's an Idle game, maybe they want to KEEP gathering?
      // "until the item has been obtained" -> implies stop once obtained.

      this.clearGoal(char);
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
