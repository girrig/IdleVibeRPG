export class Inventory {
  constructor() {
    this.items = {}; // { 'copper_ore': 10 }
  }

  addItem(itemId, qty = 1) {
    if (!this.items[itemId]) this.items[itemId] = 0;
    this.items[itemId] += qty;
    // console.log(`Added ${qty} ${itemId}. Total: ${this.items[itemId]}`);
  }

  removeItem(itemId, qty = 1) {
    if (!this.items[itemId] || this.items[itemId] < qty) return false;
    this.items[itemId] -= qty;
    return true;
  }

  getCount(itemId) {
    return this.items[itemId] || 0;
  }
}
