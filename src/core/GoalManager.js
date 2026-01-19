import { sourceRegistry } from "./SourceRegistry";
import { gameState } from "./GameState";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

export class GoalManager {
  constructor() {
    // Singleton logic if needed, but we'll mainly use static or instance attached to GameState
  }

  // Assign a goal to a character
  setGoal(character, itemId, quantity = 1) {
    // dependency resolution
    const plan = this.resolveDependencies(itemId, quantity);

    if (plan.length === 0) {
      gameState.triggerNotification(
        `Could not formulate plan for ${itemId}`,
        "error",
      );
      return false;
    }

    plan.forEach((step, index) => {
      // Create Goal Object
      const newGoal = {
        targetItem: step.itemId,
        targetQuantity: step.quantity,
        source: step.source,
        startTime: Date.now(),
        startCount: gameState.inventory.getCount(step.itemId),
        status: "EXECUTING",
        steps: [], // For future multi-step
      };

      // If already has a goal, Queue it
      if (character.activeGoal) {
        if (!character.goalQueue) character.goalQueue = [];
        character.goalQueue.push(newGoal);
        // Only notify for the final goal
        if (index === plan.length - 1) {
          gameState.triggerNotification(
            `${character.name}: Queued Goal - Get ${quantity} ${itemId}`,
            "info",
          );
        }
      } else {
        character.activeGoal = newGoal;
        gameState.triggerNotification(
          `${character.name} goal set: Get ${step.quantity} ${step.itemId}`,
          "info",
        );
        this.executeGoal(character);
      }
    });

    return true;
  }

  resolveDependencies(itemId, quantity) {
    const plan = [];
    // Simulation inventory to track what we "will have" after each step
    // We can clone the current inventory counts for the simulation
    const simInventory = { ...gameState.inventory.items };

    const getSimCount = (id) => simInventory[id] || 0;
    const adjustSimCount = (id, delta) => {
      simInventory[id] = (simInventory[id] || 0) + delta;
    };

    // Recursive Requirement Finder
    const addRequirement = (reqItem, reqQty, checkInventory = true) => {
      const current = getSimCount(reqItem);

      let missing = reqQty;
      if (checkInventory) {
        if (current >= reqQty) {
          // We have enough, assume we consume it
          adjustSimCount(reqItem, -reqQty);
          return;
        }
        missing = reqQty - current;
      }

      // Find Source
      const source = sourceRegistry.getSource(reqItem);
      if (!source) {
        console.warn(`No source found for dependency ${reqItem}`);
        return;
      }

      // Check if it has recipe costs (Ingredients)
      // Look up in SKILL_DEFINITIONS
      // source has { type, skillId, target }
      // SKILL_DEFINITIONS[source.skillId].options[source.target].cost
      let cost = null;
      const skillDef = SKILL_DEFINITIONS[source.skillId];
      if (skillDef && skillDef.options && skillDef.options[source.target]) {
        cost = skillDef.options[source.target].cost;
      }

      // If dependencies exist, resolve them EARLIER
      if (cost) {
        Object.entries(cost).forEach(([ingId, ingPerUnit]) => {
          const totalIngNeeded = ingPerUnit * missing;
          addRequirement(ingId, totalIngNeeded, true);
        });
      }

      // Add THIS task to plan
      // We assume we gather/craft the MISSING amount
      plan.push({
        itemId: reqItem,
        quantity: missing,
        source: source,
      });

      // "Produce" the item in sim
      adjustSimCount(reqItem, missing);
      // And "Consume" it for the parent (since we produced exactly what was missing + what we had = reqQty)
      adjustSimCount(reqItem, -reqQty);
    };

    addRequirement(itemId, quantity, false);
    return plan;
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

  reorderGoalQueue(character, fromIndex, toIndex) {
    if (!character.goalQueue) return;
    if (fromIndex < 0 || fromIndex >= character.goalQueue.length) return;
    if (toIndex < 0 || toIndex >= character.goalQueue.length) return;

    const [movedGoal] = character.goalQueue.splice(fromIndex, 1);
    character.goalQueue.splice(toIndex, 0, movedGoal);
    gameState.saveGame();
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
        // Force the activity if unrelated
        if (current) {
          char.stopActivity();
        }
        char.startActivity(source.skillId, source.target);
      }
    }
  }
}

export const goalManager = new GoalManager();
