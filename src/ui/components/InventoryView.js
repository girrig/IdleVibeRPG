import { gameState } from "../../core/GameState";
import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";
import { formatNumber } from "../../utils/formatters";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "❓" };
}

export class InventoryView {
  static instance = null; // Singleton pattern if needed, but we used class instances elsewhere

  constructor() {
    this.selectedItemId = null;
    this.container = null;
  }

  // Static compatibility wrapper if needed for other calls, but we should refactor usages.
  // Actually, UIManager expects static .render for InventoryView currently.
  // We will change UIManager to use an instance, but to support the Equipment view using static methods
  // we might need to keep some helpers. For now, I'll redesign this class to work as an instance.

  static render(container) {
    // Legacy support or direct call from elsewhere? UIManager was calling this static method.
    // I will add a temporary bridge or just replace usages in UIManager.
    // But since I plan to edit UIManager, I can change how it's called.
    // However, EquipmentView also calls InventoryView.getInventoryHTML()
    // so I should keep that static helper.
    console.warn("InventoryView.render called statically. This is deprecated.");
  }

  // The instance render method
  render(container) {
    this.container = container;
    container.className = "mw-content inventory-split-layout";
    container.innerHTML = "";

    // Main Grid Area
    const mainArea = document.createElement("div");
    mainArea.className = "inventory-main";

    // Header? Maybe not needed for inventory

    // Grid Container
    const grid = document.createElement("div");
    grid.className = "inventory-grid";
    this.renderGrid(grid);
    mainArea.appendChild(grid);

    container.appendChild(mainArea);

    // Detail Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "inventory-detail-sidebar";
    this.renderSidebar(sidebar);

    container.appendChild(sidebar);
  }

  renderGrid(grid) {
    const items = gameState.inventory.items;
    const entries = Object.entries(items)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      grid.innerHTML = '<div class="empty-msg">No items</div>';
      return;
    }

    entries.forEach(([id, count]) => {
      const def = getItemDefinition(id);
      const card = document.createElement("div");
      card.className = `inv-card ${this.selectedItemId === id ? "selected" : ""}`;
      card.innerHTML = `
             <div class="inv-card-icon">${def.icon}</div>
             <div class="inv-card-name">${def.name}</div>
             <div class="inv-card-count">${formatNumber(count)}</div>
         `;

      card.addEventListener("click", () => {
        this.selectedItemId = id;
        this.render(this.container); // Re-render full view to update selection/sidebar
      });

      grid.appendChild(card);
    });
  }

  renderSidebar(sidebar) {
    if (
      !this.selectedItemId ||
      !gameState.inventory.getCount(this.selectedItemId)
    ) {
      sidebar.innerHTML = `
            <div style="color: #666; font-style: italic; text-align: center; margin-top: 50%;">
                Select an item to view details
            </div>
          `;
      return;
    }

    const count = gameState.inventory.getCount(this.selectedItemId);
    const def = getItemDefinition(this.selectedItemId);

    sidebar.innerHTML = `
        <div class="inv-detail-header">
            <div class="inv-detail-icon">${def.icon}</div>
            <div class="inv-detail-name">${def.name}</div>
        </div>
        
        <div class="inv-detail-stats">
            <div class="inv-detail-stat-row">
                <span>Quantity</span>
                <span style="color:white; font-weight:bold;">${formatNumber(count)}</span>
            </div>
            <!-- Future: Value, Weight, etc. -->
            <div class="inv-detail-stat-row" style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px;">
                <span>Value (Est.)</span>
                <span style="color:#fbbf24;">1 💰</span>
            </div>
        </div>
        
        <div style="margin-top: auto;">
            <!-- Actions could go here -->
        </div>
      `;
  }

  // Static helper kept for EquipmentView usage
  static getInventoryHTML() {
    // This is used by EquipmentView to show a simple grid.
    // We can keep the logic simple here.
    const items = gameState.inventory.items;
    const entries = Object.entries(items)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return '<div class="empty-msg">No items</div>';
    } else {
      return entries
        .map(([id, count]) => {
          const def = getItemDefinition(id);
          return `
          <div class="inv-card" title="${def.name}">
            <div class="inv-card-icon">${def.icon}</div>
            <div class="inv-card-count">${formatNumber(count)}</div>
          </div>
        `;
        })
        .join("");
    }
  }
}
