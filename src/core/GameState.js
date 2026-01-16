import { Character } from "./Character";
import { Inventory } from "./Inventory";
import { getSkillDefinition } from "./SkillRegistry";

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
      this.addCharacter(
        new Character(Date.now(), this.generateRandomName(), "WARRIOR")
      );
      this.addCharacter(
        new Character(Date.now() + 1, this.generateRandomName(), "RANGER")
      );
      // Add 6 more to test 2x4 grid
      for (let i = 0; i < 6; i++) {
        this.addCharacter(
          new Character(
            Date.now() + 2 + i,
            this.generateRandomName(),
            Math.random() > 0.5 ? "WARRIOR" : "RANGER"
          )
        );
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
        const skillDef = getSkillDefinition(char.currentActivity.type);
        if (skillDef) {
          // TODO: Check for time interval, for now 1 tick = 1 action if tickrate matches
          skillDef.action(this, char);
        }
      }
    });
  }
}

export const gameState = new GameState();
