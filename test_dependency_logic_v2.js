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

  checkQueue(character) {
    if (character.goalQueue && character.goalQueue.length > 0) {
      const nextGroup = character.goalQueue.shift();

      // DYNAMIC RE-CHECK LOGIC (Using mock methods)
      if (nextGroup.steps && nextGroup.steps.length > 0) {
        if (nextGroup.currentStepIndex === undefined)
          nextGroup.currentStepIndex = 0;
        const currentIdx = nextGroup.currentStepIndex;
        if (currentIdx < nextGroup.steps.length) {
          const step = nextGroup.steps[currentIdx];
          // Uses mock gameState
          const startCnt =
            step.startCount !== undefined
              ? step.startCount
              : gameState.inventory.getCount(step.targetItem);
          const targetTotal = startCnt + step.targetQuantity;
          const currentInv = gameState.inventory.getCount(step.targetItem);
          const remaining = Math.max(0, targetTotal - currentInv);

          if (remaining > 0) {
            const projected = this.getProjectedInventory(character);
            const plan = this.resolveDependencies(
              step.targetItem,
              remaining,
              projected,
            );

            if (
              plan.length > 1 ||
              (plan.length === 1 && plan[0].itemId !== step.targetItem)
            ) {
              const newSteps = plan.map((s) => ({
                targetItem: s.itemId,
                targetQuantity: s.quantity,
                source: s.source,
              }));
              // Replace current step
              nextGroup.steps.splice(currentIdx, 1, ...newSteps);
            }
          }
        }
      }

      character.activeGoalGroup = nextGroup;
      this.startFlaggedGoal(character, nextGroup);
    }
  }

  startFlaggedGoal(character, group) {
    // Mock start
    if (!group || !group.steps) return;
    const step = group.steps[group.currentStepIndex || 0];
    if (step) {
      if (step.startCount === undefined) {
        step.startCount = gameState.inventory.getCount(step.targetItem);
      }
      character.activeGoal = step;
    }
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

// TEST 7: RESUME PROGRESS (Persistence)
console.log("\n=== TEST 7: Resume Progress (Persistence) ===");
gameState.inventory = new Inventory({ copper_ore: 5 });
// Mock a task that was already half done
// Goal: 10 Ore. StartCount: 0. Inv: 5. Done: 5. Remaining: 5.
// If startCount is preserverd (0), targetTotal = 10. Inv=5. Remaining=5.
// We must manually construct the group structure as if it came from the queue
const mineResumeStep = {
  targetItem: "copper_ore",
  targetQuantity: 10,
  source: { type: "GATHERING" },
  status: "EXECUTING",
  startCount: 0, // <--- KEY: Already set
};
const char7 = {
  name: "Tester7",
  goalQueue: [
    {
      mainGoal: { itemId: "copper_ore", quantity: 10 },
      steps: [mineResumeStep],
      currentStepIndex: 0,
    },
  ],
};

console.log("Resuming Mine 10 (Half done)...");
gm.checkQueue(char7);
// We need to inspect the 'step' object inside char7.activeGoalGroup
// Wait, checkQueue MOVES it to activeGoalGroup
const activeStep = char7.activeGoalGroup.steps[0].startCount;
console.log(`Start Count: ${activeStep} (Expected: 0)`);

if (activeStep === 0) {
  console.log("✅ PASSED: startCount persisted.");
} else {
  console.log(`❌ FAILED: startCount reset to ${activeStep} (likely 5)`);
}

// TEST 8: DYNAMIC DEPENDENCY RE-CHECK
console.log("\n=== TEST 8: Dynamic Dependency Re-Check ===");
// Scenario: Started Smith 10. Had 10 Ore. Used 5. Paused. START COUNT = 0.
// Then THREW AWAY remaining 5 ore. Inv = 0.
// Resume. Need 10 total. Have 5 produced? No, this is raw production mock.
// Let's say goal: Get 10 Bars.
// StartCount: 0. Inv: 5 Bars (produced). Target: 10. Remaining: 5.
// Dependency check for 5 Bars -> Needs 5 Ore.
// Inv Ore: 0.
gameState.inventory = new Inventory({ copperBar: 5, copper_ore: 0 });

const smithResumeStep = {
  targetItem: "copperBar",
  targetQuantity: 10,
  source: { type: "SKILL", skillId: "SMITHING", target: "copperBar" },
  status: "EXECUTING",
  startCount: 0,
};

// Queue it
const char8 = {
  name: "Tester8",
  goalQueue: [
    {
      mainGoal: { itemId: "copperBar", quantity: 10 },
      steps: [smithResumeStep],
      currentStepIndex: 0,
    },
  ],
};

console.log("Resuming Smith 10 (5 done, 0 Ore left)...");
gm.checkQueue(char8);
// checkQueue should trigger resolveDependencies for remaining 5 bars.
// 5 Bars cost 5 Ore. Inv Ore is 0.
// Should add "Mine 5 Ore" to the steps.

const newSteps = char8.activeGoalGroup.steps;
console.log(
  "New Steps:",
  newSteps.map((s) => `${s.targetQuantity} ${s.targetItem}`),
);

// Expectation: Mine 5, Smith 5.
// Note: original step "Smith 10" is replaced.
if (newSteps.length > 1 && newSteps[0].targetItem === "copper_ore") {
  console.log("✅ PASSED: Injected mining dependency.");
} else {
  console.log("❌ FAILED: Did not inject dependency.");
}
