import { gameState } from "../core/GameState";
import { CharacterDetail } from "./components/CharacterDetail";
import { InventoryView } from "./components/InventoryView";
import { SkillsView } from "./components/SkillsView";
import { SettingsView } from "./components/SettingsView";
import { NotificationDisplay } from "./components/NotificationDisplay";
import { TalentsView } from "./components/TalentsView";
import { EquipmentView } from "./components/EquipmentView";
import { StoreView } from "./components/StoreView";

import { ITEM_DEFINITIONS } from "../core/ItemRegistry";

// Helper
function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "❓" };
}

export class UIManager {
  constructor() {
    this.container = null;
    this.mainWindow = null;
    this.charPanel = null;
    this.selectedCharIndex = 0;
    this.currentView = null; // Default closed

    // Instance-based views
    this.skillsView = new SkillsView(this);
    this.talentsView = new TalentsView(this);
    this.characterDetail = new CharacterDetail(this);
    this.storeView = new StoreView(this);
    this.equipmentView = new EquipmentView();
    this.inventoryView = new InventoryView();
  }

  getAvatarUrl(spriteKey) {
    return CHAR_IMG_URL;
  }

  initialize() {
    this.createOverlay();

    // Unsubscribe previous listeners if any
    if (this.unsubscribeState) this.unsubscribeState();
    if (this.unsubscribeNotif) this.unsubscribeNotif();

    // Subscribe to game state
    this.unsubscribeState = gameState.addListener(() => this.update());

    // Subscribe to notifications
    this.unsubscribeNotif = gameState.addNotificationListener((msg, type) =>
      this.showNotification(msg, type),
    );

    this.update(); // Initial sync
  }

  showNotification(message, type = "info") {
    NotificationDisplay.show(this.container, message, type);
  }

  createOverlay() {
    // Parent container
    const app = document.getElementById("app");

    // Cleanup existing overlay if any (prevents duplication on hot-reload)
    const existing = document.getElementById("ui-layer");
    if (existing) existing.remove();

    this.container = document.createElement("div");
    this.container.id = "ui-layer";
    app.appendChild(this.container);

    // Sidebar (Left Center)
    this.sidebar = document.createElement("div");
    this.sidebar.className = "hud-panel sidebar";
    this.sidebar.innerHTML = `
      <div class="sidebar-item" id="nav-characters" title="Characters" style="font-size: 24px;">🦸</div>
      <div class="sidebar-item" id="nav-inv" title="Inventory" style="font-size: 24px;">🎒</div>
      <div class="sidebar-item" id="nav-equip" title="Equipment" style="font-size: 24px;">🛡️</div>
      <div class="sidebar-item" id="nav-skills" title="Skills" style="font-size: 24px;">⭐</div>
      <div class="sidebar-item" id="nav-talents" title="Talents" style="font-size: 24px;">🌳</div>
      <div class="sidebar-item" id="nav-store" title="Store" style="font-size: 24px;">🏪</div>
      <div class="sidebar-item" id="nav-settings" title="Settings" style="font-size: 24px;">⚙️</div>
    `;
    this.container.appendChild(this.sidebar);

    // Main Window (Center)
    this.mainWindow = document.createElement("div");
    this.mainWindow.className = "hud-panel main-window";
    this.mainWindow.innerHTML = `
      <div class="mw-header">
        <h2 id="mw-title">Characters</h2>
      </div>
      <div class="mw-content" id="mw-content">
         <!-- Dynamic Content -->
      </div>
    `;
    this.container.appendChild(this.mainWindow);

    // Global Save Button
    const saveBtn = document.createElement("button");
    saveBtn.id = "global-save-btn";
    saveBtn.className = "btn-save-global";
    saveBtn.innerText = "Save";
    this.container.appendChild(saveBtn);

    this.bindEvents();
    this.renderMainWindow(); // Initial Render
  }

