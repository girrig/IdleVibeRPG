export class Character {
  constructor(id, name, type = "WARRIOR") {
    this.id = id;
    this.name = name;
    this.type = type;
    this.stats = {
      level: 1,
      xp: 0,
      strength: 10,
      dexterity: 10,
      intelligence: 10,
    };
    this.skills = {
      mining: { level: 1, xp: 0 },
      fighting: { level: 1, xp: 0 },
    };
    this.currentActivity = null; // e.g. { type: 'MINING', target: 'copper_ore', startTime: 12345 }
  }

  startActivity(type, target) {
    this.currentActivity = {
      type,
      target,
      startTime: Date.now(),
    };
    console.log(`${this.name} started ${type} on ${target}`);
  }

  stopActivity() {
    this.currentActivity = null;
    console.log(`${this.name} stopped activity`);
  }
}
