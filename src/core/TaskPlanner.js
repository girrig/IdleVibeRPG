import { sourceRegistry } from "./SourceRegistry";
import { SKILL_DEFINITIONS } from "./SkillRegistry";

export class TaskPlanner {
  constructor() {}

  /**
   * Calculates the projected inventory for a character based on their queue.
   * @param {object} character - The character object.
   * @param {object} currentInventory - The current game inventory items.
   * @returns {object} The projected inventory items.
   */
  getProjectedInventory(character, currentInventory) {
    const inventory = { ...currentInventory };

    // Helper to adjust inventory
    const consume = (id, amount) => {
      inventory[id] = Math.max(0, (inventory[id] || 0) - amount);
    };

    // Identify all PENDING or EXECUTING tasks
    let allSteps = [];

    // 1. Active Group
    if (character.activeGoalGroup) {
      const group = character.activeGoalGroup;
      for (let i = group.currentStepIndex; i < group.steps.length; i++) {
        allSteps.push(group.steps[i]);
      }
    } else if (character.activeGoal) {
      allSteps.push(character.activeGoal);
    }

    // 2. Queued Groups
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

      // Handle active step partial completion
      if (
        step.status === "EXECUTING" &&
        step === character.activeGoal &&
        step.startCount !== undefined
      ) {
        // We need check against ACTUAL current inventory here, but we only have 'inventory' which is being mutated.
        // However, startCount logic relies on the static startCount from the step.
        // We should pass in the live inventory getter or just use the passed inventory if it's fresh.
        // For projection, we assume 'inventory' starts as current.
        const currentCount = inventory[step.targetItem] || 0; // Approx
        const targetTotal = step.startCount + step.targetQuantity;
        const remaining = Math.max(0, targetTotal - currentCount);
        quantityToProduce = remaining;
      }

      // We DO NOT add outputs to projected inventory (Conservative Mode)

      // Calculate Inputs/Costs
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
              consume(ingId, totalCost);
            });
          }
        }
      }
    });

    return inventory;
  }

  /**
   * Generates a list of steps to achieve a goal.
   * @param {string} itemId - The target item ID.
   * @param {number} quantity - The target quantity.
   * @param {object} baseInventory - The inventory state to plan against.
   * @param {boolean} generateFullTrace - If true, includes completed steps.
   * @param {boolean} forceComplete - If true, marks everything as completed (trace only).
   * @returns {Array} List of steps.
   */
  resolveDependencies(
    itemId,
    quantity,
    baseInventory,
    generateFullTrace = false,
    forceComplete = false,
    character = null,
  ) {
    const plan = [];
    // Simulation inventory to track what we "will have" after each step
    const simInventory = { ...baseInventory };

    const getSimCount = (id) => simInventory[id] || 0;
    const adjustSimCount = (id, delta) => {
      simInventory[id] = (simInventory[id] || 0) + delta;
    };

    const addRequirement = (
      reqItem,
      reqQty,
      checkInventory = true,
      forceComp = false,
    ) => {
      const current = getSimCount(reqItem);
      let missing = reqQty;
      let status = "PENDING";

      if (forceComp) {
        status = "COMPLETED";
      } else if (checkInventory) {
        if (current >= reqQty) {
          adjustSimCount(reqItem, -reqQty);
          if (generateFullTrace) {
            status = "COMPLETED";
            forceComp = true;
          } else {
            return;
          }
        } else {
          missing = reqQty - current;
        }
      } else {
        // Root item checkInventory=false
      }

      const source = sourceRegistry.getSource(reqItem);
      if (!source) {
        console.warn(`No source found for dependency ${reqItem}`);
        return;
      }

      // Skill Level Check
      if (character && source.type === "SKILL") {
        const charSkill = character.skills[source.skillId.toLowerCase()];
        if (charSkill && charSkill.level < source.reqLevel) {
          throw new Error(
            `Level ${source.reqLevel} ${source.skillId} required`,
          );
        }
      }

      // Dependencies
      let cost = null;
      const skillDef = SKILL_DEFINITIONS[source.skillId];
      if (skillDef && skillDef.options && skillDef.options[source.target]) {
        cost = skillDef.options[source.target].cost;
      }

      if (cost) {
        Object.entries(cost).forEach(([ingId, ingPerUnit]) => {
          const quantityBase = status === "COMPLETED" ? reqQty : missing;
          const totalIngNeeded = ingPerUnit * quantityBase;
          addRequirement(ingId, totalIngNeeded, true, forceComp);
        });
      }

      plan.push({
        itemId: reqItem,
        quantity: reqQty,
        source: source,
        status: status,
      });

      if (status !== "COMPLETED") {
        adjustSimCount(reqItem, missing);
        adjustSimCount(reqItem, -reqQty);
      }
    };

    addRequirement(itemId, quantity, false, forceComplete);
    return plan;
  }
}

export const taskPlanner = new TaskPlanner();
