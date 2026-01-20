const SKILL_DEFINITIONS = {
  SMITHING: {
    options: {
      copperBar: {
        cost: { copper_ore: 1 },
      },
    },
  },
};

const sourceRegistry = {
  getSource: (itemId) => {
    if (itemId === "copperBar")
      return { type: "SKILL", skillId: "SMITHING", target: "copperBar" };
    if (itemId === "copper_ore")
      return { type: "GATHERING", skillId: "MINING", target: "copper_ore" }; // Mock
    return null;
  },
};

class Inventory {
  constructor(initial = {}) {
    this.items = { ...initial };
  }
  getCount(id) {
    return this.items[id] || 0;
  }
}

// MOCK GAME STATE
let gameState = {
  inventory: new Inventory(),
};

class GoalManager {
  getProjectedInventory(character) {
    const inventory = { ...gameState.inventory.items };

    let allSteps = [];
    if (character.activeGoal) allSteps.push(character.activeGoal);
    if (character.goalQueue) {
      character.goalQueue.forEach((g) => {
        if (g.steps) allSteps = allSteps.concat(g.steps);
        else allSteps.push(g);
      });
    }

    allSteps.forEach((step) => {
      let quantityToProduce = step.targetQuantity;

      // CONSERVATIVE UPDATE: Only count gains if active
      // STRICT UPDATE: No gains ever.
      // const isActive = step === character.activeGoal;
      // if (isActive) {
      //   inventory[step.targetItem] =
      //     (inventory[step.targetItem] || 0) + quantityToProduce;
      // }

      if (step.source && step.source.type === "SKILL") {
        const skillDef = SKILL_DEFINITIONS[step.source.skillId];
        if (skillDef) {
          const cost = skillDef.options[step.source.target].cost;
          if (cost) {
            Object.entries(cost).forEach(([ingId, costPerUnit]) => {
              const totalCost = costPerUnit * quantityToProduce;
              // CLAMP AT ZERO
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
    const simInventory = baseInventory
      ? { ...baseInventory }
      : { ...gameState.inventory.items };
    const getSimCount = (id) => simInventory[id] || 0;
    const adjustSimCount = (id, delta) => {
      simInventory[id] = (simInventory[id] || 0) + delta;
    };

    const addRequirement = (reqItem, reqQty, checkInventory = true) => {
      const current = getSimCount(reqItem);
      let missing = reqQty;
      if (checkInventory) {
        if (current >= reqQty) {
          adjustSimCount(reqItem, -reqQty);
          return;
        }
        // Clamp calculation? No, here we need exactly what we are missing
        // But if current < 0 (which shouldn't happen with clamped input), we'd need more.
        missing = reqQty - Math.max(0, current);
      }

      const source = sourceRegistry.getSource(reqItem);
      if (!source) return;

      let cost = null;
      if (source.type === "SKILL") {
        const skillDef = SKILL_DEFINITIONS[source.skillId];
        if (skillDef) cost = skillDef.options[source.target].cost;
      }

      if (cost) {
        Object.entries(cost).forEach(([ingId, ingPerUnit]) => {
          addRequirement(ingId, ingPerUnit * missing, true);
        });
      }

      plan.push({ itemId: reqItem, quantity: missing, source: source });
      adjustSimCount(reqItem, missing);
      adjustSimCount(reqItem, -reqQty);
    };

    addRequirement(itemId, quantity, false);
    return plan;
  }

  setGoal(character, itemId, quantity) {
    const projected = this.getProjectedInventory(character);
    const plan = this.resolveDependencies(itemId, quantity, projected);

    const goalGroup = {
      mainGoal: { itemId, quantity },
      steps: plan.map((s) => ({
        targetItem: s.itemId,
        targetQuantity: s.quantity,
        source: s.source,
      })),
    };

    if (!character.goalQueue) character.goalQueue = [];
    character.goalQueue.push(goalGroup);
    return goalGroup;
  }
}

const gm = new GoalManager();

// TEST 4: EXPONENTIAL GROWTH CHECK
console.log("\n=== TEST 4: 'Getting Bigger' Bug Check ===");
gameState.inventory = new Inventory({ copper_ore: 0 });
const char4 = { goalQueue: [] };

console.log("Queue Smith 10 (1st):");
const t1 = gm.setGoal(char4, "copperBar", 10);
console.log(
  "Plan 1 (Expect Mine 10):",
  t1.steps.map((s) => `${s.targetQuantity} ${s.targetItem}`),
);

console.log("Queue Smith 10 (2nd):");
const t2 = gm.setGoal(char4, "copperBar", 10);
console.log(
  "Plan 2 (Expect Mine 10):",
  t2.steps.map((s) => `${s.targetQuantity} ${s.targetItem}`),
);

console.log("Queue Smith 10 (3rd):");
const t3 = gm.setGoal(char4, "copperBar", 10);
console.log(
  "Plan 3 (Expect Mine 10):",
  t3.steps.map((s) => `${s.targetQuantity} ${s.targetItem}`),
);

if (t2.steps[0].targetQuantity === 10 && t3.steps[0].targetQuantity === 10) {
  console.log("\n✅ PASSED: Dependencies remained linear (10 per task).");
} else {
  console.log("\n❌ FAILED: Dependencies grew (Bug present).");
}
// TEST 6: ACTIVE TASK INTERFERENCE
console.log("\n=== TEST 6: Active Mine 10 vs Queue Smith 10 ===");
gameState.inventory = new Inventory({ copper_ore: 0 });
const char6 = { goalQueue: [] };

console.log("Set Active: Mine 10");
// Mock Active Group/Goal
const mineStep = {
  targetItem: "copper_ore",
  targetQuantity: 10,
  source: { type: "GATHERING" },
  status: "EXECUTING",
};
char6.activeGoal = mineStep;
char6.activeGoalGroup = {
  steps: [mineStep],
  currentStepIndex: 0,
  mainGoal: { itemId: "copper_ore", quantity: 10 },
};

console.log("Queue Smith 10:");
const t6 = gm.setGoal(char6, "copperBar", 10);
// EXPECT (User Logic): Mine 10 Dependency (Ignore Active Gain).
// CURRENT (Suspected): No Dependency (Count Active Gain).
console.log(
  "Plan 6:",
  t6.steps.map((s) => `${s.targetQuantity} ${s.targetItem}`),
);

if (t6.steps.length === 2 && t6.steps[0].targetItem === "copper_ore") {
  console.log("\n✅ PASSED: Added redundant mining (Strict Conservative).");
} else {
  console.log("\n❌ FAILED: Missed mining dependency (Active Gain Counted).");
}
