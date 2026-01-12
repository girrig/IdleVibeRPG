import { Character } from "./Character";
import { Inventory } from "./Inventory";

class GameState {
  constructor() {
    this.characters = [];
    this.inventory = new Inventory();
    this.lastTick = Date.now();
    this.tickRate = 1000; // 1 second
    this.listeners = [];
  }

  initialize() {
    // TODO: Load from local storage
    if (this.characters.length === 0) {
      this.addCharacter(new Character(Date.now(), "Hero 1", "WARRIOR"));
    }
  }

  addCharacter(char) {
    this.characters.push(char);
    this.notifyListeners();
  }

  // Basic subscription system for UI updates
  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach((cb) => cb(this));
  }

  tick() {
    const now = Date.now();
    if (now - this.lastTick >= this.tickRate) {
      this.processActivities();
      this.lastTick = now;
      this.notifyListeners();
    }
  }

  processActivities() {
    this.characters.forEach((char) => {
      if (char.currentActivity) {
        if (char.currentActivity.type === "MINING") {
          // Simple logic: 1 resource per tick
          const resource = char.currentActivity.target || "stone";
          this.inventory.addItem(resource, 1);
          // TODO: Add XP
        }
      }
    });
  }
}

export const gameState = new GameState();
