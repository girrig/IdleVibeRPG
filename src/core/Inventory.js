export class Inventory {
  constructor(onUpdate) {
    this.items = {}; // { 'copper_ore': 10 }
    this.onUpdate = onUpdate;
  }

  addItem(itemId, qty = 1) {
    if (!this.items[itemId]) this.items[itemId] = 0;
    this.items[itemId] += qty;
    if (this.onUpdate) this.onUpdate();
    // console.log(`Added ${qty} ${itemId}. Total: ${this.items[itemId]}`);
  }

  removeItem(itemId, qty = 1) {
    if (!this.items[itemId] || this.items[itemId] < qty) return false;
    this.items[itemId] -= qty;
    if (this.onUpdate) this.onUpdate();
    return true;
  }

  getCount(itemId) {
    return this.items[itemId] || 0;
  }
}
