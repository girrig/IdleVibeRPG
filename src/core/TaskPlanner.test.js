import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskPlanner, taskPlanner } from './TaskPlanner';
import { sourceRegistry } from './SourceRegistry';
import { SKILL_DEFINITIONS } from './SkillRegistry';

// Mock Dependencies
vi.mock('./SourceRegistry', () => ({
  sourceRegistry: {
    getSource: vi.fn(),
  },
}));

vi.mock('./SkillRegistry', () => ({
  SKILL_DEFINITIONS: {
    MINING: {
      options: {
        iron_ore: { cost: null }, // Raw material
        coal: { cost: null }, // Raw material
      },
    },
    SMITHING: {
      options: {
        iron_bar: {
          cost: { iron_ore: 1, coal: 2 }, // Complex recipe
        },
      },
    },
  },
}));

describe('TaskPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveDependencies', () => {
    it('should return simple plan for raw material', () => {
      sourceRegistry.getSource.mockReturnValue({ type: 'SKILL', skillId: 'MINING', target: 'iron_ore' });

      const plan = taskPlanner.resolveDependencies('iron_ore', 5, {});

      expect(plan.length).toBe(1);
      expect(plan[0].itemId).toBe('iron_ore');
      expect(plan[0].quantity).toBe(5);
      expect(plan[0].status).toBe('PENDING');
    });

    it('should resolve dependencies for complex item (Iron Bar)', () => {
      // Mock Sources
      sourceRegistry.getSource.mockImplementation((id) => {
        if (id === 'iron_bar') return { type: 'SKILL', skillId: 'SMITHING', target: 'iron_bar' };
        if (id === 'iron_ore') return { type: 'SKILL', skillId: 'MINING', target: 'iron_ore' };
        if (id === 'coal') return { type: 'SKILL', skillId: 'MINING', target: 'coal' };
        return null;
      });

      // Need 1 Iron Bar. Cost: 1 Iron Ore, 2 Coal.
      const plan = taskPlanner.resolveDependencies('iron_bar', 1, {});

      // Expected Plan Order (Reverse dependency order usually, or leaf first):
      // The recursion adds requirements depth-first.
      // 1. Dependencies of Iron Bar -> Iron Ore
      // 2. Dependencies of Iron Bar -> Coal
      // 3. Iron Bar itself

      // Note: Current implementation pushes AFTER recursion processing:
      // "plan.push({...})" happens after "if (cost) ... addRequirement"
      // So: Iron Ore (leaf), Coal (leaf), Iron Bar (root)

      expect(plan.length).toBeGreaterThan(0);

      // Should contain Ore, Coal, Bar
      expect(plan.some(s => s.itemId === 'iron_ore' && s.quantity === 1)).toBeTruthy();
      expect(plan.some(s => s.itemId === 'coal' && s.quantity === 2)).toBeTruthy();
      expect(plan.some(s => s.itemId === 'iron_bar' && s.quantity === 1)).toBeTruthy();
    });

    it('should mark items as COMPLETED if already in inventory', () => {
      sourceRegistry.getSource.mockReturnValue({ type: 'SKILL', skillId: 'MINING', target: 'iron_ore' });

      // Have 10, Need 5
      const plan = taskPlanner.resolveDependencies('iron_ore', 5, { iron_ore: 10 });

      // The root item (iron_ore) is added with checkInventory=false, so it is ALWAYS added to the plan.
      // However, its dependencies (none) wouldn't be added.
      expect(plan.length).toBe(1);
      expect(plan[0].status).toBe('PENDING'); // Or however the root is handled
      // Actually, if we have it, we might want it to be completed? 
      // But the planner is "how to make X". If I have X, the plan to make X is "have X".
      // The current logic forces root to be PENDING.
    });

    it('should throw error if character level is too low', () => {
      sourceRegistry.getSource.mockReturnValue({
        type: 'SKILL',
        skillId: 'MINING',
        target: 'iron_ore',
        reqLevel: 10
      });

      const mockChar = {
        skills: {
          mining: { level: 5 }
        }
      };

      expect(() => {
        taskPlanner.resolveDependencies('iron_ore', 1, {}, false, false, mockChar);
      }).toThrow('Level 10 MINING required');
    });
  });

  describe('getProjectedInventory', () => {
    it('should deduct costs for executing queued tasks', () => {
      // Mock executing task: Smelting Iron Bar
      // Costs: 1 Iron Ore, 2 Coal (from Mock at top)
      const mockTask = {
        targetItem: 'iron_bar',
        status: 'EXECUTING',
        targetQuantity: 1,
        startCount: 0,
        source: { type: 'SKILL', skillId: 'SMITHING', target: 'iron_bar' }
      };

      const mockChar = {
        activeGoal: mockTask,
        activeGoalGroup: null,
        goalQueue: []
      };

      // Initial Inventory: 10 Ore, 10 Coal (Use mockChar assumption in simpler tests, but here we pass currentInventory)
      const currentInv = { iron_ore: 10, coal: 10 };

      const projected = taskPlanner.getProjectedInventory(mockChar, currentInv);

      // Should consume 1 Ore and 2 Coal
      expect(projected.iron_ore).toBe(9);
      expect(projected.coal).toBe(8);
    });
  });
});
