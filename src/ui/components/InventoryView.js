import { gameState } from "../../core/GameState";
import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";
import { ICONS } from "../../core/Icons";
import { formatNumber } from "../../utils/formatters";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: ICONS.misc.locked };
}

export class InventoryView {
  constructor() {
    this.selectedItemId = null;
    this.container = null;
  }

  /**
   * Called every tick by UIManager.
   * If not rendered, it builds the DOM.
   * If rendered, it updates the values.
   */
  render(container) {
    const isInitialized =
      container.classList.contains("inventory-split-layout") &&
      container.querySelector(".inventory-grid");

    if (!isInitialized) {
      this.fullRender(container);
    } else {
      // Ensure we are updating the right container
      this.container = container;
      this.update();
    }
  }

  fullRender(container) {
    this.container = container;
    container.className = "mw-content inventory-split-layout";
    container.innerHTML = "";

    // Main Grid Area
    const mainArea = document.createElement("div");
    mainArea.className = "inventory-main";
    const grid = document.createElement("div");
    grid.className = "inventory-grid";
    mainArea.appendChild(grid);
    container.appendChild(mainArea);

    // Detail Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "inventory-detail-sidebar";
    container.appendChild(sidebar);

    this.update();
  }

  update() {
    if (!this.container) return;
    const grid = this.container.querySelector(".inventory-grid");
    const sidebar = this.container.querySelector(".inventory-detail-sidebar");

    if (grid) this.updateGrid(grid);
    if (sidebar) this.updateSidebar(sidebar);
  }

  updateGrid(grid) {
    const items = gameState.inventory.items;
    const entries = Object.entries(items)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]); // Sort by count desc

    if (entries.length === 0) {
      grid.innerHTML = '<div class="empty-msg">No items</div>';
      return;
    }

    // Remove empty message if it exists and we have items
    const emptyMsg = grid.querySelector(".empty-msg");
    if (emptyMsg) emptyMsg.remove();

    // Map existing cards for reconciliation
    const existingCards = Array.from(grid.children);
    const existingMap = new Map();
    existingCards.forEach((el) => {
      if (el.dataset.id) existingMap.set(el.dataset.id, el);
    });

    // 1. Remove obsolete cards
    existingCards.forEach((card) => {
      const id = card.dataset.id;
      if (!items[id] || items[id] <= 0) {
        card.remove();
      }
    });

    // 2. Add or Update cards
    entries.forEach(([id, count], index) => {
      let card = existingMap.get(id);
      const def = getItemDefinition(id);
      const isSelected = this.selectedItemId === id;

      if (!card) {
        // Create new card
        card = document.createElement("div");
        card.className = "inv-card";
        card.dataset.id = id;
        card.addEventListener("click", () => {
          this.selectedItemId = this.selectedItemId === id ? null : id;
          this.update();
        });
        // We append initially, but sort loop below handles position
        grid.appendChild(card);
      }

      // 3. Ensure Order (DOM Reordering)
      // The current element at this index should be our card
      const currentAtIndex = grid.children[index];
      if (currentAtIndex !== card) {
        grid.insertBefore(card, currentAtIndex);
      }

      // 4. Update Classes
      if (isSelected && !card.classList.contains("selected")) {
        card.classList.add("selected");
      } else if (!isSelected && card.classList.contains("selected")) {
        card.classList.remove("selected");
      }

      // 5. Update Content
      // Construct HTML
      const newHtml = `
             <div class="inv-card-icon">${def.icon}</div>
             <div class="inv-card-name">${def.name}</div>
             <div class="inv-card-count">${formatNumber(count)}</div>
         `;

      // Only write innerHTML if it changed to avoid parsing cost and potential blinking
      // (Though browsers are fast, comparing string is safer)
      // Normalizing whitespace might be needed if formatting differs, but usually consistent string templates match.
      if (card.innerHTML !== newHtml) {
        card.innerHTML = newHtml;
      }
    });
  }

  updateSidebar(sidebar) {
    if (
      !this.selectedItemId ||
      !gameState.inventory.getCount(this.selectedItemId)
    ) {
      const emptyHtml = `
            <div style="color: #666; font-style: italic; text-align: center; margin-top: 50%;">
                Select an item to view details
            </div>
          `;
      // Simple check to avoid constant repaint
      if (!sidebar.innerHTML.includes("Select an item")) {
        sidebar.innerHTML = emptyHtml;
      }
      return;
    }

    const count = gameState.inventory.getCount(this.selectedItemId);
    const def = getItemDefinition(this.selectedItemId);

    // For sidebar, we can probably just overwrite since it's simple static data
    // typically. But let's build string.
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
                <span>Value</span>
                <span style="color:#fbbf24;">${def.value || 1} ${ICONS.items.coins}</span>
            </div>
        </div>
        
        <div style="margin-top: auto; display: flex; flex-direction: column; gap: 10px;">
            ${
              this.selectedItemId !== "coins"
                ? `
            <button class="btn-sell-one" style="
                background: #f87171; 
                border: 1px solid #dc2626; 
                color: white; 
                padding: 8px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-weight: bold;
                transition: background 0.2s;
            ">Sell 1 for ${def.value || 1} ${ICONS.items.coins}</button>
            `
                : ""
            }
        </div>
      `;

    // Bind Actions
    if (this.selectedItemId !== "coins") {
      const sellBtn = sidebar.querySelector(".btn-sell-one");
      if (sellBtn) {
        sellBtn.addEventListener("click", () => {
          if (gameState.inventory.getCount(this.selectedItemId) > 0) {
            // Sell Logic
            const val = def.value || 1;
            gameState.inventory.removeItem(this.selectedItemId, 1);
            gameState.inventory.addItem("coins", val);

            // Visual Notification (could be improved)
            // For now rely on UI update
            this.update(); // Re-render this view
          }
        });
      }
    }
  }

  // Static helper kept for EquipmentView usage
  static getInventoryHTML() {
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
            <div class="inv-card-name">${def.name}</div>
            <div class="inv-card-count">${formatNumber(count)}</div>
          </div>
        `;
        })
        .join("");
    }
  }
}
