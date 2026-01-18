export class SaveManager {
  static save(key, data, silent = false) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      if (!silent) console.log(`Saved data to ${key}`);
      return true;
    } catch (e) {
      console.error("Failed to save game:", e);
      return false;
    }
  }

  static load(key) {
    try {
      const serialized = localStorage.getItem(key);
      if (!serialized) return null;
      return JSON.parse(serialized);
    } catch (e) {
      console.error("Failed to load game:", e);
      return null;
    }
  }

  static hasSave(key) {
    return !!localStorage.getItem(key);
  }

  static clear(key) {
    localStorage.removeItem(key);
  }
}
