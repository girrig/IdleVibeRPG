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
    findNearestExploredResourceTile: vi.fn(),
    findNearestAdjacentResourceTile: vi.fn(),
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
      addDiscovery: vi.fn(),
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
    it('should initialize to TRAVELING phase on first tick', () => {
      mockChar.currentActivity = { target: 'mine_minerals' };
      mapManager.findNearestExploredResourceTile.mockReturnValue(
        { x: 255, y: 250, nodeType: 'mineral_node', biome: 'ALPINE' }
      );
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
      expect(mockChar.currentActivity.targetTile).toBeDefined();
      expect(mockChar.currentActivity.targetTile.x).toBe(255);
    });

    it('should move toward target during TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'mine_minerals',
        phase: 'TRAVELING',
        targetTile: { x: 255, y: 250, nodeType: 'mineral_node', biome: 'ALPINE' }
      };
      mockChar.position = { x: 252, y: 250 };
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.position.x).toBe(253);
    });

    it('should mine and transition to RETURNING on arrival', () => {
      mockChar.currentActivity = {
        target: 'mine_minerals',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'mineral_node', biome: 'ALPINE' }
      };
      mockChar.position = { x: 250, y: 250 };
      const mockTile = {
        type: 'ALPINE',
        resource: { type: 'mineral_node' }
      };
      mapManager.getTile.mockReturnValue(mockTile);

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
      expect(mockGameState.inventory.addItem).toHaveBeenCalled();
      expect(mockGameState.consumeAvailableResource).toHaveBeenCalledWith('mineral_node:ALPINE', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('mining', 15);
      expect(mockTile.resource).toBeNull();
    });

    it('should wait if no ore found (not stop)', () => {
      mockChar.currentActivity = { target: 'mine_minerals', phase: 'TRAVELING' };
      mockChar.position = { x: 250, y: 250 };
      mapManager.findNearestExploredResourceTile.mockReturnValue(null);

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.stopActivity).not.toHaveBeenCalled();
      expect(mockChar.currentActivity.waitingForResources).toBe(true);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining('No ore'),
        'error'
      );

      // Second tick should NOT re-notify
      mockGameState.triggerNotification.mockClear();
      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);
      expect(mockGameState.triggerNotification).not.toHaveBeenCalled();
    });

    it('should return home and loop to TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'mine_minerals',
        phase: 'RETURNING',
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
    });

    it('should trigger double ore talent', () => {
      mockChar.currentActivity = {
        target: 'mine_minerals',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'mineral_node', biome: 'ALPINE' }
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.talents.mining_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      mapManager.getTile.mockReturnValue({
        type: 'ALPINE',
        resource: { type: 'mineral_node' }
      });

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith(expect.anything(), 2);
    });

    it('should fully stop when returning with stopping flag', () => {
      mockChar.currentActivity = {
        target: 'mine_minerals',
        phase: 'RETURNING',
        stopping: true,
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activityQueue = [];

      SKILL_DEFINITIONS.MINING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity).toBeNull();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith('Returned home safely.', 'success');
    });
  });

  describe('WOODCUTTING', () => {
    it('should initialize to TRAVELING phase on first tick', () => {
      mockChar.currentActivity = { target: 'chop_wood' };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      mapManager.findNearestExploredResourceTile.mockReturnValue(
        { x: 255, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      );
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
      expect(mockChar.currentActivity.targetTile).toBeDefined();
      expect(mockChar.currentActivity.targetTile.x).toBe(255);
    });

    it('should move toward target tree during TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'TRAVELING',
        targetTile: { x: 255, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      };
      mockChar.position = { x: 252, y: 250 };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.position.x).toBe(253);
      expect(mockChar.position.y).toBe(250);
    });

    it('should chop and transition to RETURNING on arrival', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      const mockTile = {
        type: 'TEMPERATE_DECIDUOUS_FOREST',
        resource: { type: 'tree_node' }
      };
      mapManager.getTile.mockReturnValue(mockTile);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('maple_log', 1);
      expect(mockGameState.consumeAvailableResource).toHaveBeenCalledWith('tree_node:TEMPERATE_DECIDUOUS_FOREST', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('woodcutting', 20);
      expect(mockTile.resource).toBeNull(); // Resource removed from tile
    });

    it('should wait if no trees found (not stop)', () => {
      mockChar.currentActivity = { target: 'chop_wood', phase: 'TRAVELING' };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      mockChar.position = { x: 250, y: 250 };
      mapManager.findNearestExploredResourceTile.mockReturnValue(null);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.stopActivity).not.toHaveBeenCalled();
      expect(mockChar.currentActivity.waitingForResources).toBe(true);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining('No trees found'),
        'error'
      );
    });

    it('should return home and loop to TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'RETURNING',
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activeGoal = { targetItem: 'maple_log' };

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
    });

    it('should re-search if tree depleted on arrival', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      mapManager.getTile.mockReturnValue({ type: 'TEMPERATE_DECIDUOUS_FOREST' }); // No resource

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.targetTile).toBeNull();
      expect(mockGameState.inventory.addItem).not.toHaveBeenCalled();
    });

    it('should reveal fog of war while traveling', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'TRAVELING',
        targetTile: { x: 255, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      };
      mockChar.position = { x: 252, y: 250 };
      mockChar.activeGoal = { targetItem: 'maple_log' };
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([
        { type: 'grassland', resource: { type: 'tree_node' } }
      ]);

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mapManager.exploreRadius).toHaveBeenCalled();
      expect(mapManager.visitTile).toHaveBeenCalled();
      expect(mockGameState.addAvailableResource).toHaveBeenCalled();
      expect(mockGameState.addDiscovery).toHaveBeenCalledWith('node:tree_node');
    });

    it('should fully stop when returning with stopping flag', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'RETURNING',
        stopping: true,
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activityQueue = [];

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity).toBeNull();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith('Returned home safely.', 'success');
    });

    it('should apply double drop talent', () => {
      mockChar.currentActivity = {
        target: 'chop_wood',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'tree_node', biome: 'TEMPERATE_DECIDUOUS_FOREST' }
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activeGoal = { targetItem: 'oak_log' };
      mockChar.talents.woodcutting_2 = true;
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.1
      mapManager.getTile.mockReturnValue({
        type: 'TEMPERATE_DECIDUOUS_FOREST',
        resource: { type: 'tree_node' }
      });

      SKILL_DEFINITIONS.WOODCUTTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('oak_log', 2);
    });
  });

  describe('FISHING', () => {
    it('should initialize to TRAVELING phase on first tick', () => {
      mockChar.currentActivity = { target: 'fish_spot' };
      mapManager.findNearestAdjacentResourceTile.mockReturnValue(
        { x: 255, y: 250, resourceX: 256, resourceY: 250, nodeType: 'fishing_spot', biome: 'OCEAN' }
      );
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
      expect(mockChar.currentActivity.targetTile).toBeDefined();
      expect(mockChar.currentActivity.targetTile.resourceX).toBe(256);
    });

    it('should fish from shore and transition to RETURNING on arrival', () => {
      mockChar.currentActivity = {
        target: 'fish_spot',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, resourceX: 251, resourceY: 250, nodeType: 'fishing_spot', biome: 'OCEAN' }
      };
      mockChar.position = { x: 250, y: 250 };
      const oceanTile = {
        type: 'OCEAN',
        resource: { type: 'fishing_spot' }
      };
      mapManager.getTile.mockImplementation((tx, ty) => {
        if (tx === 251 && ty === 250) return oceanTile;
        return { type: 'BEACH' };
      });

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
      expect(mockGameState.inventory.addItem).toHaveBeenCalled();
      expect(mockGameState.consumeAvailableResource).toHaveBeenCalledWith('fishing_spot:OCEAN', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('fishing', 15);
      expect(oceanTile.resource).toBeNull();
    });

    it('should wait if no fishing spots found (not stop)', () => {
      mockChar.currentActivity = { target: 'fish_spot', phase: 'TRAVELING' };
      mockChar.position = { x: 250, y: 250 };
      mapManager.findNearestAdjacentResourceTile.mockReturnValue(null);

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockChar.stopActivity).not.toHaveBeenCalled();
      expect(mockChar.currentActivity.waitingForResources).toBe(true);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining('No fishing spots'),
        'error'
      );
    });

    it('should return home and loop to TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'fish_spot',
        phase: 'RETURNING',
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
    });

    it('should fully stop when returning with stopping flag', () => {
      mockChar.currentActivity = {
        target: 'fish_spot',
        phase: 'RETURNING',
        stopping: true,
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activityQueue = [];

      SKILL_DEFINITIONS.FISHING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity).toBeNull();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith('Returned home safely.', 'success');
    });
  });

  describe('FIGHTING', () => {
    it('should fight mob, drop loot from table, and gain XP', () => {
      mockChar.currentActivity.target = 'rat';
      // random=0 picks first item in table (rat_bones, weight 80)
      vi.spyOn(Math, 'random').mockReturnValue(0);

      SKILL_DEFINITIONS.FIGHTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('rat_bones', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('fighting', 10);
    });

    it('should roll weighted loot from drop table', () => {
      mockChar.currentActivity.target = 'rat';
      // Rat drops: rat_bones (weight 80), coins (weight 20). Total = 100.
      // random=0.9 => roll=90, which exceeds rat_bones (80), falls to coins
      vi.spyOn(Math, 'random').mockReturnValue(0.9);

      SKILL_DEFINITIONS.FIGHTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('coins', 1);
    });

    it('should trigger double loot talent', () => {
      mockChar.currentActivity.target = 'goblin';
      mockChar.talents.fighting_2 = true;
      // First random call: loot roll (0.05 => picks first drop: goblin_mail)
      // Second random call: double loot check (0.05 < 0.1 => triggers)
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      SKILL_DEFINITIONS.FIGHTING.action(mockGameState, mockChar);

      expect(mockGameState.inventory.addItem).toHaveBeenCalledWith('goblin_mail', 2);
    });

    it('should have drops arrays on all monsters', () => {
      const options = SKILL_DEFINITIONS.FIGHTING.options;
      Object.entries(options).forEach(([key, opt]) => {
        expect(opt.drops, `${key} should have drops array`).toBeDefined();
        expect(Array.isArray(opt.drops)).toBe(true);
        expect(opt.drops.length).toBeGreaterThan(0);
        opt.drops.forEach((entry) => {
          expect(entry).toHaveProperty('item');
          expect(entry).toHaveProperty('weight');
          expect(entry.weight).toBeGreaterThan(0);
        });
      });
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

  describe('FORAGING', () => {
    it('should initialize to TRAVELING phase on first tick', () => {
      mockChar.currentActivity = { target: 'forage_bush' };
      mapManager.findNearestExploredResourceTile.mockReturnValue(
        { x: 255, y: 250, nodeType: 'bush_node', biome: 'SHRUBLAND' }
      );
      mapManager.getTile.mockReturnValue({ type: 'grassland' });
      mapManager.exploreRadius.mockReturnValue([]);

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
      expect(mockChar.currentActivity.targetTile).toBeDefined();
      expect(mockChar.currentActivity.targetTile.x).toBe(255);
    });

    it('should gather bush and transition to RETURNING on arrival', () => {
      mockChar.currentActivity = {
        target: 'forage_bush',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'bush_node', biome: 'SHRUBLAND' }
      };
      mockChar.position = { x: 250, y: 250 };
      const mockTile = {
        type: 'SHRUBLAND',
        resource: { type: 'bush_node' }
      };
      mapManager.getTile.mockReturnValue(mockTile);

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
      expect(mockGameState.inventory.addItem).toHaveBeenCalled();
      expect(mockGameState.consumeAvailableResource).toHaveBeenCalledWith('bush_node:SHRUBLAND', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('foraging', 10);
      expect(mockTile.resource).toBeNull();
    });

    it('should gather fungi and gain correct XP', () => {
      mockChar.currentActivity = {
        target: 'forage_fungi',
        phase: 'TRAVELING',
        targetTile: { x: 250, y: 250, nodeType: 'fungi_node', biome: 'SWAMP' }
      };
      mockChar.position = { x: 250, y: 250 };
      const mockTile = {
        type: 'SWAMP',
        resource: { type: 'fungi_node' }
      };
      mapManager.getTile.mockReturnValue(mockTile);

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('RETURNING');
      expect(mockGameState.consumeAvailableResource).toHaveBeenCalledWith('fungi_node:SWAMP', 1);
      expect(mockChar.gainXp).toHaveBeenCalledWith('foraging', 15);
    });

    it('should wait if no bushes found (not stop)', () => {
      mockChar.currentActivity = { target: 'forage_bush', phase: 'TRAVELING' };
      mockChar.position = { x: 250, y: 250 };
      mapManager.findNearestExploredResourceTile.mockReturnValue(null);

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.stopActivity).not.toHaveBeenCalled();
      expect(mockChar.currentActivity.waitingForResources).toBe(true);
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith(
        expect.stringContaining('No bushes found'),
        'error'
      );
    });

    it('should return home and loop to TRAVELING', () => {
      mockChar.currentActivity = {
        target: 'forage_bush',
        phase: 'RETURNING',
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity.phase).toBe('TRAVELING');
    });

    it('should fully stop when returning with stopping flag', () => {
      mockChar.currentActivity = {
        target: 'forage_bush',
        phase: 'RETURNING',
        stopping: true,
        targetTile: null
      };
      mockChar.position = { x: 250, y: 250 };
      mockChar.activityQueue = [];

      SKILL_DEFINITIONS.FORAGING.action(mockGameState, mockChar);

      expect(mockChar.currentActivity).toBeNull();
      expect(mockGameState.triggerNotification).toHaveBeenCalledWith('Returned home safely.', 'success');
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
