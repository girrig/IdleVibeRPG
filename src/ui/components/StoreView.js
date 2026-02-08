import { STORE_DEFINITIONS } from "../../core/StoreRegistry";
import { getItemDefinition } from "../../core/ItemRegistry";
import { gameState } from "../../core/GameState";
import { ICONS } from "../../core/Icons";

export class StoreView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.currentStoreId = null;
  }

  render(container) {
    // If no store selected, select first one by default
    if (!this.currentStoreId) {
      const firstId = Object.keys(STORE_DEFINITIONS)[0];
      if (firstId) this.currentStoreId = firstId;
    }

    container.className = "mw-content store-split-layout";
    container.innerHTML = ""; // Clear wrapper

    // Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "store-sidebar-list";

    Object.entries(STORE_DEFINITIONS).forEach(([id, def]) => {
      const item = document.createElement("div");
      item.className = `store-list-item ${id === this.currentStoreId ? "active" : ""}`;
      item.innerHTML = `
        <div class="store-list-icon">${def.icon}</div>
        <div class="store-list-name">${def.name}</div>
      `;

      item.addEventListener("click", () => {
        this.currentStoreId = id;
        this.uiManager.renderMainWindow();
      });

      sidebar.appendChild(item);
    });

    container.appendChild(sidebar);

    // Detail Panel
    const panel = document.createElement("div");
    panel.className = "store-detail-panel";

    if (this.currentStoreId) {
      this.renderStoreContent(panel);
    }

    container.appendChild(panel);
  }

  renderStoreContent(container) {
    const def = STORE_DEFINITIONS[this.currentStoreId];
    if (!def) return;

    // Header
    const header = document.createElement("div");
    header.className = "store-header";
    header.innerHTML = `
        <div class="store-title">
            <h2>${def.name}</h2>
            <span style="color: #aaa; font-size: 14px;">${def.description}</span>
        </div>
        <div class="wallet-display">
            ${gameState.inventory.getCount("coins")} ${ICONS.items.coins}
        </div>
    `;
    container.appendChild(header);

    // Grid
    const grid = document.createElement("div");
    grid.className = "store-items-grid";

    def.items.forEach((item) => {
      const itemDef = getItemDefinition(item.id);
      const card = document.createElement("div");
      card.className = "store-item-card";

      card.innerHTML = `
        <div class="item-info-row">
            <div class="item-icon-lg">${itemDef.icon}</div>
            <div class="item-details">
                <div class="item-name">${itemDef.name}</div>
                <div class="item-price">${item.price} Coins</div>
            </div>
        </div>
        <button class="btn-buy">Buy</button>
      `;

      card.querySelector(".btn-buy").addEventListener("click", () => {
        this.buyItem(item.id, item.price, itemDef.name);
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  buyItem(itemId, price, itemName) {
    if (gameState.inventory.items["coins"] >= price) {
      gameState.inventory.removeItem("coins", price);
      gameState.inventory.addItem(itemId, 1);
      this.uiManager.showNotification(`Bought ${itemName}`, "success");
      this.uiManager.renderMainWindow(); // Refresh to update coin count
    } else {
      this.uiManager.showNotification("Not enough coins!", "error");
    }
  }
}
