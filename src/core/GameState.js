import { Character } from "./Character";
import { Inventory } from "./Inventory";
import { getSkillDefinition } from "./SkillRegistry";
import { SaveManager } from "./SaveManager";
import { goalManager } from "./GoalManager";
import { getItemDefinition } from "./ItemRegistry";

class GameState {
  constructor() {
    this.characters = [];
    this.inventory = new Inventory(
      () => this.notifyListeners(),
      (itemId, qty) => this.handleItemAdded(itemId, qty),
    );
    this.lastTick = Date.now();
    this.tickRate = 1000; // 1 second
    this.autoSaveInterval = 60000; // 60 seconds
    this.autoSaveInterval = 60000; // 60 seconds
    this.nextAutoSaveTime = 0;
    this.settings = {
      autoSave: true,
      notifications: {
        master: true,
        levelUp: true,
        activity: true,
        autoSave: true,
        item: true,
      },
    };
    this.listeners = [];
    this.notificationListeners = [];
  }

  initialize() {
    if (this.loadGame()) {
      console.log("Game loaded from save.");
      this.startAutoSave();
      return;
    }

    // Default initialization if no save
    if (this.characters.length === 0) {
      this.addCharacter(
        new Character(Date.now(), this.generateRandomName(), "WARRIOR"),
      );
    }
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
      this.saveGame();
      this.nextAutoSaveTime = Date.now() + this.autoSaveInterval;
      this.triggerNotification("Game Auto-Saved", "autoSave");
    }, this.autoSaveInterval);
  }

  saveGame() {
    const data = {
      characters: this.characters,
      inventory: this.inventory.items,
      lastTick: this.lastTick,
      settings: this.settings,
    };
    return SaveManager.save(
      "idleVibeRPG_save",
      data,
      !this.settings.notifications,
    );
  }

  loadGame() {
    const data = SaveManager.load("idleVibeRPG_save");
    if (!data) return false;

    // Restore characters
    this.characters = data.characters.map((charData) =>
      Character.fromData(charData),
    );

    // Restore Inventory
    this.inventory.loadData({ items: data.inventory });

    // Restore Global State
    this.lastTick = data.lastTick || Date.now();
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
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    SaveManager.clear("idleVibeRPG_save");
    location.reload();
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
    console.log("Adding Character:", char.name);
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

    // Check specific type switch if exists
    if (
      this.settings.notifications[type] !== undefined &&
      this.settings.notifications[type] === false
    ) {
      return;
    }

    this.notificationListeners.forEach((cb) => cb(message, type));
  }

  handleItemAdded(itemId, qty) {
    const def = getItemDefinition(itemId);
    const name = def ? def.name : itemId;
    const icon = def ? def.icon : "";
    // Only show +1 if qty is 1, etc.
    const sign = qty > 0 ? "+" : ""; // though usually we only add positive amounts here
    this.triggerNotification(`${sign}${qty} ${name} ${icon}`, "item");
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
          const lastTime = char.currentActivity.lastActionTime || 0; // fallback
          if (now - lastTime >= skillDef.interval) {
            skillDef.action(this, char);
            char.currentActivity.lastActionTime = now;
          }
        }
      }
    });

    // Update Goals
    goalManager.update(this);
  }
}

export const gameState = new GameState();
