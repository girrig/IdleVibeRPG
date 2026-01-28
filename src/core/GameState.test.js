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

      expect(listener).not.toHaveBeenCalled();
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
