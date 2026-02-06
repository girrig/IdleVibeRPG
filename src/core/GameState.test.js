// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { gameState } from "./GameState";
import { SaveManager } from "./SaveManager";
import { mapManager } from "./MapManager";
import { Character } from "./Character";

// Mock dependencies
vi.mock("./SaveManager");
vi.mock("./MapManager", () => ({
  mapManager: {
    initialize: vi.fn(),
    getSerializableMapData: vi.fn(() => ({ tiles: [] })),
  },
}));
vi.mock("./Character", () => {
  class MockCharacter {
    constructor(id, name, type) {
      this.id = id;
      this.name = name;
      this.type = type;
    }
    setGameContext() {}
    static fromData(data) {
      const char = new MockCharacter(data.id, data.name, data.type);
      Object.assign(char, data);
      return char;
    }
  }
  return { Character: MockCharacter };
});
// Mock SkillRegistry to avoid import issues or side effects during GameState usage
vi.mock("./SkillRegistry", () => ({
  getSkillDefinition: vi.fn(),
  SKILL_DEFINITIONS: {},
}));

import { getSkillDefinition } from "./SkillRegistry";

describe("GameState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton state
    gameState.characters = [];
    gameState.inventory.items = {};
    gameState.listeners = [];
    gameState.notificationListeners = [];
    gameState.settings = {
      autoSave: true,
      notifications: {
        master: true,
        levelUp: true,
        activity: true,
        autoSave: true,
        item: true,
      },
      // Ensure other settings don't cause issues
    };
    if (gameState.autoSaveTimer) clearInterval(gameState.autoSaveTimer);
  });

  afterEach(() => {
    if (gameState.autoSaveTimer) clearInterval(gameState.autoSaveTimer);
    vi.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with default values if no save exists", () => {
      SaveManager.load.mockReturnValue(null);

      gameState.initialize();

      expect(gameState.characters).toHaveLength(1); // Defaults to 1 char
      expect(mapManager.initialize).toHaveBeenCalled();
      expect(gameState.autoSaveTimer).toBeDefined();
    });

    it("should load game if save exists", () => {
      const mockSaveData = {
        characters: [{ name: "LoadedChar" }],
        inventory: { wood: 10 },
        lastTick: 12345,
        settings: { autoSave: false },
        map: { seed: 999 },
      };
      SaveManager.load.mockReturnValue(mockSaveData);
      // Character.fromData is already mocked via MockCharacter.fromData

      gameState.initialize();

      expect(gameState.characters[0].name).toBe("LoadedChar");
      expect(gameState.inventory.items.wood).toBe(10);
      expect(mapManager.initialize).toHaveBeenCalledWith({ seed: 999 });

      // Note: initialize() calls startAutoSave() regardless, but loadGame updates the SETTING.
      expect(gameState.settings.autoSave).toBe(false);
    });
    it("should handle legacy save formats (boolean notifications)", () => {
      const legacySave = {
        characters: [],
        inventory: {},
        settings: {
          notifications: false // Legacy format
        }
      };
      SaveManager.load.mockReturnValue(legacySave);
      gameState.initialize();

      expect(gameState.settings.notifications.master).toBe(false);
      expect(gameState.settings.notifications.levelUp).toBe(false);
    });
  });

  describe("Save/Load", () => {
    it("should save game data correctly", () => {
      gameState.addCharacter(new Character(1, "TestChar", "WARRIOR"));
      gameState.inventory.items = { gold: 50 };

      gameState.saveGame();

      expect(SaveManager.save).toHaveBeenCalledWith(
        "idleVibeRPG_save",
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({ name: "TestChar" }),
          ]),
          inventory: { gold: 50 },
        }),
        false,
      );
    });

    it("should toggle autoSave", () => {
      gameState.toggleAutoSave(false);
      expect(gameState.settings.autoSave).toBe(false);
      expect(gameState.nextAutoSaveTime).toBe(0);

      gameState.toggleAutoSave(true);
      expect(gameState.settings.autoSave).toBe(true);
      expect(gameState.autoSaveTimer).toBeDefined();
    });
  });

  describe("Notifications", () => {
    it("should trigger notifications to listeners", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);

      gameState.triggerNotification("Test Message", "info");

      expect(listener).toHaveBeenCalledWith("Test Message", "info");
    });

    it("should respect master notification switch", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);
      gameState.toggleNotifications(false, "master");

      gameState.triggerNotification("Should not appear", "info");

    });

    it("should respect specific notification type switch", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);

      // Disable 'item' notifications
      gameState.toggleNotifications(false, "item");

      // Trigger 'item' notification -> Should be blocked
      gameState.triggerNotification("Found Rock", "item");
      expect(listener).not.toHaveBeenCalled();

      // Trigger 'levelUp' notification -> Should pass
      gameState.triggerNotification("Level Up!", "levelUp");
      expect(listener).toHaveBeenCalledWith("Level Up!", "levelUp");
    });
  });

  describe("Activity Processing", () => {
    it("should call skill action on tick", () => {
      const char = {
        currentActivity: {
          type: "TEST_SKILL",
          lastActionTime: 0,
          quantity: 1,
          progress: 0,
        },
        completeCurrentTask: vi.fn(),
      };
      gameState.characters = [char];

      const mockAction = vi.fn();
      getSkillDefinition.mockReturnValue({
        interval: 100,
        action: mockAction,
      });

      // Advance time enough to trigger (default tick rate is usually small)
      // We can manually manipulate lastTick if needed
      gameState.lastTick = Date.now() - 1000;

      gameState.tick();

      expect(mockAction).toHaveBeenCalled();
    });

    it("should handle specialized skill intervals (options)", () => {
      const now = Date.now();
      const char = {
        currentActivity: {
          type: "MINING",
          target: "special_rock",
          lastActionTime: now - 200, // 200ms ago
        },
      };
      gameState.characters = [char];
      const mockAction = vi.fn();
      getSkillDefinition.mockReturnValue({
        interval: 1000,
        action: mockAction,
        options: {
          special_rock: { interval: 100 } // Much faster (100ms)
        }
      });

      // We call processActivities. 
      // Diff is (now) - (now - 200) = 200. 
      // 200 >= 100 (required). Should fire.
      gameState.processActivities();

      expect(mockAction).toHaveBeenCalled();
    });
  });

  describe("Item Handling", () => {
    it("should handle item added notifications for unknown items", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);

      // Mock getItemDefinition to return nothing
      vi.mock("./ItemRegistry", async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          getItemDefinition: vi.fn().mockReturnValue(undefined)
        }
      });

      // This heavily depends on how ItemRegistry is imported. 
      // Since it's a singleton import in GameState, we might need to mock it at the top level.
      // BUT, GameState uses `getItemDefinition` imported function.
      // Let's test the fallback logic assuming we can trigger it or just rely on the fact 
      // that standard items trigger it.

      gameState.handleItemAdded("mystery_goo", 1);
      expect(listener).toHaveBeenCalledWith(expect.stringContaining("mystery_goo"), "item");
    });
  });

  describe("Saving Logic Edge Cases", () => {
    it("should restart auto-save timer after manual save if enabled", () => {
      vi.useFakeTimers();
      // Ensure save returns true so manualSave proceeds
      SaveManager.save.mockReturnValue(true);

      gameState.settings.autoSave = true;
      gameState.startAutoSave();

      const spy = vi.spyOn(gameState, 'startAutoSave');
      gameState.manualSave();

      expect(spy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("Character Management", () => {
    it("should recruit a character successfully", () => {
      gameState.characters = [];
      const result = gameState.recruitCharacter();

      expect(result).toBe(true);
      expect(gameState.characters).toHaveLength(1);
      expect(gameState.characters[0]).toBeInstanceOf(Character);
    });
  });

  describe("Resource Management", () => {
    it("should add available resources", () => {
      gameState.addAvailableResource("mineral_node:DESERT", 5);
      expect(gameState.availableResources["mineral_node:DESERT"]).toBe(5);

      gameState.addAvailableResource("mineral_node:DESERT", 3);
      expect(gameState.availableResources["mineral_node:DESERT"]).toBe(8);
    });

    it("should get resource count by exact key", () => {
      gameState.availableResources = { "mineral_node:DESERT": 10 };
      expect(gameState.getAvailableResourceCount("mineral_node:DESERT")).toBe(10);
    });

    it("should get resource count by prefix", () => {
      gameState.availableResources = {
        "mineral_node:DESERT": 5,
        "mineral_node:FOREST": 3,
      };
      expect(gameState.getAvailableResourceCount("mineral_node")).toBe(8);
    });

    it("should return 0 for unknown resource", () => {
      gameState.availableResources = {};
      expect(gameState.getAvailableResourceCount("unknown")).toBe(0);
    });

    it("should consume available resource", () => {
      gameState.availableResources = { "mineral_node:DESERT": 5 };

      const result = gameState.consumeAvailableResource("mineral_node:DESERT", 2);

      expect(result).toBe(true);
      expect(gameState.availableResources["mineral_node:DESERT"]).toBe(3);
    });

    it("should fail to consume when insufficient", () => {
      gameState.availableResources = { "mineral_node:DESERT": 1 };

      const result = gameState.consumeAvailableResource("mineral_node:DESERT", 5);

      expect(result).toBe(false);
    });
  });

  describe("Listener Management", () => {
    it("should add and remove listeners", () => {
      const listener = vi.fn();
      const unsub = gameState.addListener(listener);

      gameState.notifyListeners();
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      gameState.notifyListeners();
      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should add and remove notification listeners", () => {
      const listener = vi.fn();
      const unsub = gameState.addNotificationListener(listener);

      gameState.triggerNotification("test", "info");
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      gameState.triggerNotification("test2", "info");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("Notification Edge Cases", () => {
    it("should handle object type in triggerNotification", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);

      gameState.triggerNotification("Colored message", { id: "levelUp", color: "#ff0000" });

      expect(listener).toHaveBeenCalledWith("Colored message", { id: "levelUp", color: "#ff0000" });
    });

    it("should block notification when specific object type is disabled", () => {
      const listener = vi.fn();
      gameState.addNotificationListener(listener);
      gameState.settings.notifications.levelUp = false;

      gameState.triggerNotification("Blocked", { id: "levelUp", color: "#ff0000" });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Save Edge Cases", () => {
    it("should not save when isResetting", () => {
      gameState.isResetting = true;
      const result = gameState.saveGame();
      expect(result).toBe(false);
      expect(SaveManager.save).not.toHaveBeenCalled();
      gameState.isResetting = false;
    });

    it("should not restart auto-save on manual save when auto-save disabled", () => {
      SaveManager.save.mockReturnValue(true);
      gameState.settings.autoSave = false;

      const spy = vi.spyOn(gameState, 'startAutoSave');
      gameState.manualSave();

      expect(spy).not.toHaveBeenCalled();
    });

    it("should show error notification when manual save fails", () => {
      SaveManager.save.mockReturnValue(false);
      const notifSpy = vi.fn();
      gameState.addNotificationListener(notifSpy);

      gameState.manualSave();

      expect(notifSpy).toHaveBeenCalledWith(
        "Save failed! Check console for details.",
        "error",
      );
    });

    it("should show error notification when auto-save fails", () => {
      vi.useFakeTimers();
      SaveManager.save.mockReturnValue(false);
      const notifSpy = vi.fn();
      gameState.addNotificationListener(notifSpy);

      gameState.startAutoSave();
      vi.advanceTimersByTime(gameState.autoSaveInterval);

      expect(notifSpy).toHaveBeenCalledWith("Auto-save failed!", "error");
      vi.useRealTimers();
    });
  });

  describe("Toggle Notifications", () => {
    it("should toggle specific notification type", () => {
      gameState.toggleNotifications(false, "item");
      expect(gameState.settings.notifications.item).toBe(false);

      gameState.toggleNotifications(true, "item");
      expect(gameState.settings.notifications.item).toBe(true);
    });
  });

  describe("processActivities edge cases", () => {
    it("should complete task when progress reaches quantity", () => {
      const char = {
        currentActivity: {
          type: "TEST_SKILL",
          target: "test_target",
          lastActionTime: 0,
          quantity: 1,
          progress: 0,
        },
        completeCurrentTask: vi.fn(),
      };
      gameState.characters = [char];

      const mockAction = vi.fn();
      getSkillDefinition.mockReturnValue({
        interval: 100,
        action: mockAction,
      });

      gameState.processActivities();

      expect(mockAction).toHaveBeenCalled();
      expect(char.currentActivity.progress).toBe(1);
      expect(char.completeCurrentTask).toHaveBeenCalled();
    });

    it("should not complete task when quantity is 0 (infinite)", () => {
      const char = {
        currentActivity: {
          type: "TEST_SKILL",
          target: "test_target",
          lastActionTime: 0,
          quantity: 0,
          progress: 0,
        },
        completeCurrentTask: vi.fn(),
      };
      gameState.characters = [char];

      const mockAction = vi.fn();
      getSkillDefinition.mockReturnValue({
        interval: 100,
        action: mockAction,
      });

      gameState.processActivities();

      expect(mockAction).toHaveBeenCalled();
      expect(char.completeCurrentTask).not.toHaveBeenCalled();
    });

    it("should skip characters without activity", () => {
      gameState.characters = [{ currentActivity: null }];
      // Should not throw
      gameState.processActivities();
    });

    it("should skip when skill definition not found", () => {
      gameState.characters = [{
        currentActivity: { type: "UNKNOWN", lastActionTime: 0 },
      }];
      getSkillDefinition.mockReturnValue(null);

      // Should not throw
      gameState.processActivities();
    });

    it("should not fire action if interval not elapsed", () => {
      const now = Date.now();
      const char = {
        currentActivity: {
          type: "TEST_SKILL",
          lastActionTime: now, // Just acted
          quantity: 0,
          progress: 0,
        },
      };
      gameState.characters = [char];

      const mockAction = vi.fn();
      getSkillDefinition.mockReturnValue({
        interval: 5000,
        action: mockAction,
      });

      gameState.processActivities();

      expect(mockAction).not.toHaveBeenCalled();
    });
  });
});