  bindEvents() {
    // Sidebar Switching
    this.sidebar
      .querySelector("#nav-characters")
      .addEventListener("click", () => this.switchView("CHARACTERS"));
    this.sidebar
      .querySelector("#nav-equip")
      .addEventListener("click", () => this.switchView("EQUIP"));
    this.sidebar
      .querySelector("#nav-inv")
      .addEventListener("click", () => this.switchView("INV"));
    this.sidebar
      .querySelector("#nav-skills")
      .addEventListener("click", () => this.switchView("SKILLS"));
    this.sidebar
      .querySelector("#nav-talents")
      .addEventListener("click", () => this.switchView("TALENTS"));
    this.sidebar
      .querySelector("#nav-store")
      .addEventListener("click", () => this.switchView("STORE"));
    this.sidebar
      .querySelector("#nav-settings")
      .addEventListener("click", () => this.switchView("SETTINGS"));

    // Save Button Logic
    const saveBtn = this.container.querySelector("#global-save-btn");
    saveBtn.addEventListener("click", () => {
      const now = Date.now();
      const lastSave = this.lastManualSave || 0;
      if (now - lastSave >= 10000) {
        if (gameState.saveGame()) {
          this.showNotification("Game Saved!", "success");
          this.lastManualSave = now;
          saveBtn.disabled = true;
          saveBtn.innerText = "Saved";

          setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerText = "Save";
          }, 10000);
        }
      }
    });
  }

  switchView(viewName) {
    if (this.currentView === viewName) {
      this.currentView = null; // Toggle off
    } else {
      this.currentView = viewName;
    }
    this.renderMainWindow();
  }

  renderMainWindow() {
    const titleEl = this.mainWindow.querySelector("#mw-title");
    const contentEl = this.mainWindow.querySelector("#mw-content");
    contentEl.innerHTML = "";

    // Cleanup settings interval when switching away
    if (this.activeViewCleanup) {
      this.activeViewCleanup();
      this.activeViewCleanup = null;
    }

    if (!this.currentView) {
      this.mainWindow.classList.add("hidden");
      return;
    }
    this.mainWindow.classList.remove("hidden");

    if (this.currentView === "CHARACTERS") {
      titleEl.innerText = "Characters";
      this.characterDetail.render(contentEl);
    } else if (this.currentView === "EQUIP") {
      titleEl.innerText = "Equipment";
      this.equipmentView.render(contentEl, this.selectedCharIndex);
    } else if (this.currentView === "INV") {
      titleEl.innerText = "Inventory";
      this.inventoryView.render(contentEl);
    } else if (this.currentView === "SKILLS") {
      titleEl.innerText = "Skills";
      this.skillsView.render(contentEl);
    } else if (this.currentView === "TALENTS") {
      titleEl.innerText = "Talents";
      this.talentsView.render(contentEl);
    } else if (this.currentView === "STORE") {
      titleEl.innerText = "Store";
      this.storeView.render(contentEl);
    } else if (this.currentView === "SETTINGS") {
      titleEl.innerText = "Settings";
      SettingsView.render(contentEl);
      this.activeViewCleanup = () => {
        if (contentEl._settingsInterval)
          clearInterval(contentEl._settingsInterval);
      };
    }
  }

  handleSwitchChar(delta) {
    const count = gameState.characters.length;
    this.selectedCharIndex = (this.selectedCharIndex + delta + count) % count;
    this.renderMainWindow(); // Refresh current view for new char
    this.update();
  }

  showItemSelectionModal(onSelect) {
    const modal = document.createElement("div");
    modal.className = "game-modal";
    modal.innerHTML = `
        <div class="modal-content" style="width: 600px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>Select Target Item</h2>
                <button class="btn-close">×</button>
            </div>
            
            <div class="quantity-selector-container">
                <label for="goal-quantity-input" class="quantity-label">Target Quantity:</label>
                
                <div class="quantity-control-wrapper">
                    <button class="quantity-btn-step minus" id="btn-qty-minus">−</button>
                    <input type="number" id="goal-quantity-input" value="1" min="1" max="9999" class="quantity-input" />
                    <button class="quantity-btn-step plus" id="btn-qty-plus">+</button>
                </div>
                
                <div class="quantity-presets">
                    <button class="quantity-preset-btn" data-qty="1">1</button>
                    <button class="quantity-preset-btn" data-qty="10">10</button>
                    <button class="quantity-preset-btn" data-qty="100">100</button>
                    <button class="quantity-preset-btn" data-qty="1000">1000</button>
                </div>
            </div>

             <div class="goals-grid" style="overflow-y: auto; padding: 10px;">
                ${Object.entries(ITEM_DEFINITIONS)
                  .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                  .map(
                    ([id, def]) => `
                    <div class="goal-item-card" data-id="${id}">
                        <div class="goal-item-icon">${def.icon}</div>
                        <div class="goal-item-name">${def.name}</div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        </div>
     `;

    document.body.appendChild(modal);

    // Close events
    const close = () => {
      modal.classList.add("hidden");
      setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector(".btn-close").addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    // Custom Quantity Control Logic
    const qtyInput = modal.querySelector("#goal-quantity-input");
    const updateQty = (delta) => {
      let val = parseInt(qtyInput.value, 10) || 0;
      val += delta;
      if (val < 1) val = 1;
      if (val > 9999) val = 9999;
      qtyInput.value = val;
    };

    modal
      .querySelector("#btn-qty-minus")
      .addEventListener("click", () => updateQty(-1));
    modal
      .querySelector("#btn-qty-plus")
      .addEventListener("click", () => updateQty(1));

    // Quantity Preset Buttons
    modal.querySelectorAll(".quantity-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (qtyInput) {
          qtyInput.value = btn.dataset.qty;
        }
      });
    });

    // Item Click
    modal.querySelectorAll(".goal-item-card").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        const qtyInput = modal.querySelector("#goal-quantity-input");
        const qty = parseInt(qtyInput.value, 10) || 1;
        onSelect(id, qty);
        close();
      });
    });
  }

  handleStartActivity(skillId, targetId, quantity = 1) {
    const char = gameState.characters[this.selectedCharIndex];
    if (!char) return;

    char.startActivity(skillId, targetId, quantity);
    gameState.notifyListeners(); // Will trigger update()
  }

  update() {
    if (!this.container) return;

    // Refresh Inv if active
    if (this.currentView === "INV") {
      const contentEl = this.mainWindow.querySelector("#mw-content");
      if (contentEl) {
        // We only want to re-render if we are already seeing the view
        // But InventoryView.render completely wipes content.
        // Ideally we should have an .update() method, but .render works for now.
        // To preserve selection, the instance holds the state.
        this.inventoryView.render(contentEl);
      }
    } else if (this.currentView === "CHARACTERS") {
      const contentEl = this.mainWindow.querySelector(".mw-content");
      if (contentEl && contentEl.classList.contains("char-split-layout")) {
        CharacterDetail.updateContent(contentEl, this);
      } else {
        this.renderMainWindow();
      }
    } else if (this.currentView === "SKILLS") {
      const contentEl = this.mainWindow.querySelector("#mw-content");
      if (contentEl) {
        this.skillsView.update(contentEl);
      }
    } else if (this.currentView === "EQUIP") {
      const invGrid = this.mainWindow.querySelector(".equip-inv-grid");
      if (invGrid) {
        invGrid.innerHTML = InventoryView.getInventoryHTML();
      }
    }
  }
}

export const uiManager = new UIManager();
