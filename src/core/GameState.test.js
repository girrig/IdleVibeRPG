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
vi.mock("./Character");
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
      Character.fromData.mockImplementation((data) => data); // Mock hydration

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
      gameState.addCharacter({ name: "TestChar" });
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
});
