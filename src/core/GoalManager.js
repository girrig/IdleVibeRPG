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

  resolveDependencies(
    itemId,
    quantity,
    baseInventory = null,
    generateFullTrace = false,
    forceComplete = false,
  ) {
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
    const addRequirement = (
      reqItem,
      reqQty,
      checkInventory = true,
      forceComp = false,
    ) => {
      const current = getSimCount(reqItem);
      let missing = reqQty;
      let status = "PENDING"; // Default

      // FORCE COMPLETE MODE: Ignore inventory, just mark complete and recurse
      if (forceComp) {
        status = "COMPLETED";
        // We assume we 'consumed' it or it's virtual, so no sim adjustment needed for the item itself
        // BUT we need to show the history of how we got it.
      }
      // STANDARD / TRACE MODE
      else if (checkInventory) {
        if (current >= reqQty) {
          // We have enough
          adjustSimCount(reqItem, -reqQty);

          if (generateFullTrace) {
            status = "COMPLETED";
            // Fall through to generation w/ status=COMPLETED
            // And we MUST recurse to show ingredients for this completed item
            forceComp = true;
          } else {
            // Standard behavior: Skip if we have it
            return;
          }
        } else {
          missing = reqQty - current;
          // Standard behavior: Produce missing amount
        }
      } else {
        // Root item (checkInventory=false) -> Always produce
        console.log(
          `[Dependency] Root Item ${reqItem}: checkInventory=false. Force producing ${reqQty}. (Current Inv: ${current})`,
        );
      }

      // Find Source
      const source = sourceRegistry.getSource(reqItem);
      if (!source) {
        console.warn(`No source found for dependency ${reqItem}`);
        return;
      }

      // Check if it has recipe costs (Ingredients)
      let cost = null;
      const skillDef = SKILL_DEFINITIONS[source.skillId];
      if (skillDef && skillDef.options && skillDef.options[source.target]) {
        cost = skillDef.options[source.target].cost;
      }

      // If dependencies exist, resolve them EARLIER
      if (cost) {
        Object.entries(cost).forEach(([ingId, ingPerUnit]) => {
          // For COMPLETED items, we assume we needed the full amount.
          // For PENDING items, we only need ingredients for the MISSING amount.
          const quantityBase = status === "COMPLETED" ? reqQty : missing;
          const totalIngNeeded = ingPerUnit * quantityBase;

          // Recurse: If we are forced complete, children are forced complete.
          addRequirement(ingId, totalIngNeeded, true, forceComp);
        });
      }

      // Add THIS task to plan
      // STOCKPILE LOGIC: We always display the FULL requirement (reqQty), not just the missing amount.
      // The progress logic (startCount=0) handles the fact that we might already have some.
      plan.push({
        itemId: reqItem,
        quantity: reqQty,
        source: source,
        status: status, // New property
      });

      if (status !== "COMPLETED") {
        // "Produce" the item in sim
        adjustSimCount(reqItem, missing);
        // And "Consume" it for the parent
        adjustSimCount(reqItem, -reqQty);
      }
    };

    addRequirement(itemId, quantity, false, forceComplete);
    return plan;
  }

  startFlaggedGoal(character, group) {
    if (!group || group.currentStepIndex >= group.steps.length) return;

    const step = group.steps[group.currentStepIndex];
    step.startTime = Date.now();
    // HYBRID PROGRESS LOGIC
    // If this step is the MAIN GOAL (the user requested item), we use Relative Progress.
    // Meaning: "Make X new items". StartCount = Current Inventory.
    // If this step is a DEPENDENCY, we use Absolute Progress (Stockpile).
    // Meaning: "Ensure I have X items". StartCount = 0.
    if (step.startCount === undefined) {
      const isMainGoal =
        group.mainGoal && step.targetItem === group.mainGoal.itemId;

      if (isMainGoal) {
        // Relative: Count existing items as the "starting line"
        step.startCount = gameState.inventory.getCount(step.targetItem);
      } else {
        // Absolute: Count from 0 (Stockpile behavior)
        step.startCount = 0;
      }
    }
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

      // DYNAMIC RE-CHECK: Before starting, verify dependencies for the resumed step
      if (nextGroup.steps && nextGroup.steps.length > 0) {
        // Ensure index is valid
        if (nextGroup.currentStepIndex === undefined)
          nextGroup.currentStepIndex = 0;

        const currentIdx = nextGroup.currentStepIndex;
        if (currentIdx < nextGroup.steps.length) {
          const step = nextGroup.steps[currentIdx];

          // DYNAMIC RE-CHECK LOGIC (Full Re-Plan)
          // We always want to re-evaluate the ENTIRE plan based on the Main Goal and Current Inventory.
          // This ensures that if we gained items (offline/manual), we skip work (mark complted).
          // If we lost items, we add work.

          if (nextGroup.mainGoal) {
            console.log(
              `[checkQueue] Re-Planning Group ${nextGroup.id} (Resuming)`,
            );

            const newPlan = this.resolveDependencies(
              nextGroup.mainGoal.itemId,
              nextGroup.mainGoal.quantity,
              gameState.inventory.items, // Baseline: Current Real Inventory
              true, // generateFullTrace: Keep history of completed items
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

            // If we are starting midway, we might need to fix the startCount logic for the new active step
            // But startFlaggedGoal handles setting startCount if undefined.
          }
          // Old logic removed
        }
      }

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
      this.checkQueue(character);
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
      this.checkQueue(character);
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

  checkGoalProgress(char) {
    const goal = char.activeGoal;
    // Safety check if activeGoal exists but activeGoalGroup doesn't (legacy state or error)
    if (!goal || !char.activeGoalGroup) return;

    // Check if obtained
    // Check if obtained
    const currentCount = gameState.inventory.getCount(goal.targetItem);

    // Fix for "Hang at 0" / Resource Debt
    if (currentCount < goal.startCount) {
      console.log(
        `[GoalManager] Resource Debt. Corrent: ${currentCount}, Start: ${goal.startCount}. Resetting start.`,
      );
      goal.startCount = currentCount;
    }

    const targetTotal = goal.startCount + goal.targetQuantity;
    console.log(
      `[CheckProgress] ${goal.targetItem}: Cur=${currentCount} Start=${goal.startCount} Target=${targetTotal}`,
    );

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
