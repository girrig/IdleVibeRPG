import { gameState } from "../../core/GameState";
import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";
import { formatNumber } from "../../utils/formatters";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "❓" };
}

export class InventoryView {
  static render(container) {
    container.className = "mw-content inventory-grid";
    container.innerHTML = this.getInventoryHTML();
  }

  static getInventoryHTML() {
    const items = gameState.inventory.items;
    const entries = Object.entries(items)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by quantity desc

    if (entries.length === 0) {
      return '<div class="empty-msg">No items</div>';
    } else {
      return entries
        .map(([id, count]) => {
          const def = getItemDefinition(id);
          const icon = def.icon;

          return `
          <div class="inv-card" title="${def.name}">
            <div class="inv-card-icon">${icon}</div>
            <div class="inv-card-count">${formatNumber(count)}</div>
          </div>
        `;
        })
        .join("");
    }
  }
}
