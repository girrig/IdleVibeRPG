import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SKILL_DEFINITIONS, getSkillDefinition } from './SkillRegistry';
import { mapManager } from './MapManager';
import { TERRAIN_TYPES } from './TerrainTypes';

// Mock MapManager
vi.mock('./MapManager', () => ({
  mapManager: {
    getTile: vi.fn(),
    findNearestExploredUnvisitedTile: vi.fn(),
    findNearestUnexploredInAdjacentBiome: vi.fn(),
    findNearestFrontierTile: vi.fn(),
    findNearestUnvisitedWalkableTile: vi.fn(),
    visitTile: vi.fn(),
    exploreRadius: vi.fn(),
    width: 500,
    height: 500
  }
}));

describe('SkillRegistry', () => {
  let mockGameState;
  let mockChar;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGameState = {
      inventory: {
        addItem: vi.fn(),
        removeItem: vi.fn(),
        getCount: vi.fn(() => 100), // Default sufficient funds
      },
      triggerNotification: vi.fn(),
      getAvailableResourceCount: vi.fn(() => 1000), // Sufficient for tests
      consumeAvailableResource: vi.fn(),
      addAvailableResource: vi.fn(),
    };

    mockChar = {
      currentActivity: { target: '' },
      talents: {},
      gainXp: vi.fn(),
      stopActivity: vi.fn(),
      stats: { sightRange: 3 },
      position: { x: 250, y: 250 }
    };
  });

  it('should retrieve skill definitions', () => {
    expect(getSkillDefinition('MINING')).toBeDefined();
    expect(getSkillDefinition('INVALID')).toBeNull();
  });

  describe('MINING', () => {
    it('should mine ore and gain XP', () => {
      mockChar.currentActivity.target = 'copper_ore';
      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('copper_ore', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('mining', 10);
    });

    it('should trigger double ore talent', () => {
      mockChar.currentActivity.target = 'iron_ore';
      mockChar.talents.mining_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // Hit chance

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('iron_ore', 2);
    });
  });

  describe('WOODCUTTING', () => {
    it('should chop logs and gain XP', () => {
      mockChar.currentActivity.target = 'oak_log';
      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('oak_log', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('woodcutting', 10);
    });

    it('should trigger double logs talent', () => {
      mockChar.currentActivity.target = 'willow_log';
      mockChar.talents.woodcutting_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('willow_log', 2);
    });
  });

  describe('FISHING', () => {
    it('should catch fish and gain XP', () => {
      mockChar.currentActivity.target = 'raw_trout';
      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('raw_trout', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('fishing', 10);
    });

    it('should trigger double fish talent', () => {
      mockChar.currentActivity.target = 'raw_salmon';
      mockChar.talents.fishing_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('raw_salmon', 2);
    });
  });

  describe('FIGHTING', () => {
    it('should fight mob, drop loot, and gain XP', () => {
      mockChar.currentActivity.target = 'rat';
      SKILL_DEFINITIONS.FIGHTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('rat_bones', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('fighting', 10);
    });

    it('should trigger double loot talent', () => {
      mockChar.currentActivity.target = 'goblin';
      mockChar.talents.fighting_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      SKILL_DEFINITIONS.FIGHTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('goblin_mail', 2);
    });
  });

  describe('SMITHING', () => {
    it('should smith bar if resources exist', () => {
      mockChar.currentActivity.target = 'copper_bar';
      mockGameState.inventory.getCount.mockReturnValue(10); // Plenty

      SKILL_DEFINITIONS.SMITHING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.removeItem).toHaveBeenCalledWith('copper_ore', 1);
      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('copper_bar', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('smithing', 15);
    });

    it('should fail if not enough resources', () => {
      mockChar.currentActivity.target = 'iron_bar';
      mockGameState.inventory.getCount.mockReturnValue(0); // Broke

      SKILL_DEFINITIONS.SMITHING.action(mockGameState, mockChar);

      expect(mockGameState.triggerNotification).toHaveBeenCalledWith('Not enough resources!', 'error');
      expect(mockChar.stopActivity).toHaveBeenCalled();
      expect(mockGameState.inventory.addItem).not.toHaveBeenCalled();
    });
  });

  describe('EXPLORING', () => {
    it('should initialize activity if missing phase', () => {
      mockChar.currentActivity = { target: 'find_grassland' };
      // Ensure getTile returns something valid so initialization check doesn't crash
      mapManager.getTile.mockReturnValue({ type: 'other_biome' });

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('SEARCHING');
      expect(mockChar.position).toBeDefined(); // Might be reset
    });

    it('should move towards target in SEARCHING phase', () => {
      mockChar.currentActivity = { target: 'find_grassland', phase: 'SEARCHING' };
      mockChar.position = { x: 10, y: 10 };
      // Mock target at 12, 10
      mapManager.findNearestExploredUnvisitedTile.mockReturnValue({ x: 12, y: 10 });
      mapManager.getTile.mockReturnValue({ type: 'other_biome' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      // Should move +1 x
      expect(mockChar.position).toEqual({ x: 11, y: 10 });
    });

    it('should switch to EXPLORING phase when standing on target biome', () => {
      mockChar.currentActivity = { target: 'find_grassland', phase: 'SEARCHING' };
      const grasslandId = TERRAIN_TYPES.TEMPERATE_GRASSLAND.id;

      // Standing on grassland
      mapManager.getTile.mockReturnValue({ type: grasslandId });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('EXPLORING');
    });

    it('should gain XP when tiles revealed', () => {
      mockChar.currentActivity = { target: 'find_grassland', phase: 'EXPLORING' };
      mapManager.exploreRadius.mockReturnValue([{ type: 'grassland' }]);
      // Mock neighbor to avoid crash if it looks for nearestUnexplored
      mapManager.findNearestUnexploredInAdjacentBiome.mockReturnValue(null);

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      expect(mockChar.gainXp).toHaveBeenCalled();
    });

    it('should return home if no targets found', () => {
      mockChar.currentActivity = { target: 'find_grassland', phase: 'EXPLORING' };
      // Ensure we aren't "standing" on a tile that causes issues
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.findNearestExploredUnvisitedTile.mockReturnValue(null);
      mapManager.findNearestUnexploredInAdjacentBiome.mockReturnValue(null);
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
    });

    it('should wander towards frontier in expansion mode', () => {
      mockChar.currentActivity = { target: 'wander_expansion', phase: 'WANDERING' };
      mockChar.position = { x: 250, y: 250 };
      mapManager.findNearestFrontierTile.mockReturnValue({ x: 255, y: 250 });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      expect(mapManager.findNearestFrontierTile).toHaveBeenCalledWith(250, 250);
      // Mock moves +1 towards 255
      expect(mockChar.position).toEqual({ x: 251, y: 250 });
    });

    it('should NOT wander into water when expanding', () => {
      mockChar.currentActivity = { target: 'wander_expansion', phase: 'WANDERING' };
      mockChar.position = { x: 250, y: 250 };

      // Target is actually AT our location, meaning we should look for unknown neighbors
      mapManager.findNearestFrontierTile.mockReturnValue({ x: 250, y: 250 });

      // All neighbors are WATER
      mapManager.getTile.mockImplementation((x, y) => {
        if (x === 250 && y === 250) return { explored: true, type: 'grassland' };
        return { explored: false, type: 'OCEAN' }; // Unexplored Ocean
      });
      // Ensure isValidMove returns false for Ocean (implied by SkillRegistry logic, but we mock dependencies?)
      // Wait, SkillRegistry uses mapManager.getTile.
      // But isValidMove logic is INTERNAL to SkillRegistry action.
      // It calls mapManager.getTile. So our mock above works.

      SKILL_DEFINITIONS.EXPLORING.action(mockGameState, mockChar);

      // Should NOT move
      expect(mockChar.position).toEqual({ x: 250, y: 250 });
    });
  });
});
