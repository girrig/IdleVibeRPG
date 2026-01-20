import { sourceRegistry } from "./SourceRegistry";
import { gameState } from "./GameState";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

export class GoalManager {
  constructor() {
    // Singleton logic if needed, but we'll mainly use static or instance attached to GameState
  }

  // Assign a goal to a character
  setGoal(character, itemId, quantity = 1) {
    // 1. Calculate Projected Inventory (Current + Queued Net Change)
    const projectedInventory = this.getProjectedInventory(character);

    // 2. Resolve based on Projection
    const plan = this.resolveDependencies(itemId, quantity, projectedInventory);

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
        startCount: 0,
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
      this.startFlaggedGoal(character, goalGroup);
    }

    return true;
  }

  getProjectedInventory(character) {
    // Start with current actual inventory
    const inventory = { ...gameState.inventory.items };

    const adjust = (id, delta) => {
      inventory[id] = (inventory[id] || 0) + delta;
    };

    // Identify all PENDING or EXECUTING tasks
    let allSteps = [];

    // 1. Active Group (Remaining steps)
    if (character.activeGoalGroup) {
      const group = character.activeGoalGroup;
      // Add pending/executing steps from this group
      for (let i = group.currentStepIndex; i < group.steps.length; i++) {
        allSteps.push(group.steps[i]);
      }
    }
    // Fallback: Active Goal (Legacy)
    else if (character.activeGoal) {
      allSteps.push(character.activeGoal);
    }

    // 2. Queued Groups
    // USER REQUEST: "Minus the tasks before it"
    // Logic: We MUST count the COSTS of queued tasks (so we know if we'll run out).
    // But we should NOT count the GAINS (to allow reordering "Producer" below "Consumer" safely).
    if (character.goalQueue) {
      character.goalQueue.forEach((group) => {
        if (group.steps) {
          allSteps = allSteps.concat(group.steps);
        } else {
          allSteps.push(group);
        }
      });
    }

    // Apply Logic
    allSteps.forEach((step) => {
      let quantityToProduce = step.targetQuantity;
      const isQueued =
        character.goalQueue &&
        character.goalQueue.some((g) => g.steps && g.steps.includes(step));

      // If this is the active step, only project what is REMAINING
      if (
        step.status === "EXECUTING" &&
        step === character.activeGoal &&
        step.startCount !== undefined
      ) {
        const currentCount = gameState.inventory.getCount(step.targetItem);
        const targetTotal = step.startCount + step.targetQuantity;
        const remaining = Math.max(0, targetTotal - currentCount);
        quantityToProduce = remaining;
      }

      // Output: We WILL get this item (Only if Active)
      // Reverted to Conservative Projection per user request.
      // Queued tasks do NOT add to projected inventory.
      // Output: We WILL get this item (Only if Active)
      // STRICT CONSERVATIVE UPDATE: Ignore Active Gain too.
      // User Request: "queue up 10 copper ore then queue up 10 copper bars" -> Should add Mine 10.
      // If we count active gains, it assumes the CURRENT mining task covers the FUTURE smithing task.
      // The user wants independent chains. So we ignore ALL output.

      // const isActive = step === character.activeGoal;
      // if (isActive) {
      //   adjust(step.targetItem, quantityToProduce);
      // }

      // Input: Did it cost anything? (Count Costs for EVERYONE)
      if (step.source && step.source.type === "SKILL") {
        const skillDef = SKILL_DEFINITIONS[step.source.skillId];
        if (
          skillDef &&
          skillDef.options &&
          skillDef.options[step.source.target]
        ) {
          const cost = skillDef.options[step.source.target].cost;
          if (cost) {
            Object.entries(cost).forEach(([ingId, costPerUnit]) => {
              const totalCost = costPerUnit * quantityToProduce;
              // Input: We WILL consume this
              // CLAMP AT ZERO: Do not go negative.
              // If we don't have it, we assume the task will generate a dependency to get it.
              // We just want to know if we consume EXISTING inventory.
              inventory[ingId] = Math.max(
                0,
                (inventory[ingId] || 0) - totalCost,
              );
            });
          }
        }
      }
    });

    return inventory;
  }

  resolveDependencies(itemId, quantity, baseInventory = null) {
    const plan = [];
    // Simulation inventory to track what we "will have" after each step
    // Use baseInventory (Projected) if provided, otherwise current
    const simInventory = baseInventory
      ? { ...baseInventory }
      : { ...gameState.inventory.items };

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

  startFlaggedGoal(character, group) {
    if (!group || group.currentStepIndex >= group.steps.length) return;

    const step = group.steps[group.currentStepIndex];
    step.startTime = Date.now();
    step.startCount = gameState.inventory.getCount(step.targetItem);
    step.status = "EXECUTING";

    character.activeGoal = step;
    gameState.triggerNotification(
      `${character.name} goal set: Get ${step.targetQuantity} ${step.targetItem}`,
      "info",
    );
    this.executeGoal(character);
  }

  clearGoal(character) {
    // Clears the entire current GROUP
    // Fallback: If no group but has activeGoal (Legacy/Migration), activeGoal should still be cleared
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

    this.checkQueue(character);
  }

  checkQueue(character) {
    if (character.goalQueue && character.goalQueue.length > 0) {
      const nextGroup = character.goalQueue.shift();
      character.activeGoalGroup = nextGroup;

      gameState.triggerNotification(
        `${character.name} starting next group: Get ${nextGroup.mainGoal.quantity} ${nextGroup.mainGoal.itemId}`,
        "info",
      );

      this.startFlaggedGoal(character, nextGroup);
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
        `${character.name}: Removed queued group - Get ${removed.mainGoal.quantity} ${removed.mainGoal.itemId}`,
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
    // Safety check if activeGoal exists but activeGoalGroup doesn't (legacy state or error)
    if (!goal || !char.activeGoalGroup) return;

    // Check if obtained
    // Check if obtained
    const currentCount = gameState.inventory.getCount(goal.targetItem);

    // Fix for "Hang at 0" / Resource Debt
    // If inventory dropped below where we started (e.g. user sold items),
    // float the startCount down so the user doesn't have to "pay back" the debt.
    if (currentCount < goal.startCount) {
      console.log(
        `[GoalManager] Resource Debt detected for ${goal.targetItem}. Floating start from ${goal.startCount} to ${currentCount}.`,
      );
      goal.startCount = currentCount;
    }

    const targetTotal = goal.startCount + goal.targetQuantity;

    if (currentCount >= targetTotal) {
      // Step Complete!
      gameState.triggerNotification(
        `${char.name} obtained ${goal.targetQuantity} ${goal.targetItem}!`,
        "success",
      );
      goal.status = "COMPLETED";

      // Advance to next step in group
      char.activeGoalGroup.currentStepIndex++;

      if (
        char.activeGoalGroup.currentStepIndex <
        char.activeGoalGroup.steps.length
      ) {
        // Next step in same group
        this.startFlaggedGoal(char, char.activeGoalGroup);
      } else {
        // Group Complete
        gameState.triggerNotification(
          `${char.name} completed group: Get ${char.activeGoalGroup.mainGoal.quantity} ${char.activeGoalGroup.mainGoal.itemId}`,
          "success",
        );
        char.activeGoal = null;
        char.activeGoalGroup = null;

        // Fix for "Endless Gathering": Stop the physical activity now that the goal is met.
        // If there is a next task in queue, checkQueue will restart it.
        char.stopActivity();

        this.checkQueue(char);
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

      // Log for debugging stalling
      // console.log(`ExecuteGoal: ${source.skillId}.${source.target} vs Current: ${current ? current.type + '.' + current.target : 'None'}`);

      // If not doing it, start it
      if (
        !current ||
        current.type !== source.skillId ||
        current.target !== source.target
      ) {
        console.log(
          `[GoalManager] Starting Activity ${source.skillId} on ${source.target} (Current mismatch)`,
        );

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
