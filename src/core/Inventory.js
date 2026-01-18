export class Inventory {
  constructor(onUpdate, onItemAdded) {
    this.items = {}; // { 'copper_ore': 10 }
    this.onUpdate = onUpdate;
    this.onItemAdded = onItemAdded;
  }

  addItem(itemId, qty = 1) {
    if (!this.items[itemId]) this.items[itemId] = 0;
    this.items[itemId] += qty;
    if (this.onUpdate) this.onUpdate();
    if (this.onItemAdded) this.onItemAdded(itemId, qty);
    // console.log(`Added ${qty} ${itemId}. Total: ${this.items[itemId]}`);
  }

  loadData(data) {
    if (data && data.items) {
      this.items = { ...data.items };
      if (this.onUpdate) this.onUpdate();
    }
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
