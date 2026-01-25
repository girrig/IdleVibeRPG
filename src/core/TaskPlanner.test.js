import { describe, it, expect, beforeEach } from "vitest";
import { taskPlanner } from "./TaskPlanner";
import { sourceRegistry } from "./SourceRegistry";

describe("TaskPlanner", () => {
  // Basic Mock Data if needed, but we rely on actual registries for now
  // since they are static data.

  it("should resolve a simple gathering task", () => {
    // Mining Copper Ore is a direct task (no dependencies)
    // Copper Ore (ID: copper_ore) -> Source: Mining

    const plan = taskPlanner.resolveDependencies("copper_ore", 5, {});

    expect(plan).toHaveLength(1);
    expect(plan[0].itemId).toBe("copper_ore");
    expect(plan[0].quantity).toBe(5);
    expect(plan[0].status).toBe("PENDING");
  });

  it("should resolve a crafting task with dependencies", () => {
    // Copper Bar needs 1 Copper Ore
    // We want 1 Copper Bar.
    // Expect: 1. Copper Ore (1), 2. Copper Bar (1)

    const plan = taskPlanner.resolveDependencies("copper_bar", 1, {});

    expect(plan).toHaveLength(2);

    const oreStep = plan.find((s) => s.itemId === "copper_ore");
    const barStep = plan.find((s) => s.itemId === "copper_bar");

    expect(oreStep).toBeDefined();
    expect(barStep).toBeDefined();

    expect(oreStep.quantity).toBe(1);
    expect(barStep.quantity).toBe(1);
  });

  it("should account for existing inventory", () => {
    // Want 1 Copper Bar (needs 1 Ore).
    // Have 1 Copper Ore already.
    // Expect: Copper Ore step skipped (or marked complete/not present in plan depending on logic)

    // The current logic in resolveDependencies CHECKS inventory.
    // If we have it, it adjusts sim count but does NOT push to plan unless generateFullTrace is true.
    // So we expect only the Copper Bar step.

    const inventory = { copper_ore: 1 };
    const plan = taskPlanner.resolveDependencies("copper_bar", 1, inventory);

    expect(plan).toHaveLength(1);
    expect(plan[0].itemId).toBe("copper_bar");
  });

  it("should generate full trace when requested", () => {
    const inventory = { copper_ore: 10 };
    // We have plenty of ore.
    // Request trace mode.
    // Expect: Copper Ore (Completed), Copper Bar (Pending)

    const plan = taskPlanner.resolveDependencies(
      "copper_bar",
      1,
      inventory,
      true,
    );

    expect(plan).toHaveLength(2);
    const oreStep = plan.find((s) => s.itemId === "copper_ore");
    expect(oreStep.status).toBe("COMPLETED");
  });

  // NEW TEST CASE
  it("should fail if character does not meet skill requirements", () => {
    // Mock Character with low level
    const mockChar = {
      skills: {
        mining: { level: 1 },
      },
    };

    expect(() => {
      taskPlanner.resolveDependencies("coal", 1, {}, false, false, mockChar);
    }).toThrow(/Level 10 MINING required/);
  });

  it("should show TOTAL requirement even if partial inventory exists", () => {
    // Want 10 Copper Bars. Cost: 10 Ore.
    // Have 5 Copper Ore.
    // Expect: Copper Ore step with quantity 10 (Total), but Status PENDING (since we need 5 more).

    // Note: In resolveDependencies, if checkInventory is true and current < reqQty,
    // it subtracts current from simInventory but adds the FULL reqQty to the plan object.

    const inventory = { copper_ore: 5 };
    const plan = taskPlanner.resolveDependencies("copper_bar", 10, inventory); // 10 Bars needs 10 Ore

    const oreStep = plan.find((s) => s.itemId === "copper_ore");
    expect(oreStep).toBeDefined();
    expect(oreStep.quantity).toBe(10); // NOT 5 (Missing), but 10 (Total)
    expect(oreStep.status).toBe("PENDING");
  });
});
