import { Character } from "./Character";
import { Inventory } from "./Inventory";
import { getSkillDefinition } from "./SkillRegistry";
import { SaveManager } from "./SaveManager";
import { goalManager } from "./GoalManager";
import { getItemDefinition } from "./ItemRegistry";
import { mapManager } from "./MapManager";

import { GAME_CONFIG } from "./Constants";

class GameState {
  constructor() {
    this.characters = [];
    this.inventory = new Inventory(
      () => this.notifyListeners(),
      (itemId, qty) => this.handleItemAdded(itemId, qty),
    );
    this.lastTick = Date.now();
    this.tickRate = GAME_CONFIG.TICK_RATE;
    this.autoSaveInterval = GAME_CONFIG.AUTOSAVE_INTERVAL;
    this.nextAutoSaveTime = 0;
    this.settings = {
      autoSave: true,
      notifications: {
        master: GAME_CONFIG.NOTIFICATIONS.MASTER,
        levelUp: GAME_CONFIG.NOTIFICATIONS.LEVEL_UP,
        activity: GAME_CONFIG.NOTIFICATIONS.ACTIVITY,
        autoSave: GAME_CONFIG.NOTIFICATIONS.AUTOSAVE,
        item: GAME_CONFIG.NOTIFICATIONS.ITEM,
      },
    };
    this.listeners = [];
    this.notificationListeners = [];
    this.isResetting = false;

    // Listen for storage changes to handle multi-tab resets
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "idleVibeRPG_save" && e.newValue === null) {
          this.isResetting = true; // Prevent saving during reload
          location.reload();
        }
      });
    }

    this.availableResources = {}; // Tracks visible resource node count on map (1 per tile)
    this.discoveries = new Set(); // Tracks codex entries discovered by the player
  }

  initialize() {
    if (this.loadGame()) {
      this.startAutoSave();
      return;
    }

    // Default initialization if no save
    if (this.characters.length === 0) {
      this.addCharacter(
        new Character(Date.now(), this.generateRandomName(), "WARRIOR"),
      );
      // Give some starting money
    }

    // Initialize map (creates new if needed)
    mapManager.initialize();

    this.startAutoSave();
  }

  recruitCharacter() {
    // Basic recruitment logic
    // Todo: Check resources. For now, free or placeholder cost.
    const cost = 100; // Placeholder: 100 Wood?
    // Let's make it free for first pass to ensure UI works, or checks wood.
    // if (this.inventory.getCount('wood') < cost) return false;
    // this.inventory.removeItem('wood', cost);

    const newChar = new Character(
      Date.now(),
      this.generateRandomName(),
      Math.random() > 0.5 ? "WARRIOR" : "RANGER",
    );
    this.addCharacter(newChar);
    return true;
  }

  startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.nextAutoSaveTime = Date.now() + this.autoSaveInterval;
    this.autoSaveTimer = setInterval(() => {
      const success = this.saveGame();
      this.nextAutoSaveTime = Date.now() + this.autoSaveInterval;
      if (success) {
        this.triggerNotification("Game Auto-Saved", "autoSave");
      } else {
        this.triggerNotification("Auto-save failed!", "error");
      }
    }, this.autoSaveInterval);
  }

  saveGame() {
    if (this.isResetting) return false;

    const data = {
      characters: this.characters,
      inventory: this.inventory.items,
      lastTick: this.lastTick,
      settings: this.settings,
      map: mapManager.getSerializableMapData(),
      availableResources: this.availableResources,
      discoveries: Array.from(this.discoveries),
    };
    return SaveManager.save(
      "idleVibeRPG_save",
      data,
      !this.settings.notifications,
    );
  }

  manualSave() {
    const success = this.saveGame();
    if (success) {
      if (this.settings.autoSave) {
        this.startAutoSave(); // Resets timer
      }
      this.triggerNotification("Game Saved Manually", "success");
    } else {
      this.triggerNotification("Save failed! Check console for details.", "error");
    }
  }

  loadGame() {
    const data = SaveManager.load("idleVibeRPG_save");
    if (!data) return false;

    // Restore characters
    this.characters = data.characters.map((charData) => {
      const char = Character.fromData(charData);
      char.setGameContext(this);
      return char;
    });

    // Restore Inventory
    this.inventory.loadData({ items: data.inventory });

    // Restore Global State
    this.lastTick = data.lastTick || Date.now();

    // Restore Map
    mapManager.initialize(data.map);

    // RECALCULATE RESOURCES based on the restored map
    // This ensures compatibility with generation changes and "What you see is what you have"
    this.recalculateResources();

    // Restore discoveries, backfill from map/inventory for old saves
    this.discoveries = new Set(data.discoveries || []);
    this.backfillDiscoveries();

    if (data.settings) {
      // Deep merge settings to ensure new keys exist
      this.settings = {
        ...this.settings,
        ...data.settings,
        notifications: {
          ...this.settings.notifications,
          ...(data.settings.notifications || {}),
        },
      };

      // Legacy support: if notifications was boolean
      if (typeof data.settings.notifications === "boolean") {
        const val = data.settings.notifications;
        this.settings.notifications = {
          master: val,
          levelUp: val,
          activity: val,
          autoSave: val,
          item: val,
        };
      }
    }

    this.notifyListeners();
    return true;
  }

  resetGame() {
    this.isResetting = true;
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);

    // 1. Clear Storage
    SaveManager.clear("idleVibeRPG_save");

    // 2. Clear Internal State immediately for checking visual feedback
    this.characters = [];
    this.inventory.items = {};
    this.availableResources = {};
    this.discoveries = new Set();

    // 3. Update UI to show empty state
    this.notifyListeners();

    // 4. Show Notification
    this.triggerNotification("Game Reset! Reloading...", "success");

    // 5. Reload after a short delay
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  recalculateResources() {
    this.availableResources = {};
    const width = mapManager.width;
    const height = mapManager.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = mapManager.getTile(x, y);
        if (tile && tile.explored && tile.resource) {
          // Count 1 per visible node tile, keyed by "resource_id:biome_id"
          const key = `${tile.resource.type}:${tile.type}`;
          this.addAvailableResource(key, 1);
        }
      }
    }
  }

  generateRandomName() {
    const prefixes = [
      "Grom",
      "Thar",
      "El",
      "Zor",
      "Grim",
      "Bork",
      "Sky",
      "Star",
      "Iron",
      "Shadow",
    ];
    const suffixes = [
      "gard",
      "ion",
      "us",
      "ak",
      "dor",
      "th",
      "light",
      "walker",
      "blade",
      "heart",
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return prefix + suffix;
  }

  addCharacter(char) {
    char.setGameContext(this);
    this.characters.push(char);
    this.notifyListeners();
  }

  // Basic subscription system for UI updates
  addListener(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  addNotificationListener(callback) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(
        (cb) => cb !== callback,
      );
    };
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this));
  }

  triggerNotification(message, type = "info") {
    // Check master switch
    if (!this.settings.notifications.master) return;

    // Resolve the type key (string) from type object or direct string
    const typeKey = type && typeof type === "object" ? type.id : type;

    // Check specific type switch if exists
    if (
      this.settings.notifications[typeKey] !== undefined &&
      this.settings.notifications[typeKey] === false
    ) {
      return;
    }

    this.notificationListeners.forEach((cb) => cb(message, type));
  }

  handleItemAdded(itemId, qty) {
    this.addDiscovery(`item:${itemId}`);
    const def = getItemDefinition(itemId);
    const name = def ? def.name : itemId;
    const icon = def ? def.icon : "";
    // Only show +1 if qty is 1, etc.
    const sign = qty > 0 ? "+" : ""; // though usually we only add positive amounts here
    this.triggerNotification(`${sign}${qty} ${name} ${icon}`, "item");
  }

  // --- Discovery Tracking ---

  addDiscovery(key) {
    this.discoveries.add(key);
  }

  backfillDiscoveries() {
    // Backfill biomes and nodes from explored map tiles
    const width = mapManager.width;
    const height = mapManager.height;
    if (width && height) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tile = mapManager.getTile(x, y);
          if (tile && tile.explored) {
            this.discoveries.add(`biome:${tile.type}`);
            if (tile.resource) {
              this.discoveries.add(`node:${tile.resource.type}`);
            }
          }
        }
      }
    }

    // Backfill items from inventory
    Object.entries(this.inventory.items).forEach(([itemId, qty]) => {
      if (qty > 0) {
        this.discoveries.add(`item:${itemId}`);
      }
    });
  }

  // --- World Resource Management ---

  addAvailableResource(resourceId, amount) {
    if (!this.availableResources[resourceId]) {
      this.availableResources[resourceId] = 0;
    }
    this.availableResources[resourceId] += amount;
    // Optional: Notify on big discoveries?
  }

  getAvailableResourceCount(resourceId) {
    if (this.availableResources[resourceId]) {
      return this.availableResources[resourceId];
    }
    // Check for prefix matches (e.g. "mineral_node" matches "mineral_node:DESERT")
    const prefix = resourceId + ":";
    let sum = 0;
    Object.keys(this.availableResources).forEach((key) => {
      if (key.startsWith(prefix)) {
        sum += this.availableResources[key];
      }
    });
    return sum;
  }

  consumeAvailableResource(resourceId, amount = 1) {
    if (this.getAvailableResourceCount(resourceId) >= amount) {
      this.availableResources[resourceId] -= amount;
      return true;
    }
    return false;
  }

  tick() {
    const now = Date.now();
    if (now - this.lastTick >= this.tickRate) {
      this.processActivities();
      this.lastTick = now;
      this.notifyListeners();
    }
  }

  toggleAutoSave(enabled) {
    this.settings.autoSave = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
      this.nextAutoSaveTime = 0;
    }
    this.saveGame(); // Save preference immediately
  }

  toggleNotifications(enabled, type = "master") {
    if (type === "master") {
      this.settings.notifications.master = enabled;
    } else {
      this.settings.notifications[type] = enabled;
    }
    this.saveGame();
  }

  processActivities() {
    this.characters.forEach((char) => {
      if (char.currentActivity) {
        const skillDef = getSkillDefinition(char.currentActivity.type);
        if (skillDef) {
          const now = Date.now();
          const lastTime = char.currentActivity.lastActionTime || 0;

          // Determine interval: Option-specific > Skill Default > Hard fallback
          let interval =
            skillDef.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL;

          if (skillDef.options && char.currentActivity.target) {
            const option = skillDef.options[char.currentActivity.target];
            if (option && option.interval) {
              interval = option.interval;
            }
          }

          // Build robustness: Ensure lastActionTime exists
          if (now - lastTime >= interval) {
            skillDef.action(this, char);

            // Activity may have been cleared by the action (e.g. stopActivity)
            if (!char.currentActivity) return;

            char.currentActivity.lastActionTime = now;

            // Task Queue Logic
            if (char.currentActivity.quantity > 0) {
              char.currentActivity.progress++;
              // console.log(`Progress: ${char.currentActivity.progress}/${char.currentActivity.quantity}`);
              if (
                char.currentActivity.progress >= char.currentActivity.quantity
              ) {
                char.completeCurrentTask();
              }
            }
          }
        }
      }
    });

    // Update Goals
    goalManager.update(this);
  }
}

export const gameState = new GameState();
window.gameState = gameState;
