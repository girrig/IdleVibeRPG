import { getSkillDefinition } from "./SkillRegistry";

export class TaskRunner {
  constructor() {}

  /**
   * Starts a specific task step for a character.
   * Sets up the startCount and initiates the physical activity.
   */
  startTask(gameState, character, step, group) {
    if (!step) return;

    step.startTime = Date.now();

    // HYBRID PROGRESS LOGIC
    // If this step is the MAIN GOAL, we use Relative Progress.
    // If this step is a DEPENDENCY, we use Absolute Progress.
    const isMainGoal =
      group && group.mainGoal && step.targetItem === group.mainGoal.itemId;

    if (isMainGoal) {
      // Relative: Count existing items as the "starting line"
      step.startCount = gameState.inventory.getCount(step.targetItem);
    } else {
      // Absolute: Count from 0 (Stockpile behavior)
      step.startCount = 0;
    }
    step.status = "EXECUTING";

    character.activeGoal = step;
    // gameState.triggerNotification(
    //   `${character.name} goal set: Get ${step.targetQuantity} ${step.targetItem}`,
    //   "info",
    // );
    this.ensureActivity(character);
  }

  /**
   * Ensures the character is performing the correct physical activity for the current goal.
   */
  ensureActivity(character) {
    const goal = character.activeGoal;
    if (!goal) return;

    const { source } = goal;

    if (source.type === "SKILL") {
      const current = character.currentActivity;

      // If not doing it, start it
      if (
        !current ||
        current.type !== source.skillId ||
        current.target !== source.target
      ) {
        // Force the activity
        if (current) {
          character.stopActivity();
        }
        character.startActivity(source.skillId, source.target);
      }
    }
  }

  /**
   * Checks progress of the active goal.
   * Returns 'COMPLETED' if done, 'EXECUTING' if running.
   */
  checkProgress(gameState, character) {
    const goal = character.activeGoal;
    if (!goal) return "NO_GOAL";

    // Check if obtained
    const currentCount = gameState.inventory.getCount(goal.targetItem);

    // Fix for "Hang at 0" / Resource Debt
    if (currentCount < goal.startCount) {
      goal.startCount = currentCount;
    }

    const targetTotal = goal.startCount + goal.targetQuantity;

    if (currentCount >= targetTotal) {
      gameState.triggerNotification(
        `${character.name} obtained ${goal.targetQuantity} ${goal.targetItem}!`,
        "success",
      );
      goal.status = "COMPLETED";
      return "COMPLETED";
    }

    // If not executing the right task, correct it
    if (goal.status === "EXECUTING") {
      this.ensureActivity(character);
    }
    return "EXECUTING";
  }
}

export const taskRunner = new TaskRunner();
