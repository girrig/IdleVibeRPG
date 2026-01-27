import { gameState } from "../core/GameState";
import { CharacterDetail } from "./components/CharacterDetail";
import { InventoryView } from "./components/InventoryView";
import { SkillsView } from "./components/SkillsView";
import { SettingsView } from "./components/SettingsView";
import { NotificationDisplay } from "./components/NotificationDisplay";
import { TalentsView } from "./components/TalentsView";
import { EquipmentView } from "./components/EquipmentView";
import { StoreView } from "./components/StoreView";
import { MapView } from "./components/MapView";

import { ITEM_DEFINITIONS } from "../core/ItemRegistry";
import { sourceRegistry } from "../core/SourceRegistry";
import { SKILL_DEFINITIONS } from "../core/SkillRegistry";
import { goalManager } from "../core/GoalManager";

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
    this.mapView = new MapView();
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
      <div class="sidebar-item" id="nav-map" title="Map" style="font-size: 24px;">🗺️</div>
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

    // Flag to ensure we don't double-render or clear prematurely
    this.isInitialized = true;

    this.bindEvents();

    // Initial Renders
    this.renderMainWindow();
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
      .querySelector("#nav-map")
      .addEventListener("click", () => this.switchView("MAP"));
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
        // Use manualSave to reset autosave timer
        gameState.manualSave();

        // UI Feedback
        this.lastManualSave = now;
        saveBtn.disabled = true;
        saveBtn.innerText = "Saved";

        setTimeout(() => {
          saveBtn.disabled = false;
          saveBtn.innerText = "Save";
        }, 10000);
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
    } else if (this.currentView === "MAP") {
      titleEl.innerText = "World Map";
      this.mapView.render(contentEl);
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

    let searchTerm = "";
    let activeTab = "ITEMS"; // ITEMS or EXPLORATION

    // Styles for tabs
    const tabStyle = `
      padding: 8px 16px; 
      cursor: pointer; 
      border-bottom: 2px solid transparent; 
      color: #aaa; 
      font-weight: bold;
    `;
    const activeTabStyle = `
      padding: 8px 16px; 
      cursor: pointer; 
      border-bottom: 2px solid #FFD700; 
      color: #fff; 
      font-weight: bold;
    `;

    const render = () => {
      let gridHtml = "";

      if (activeTab === "ITEMS") {
        // Filter Items
        const allItems = Object.entries(ITEM_DEFINITIONS);
        const filtered = allItems
          .filter(([id, def]) => {
            const char = gameState.characters[this.selectedCharIndex];
            const source = sourceRegistry.getSource(id);

            // Check Requirements
            if (source && source.type === "SKILL") {
              const skillId = source.skillId.toLowerCase();
              const reqLevel = source.reqLevel;
              const charSkill = char.skills[skillId];
              const charLevel = charSkill ? charSkill.level : 0;

              if (charLevel < reqLevel) {
                return false; // Hide inaccessible
              }
            }

            const matchesSearch = def.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            return matchesSearch;
          })
          .sort(([, a], [, b]) => a.name.localeCompare(b.name));

        // Grid HTML
        gridHtml = filtered
          .map(([id, def]) => {
            return `
                  <div class="goal-item-card" data-id="${id}" style="cursor: pointer;">
                      <div class="goal-item-icon">${def.icon}</div>
                      <div class="goal-item-name">${def.name}</div>
                  </div>
              `;
          })
          .join("");
      } else if (activeTab === "EXPLORATION") {
        // Exploring Options
        const exploring = SKILL_DEFINITIONS.EXPLORING;
        if (exploring && exploring.options) {
          const char = gameState.characters[this.selectedCharIndex];
          const charLevel = char.skills.exploring
            ? char.skills.exploring.level
            : 1;

          const options = Object.entries(exploring.options)
            .filter(([id, opt]) => {
              // Level Check
              if (opt.level > charLevel) return false;

              // Search Check
              if (
                searchTerm &&
                !opt.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
                return false;

              return true;
            })
            .sort((a, b) => a[1].level - b[1].level); // Sort by level

          gridHtml = options
            .map(([id, opt]) => {
              return `
                  <div class="goal-item-card" data-id="${id}" style="cursor: pointer; border-color: ${SKILL_DEFINITIONS.EXPLORING.color}">
                      <div class="goal-item-icon">${opt.icon}</div>
                      <div class="goal-item-name">${opt.name}</div>
                      <div style="font-size: 10px; color: #888;">Lvl ${opt.level}</div>
                  </div>
                 `;
            })
            .join("");
        }
      }

      return gridHtml;
    };

    modal.innerHTML = `
        <div class="modal-content modal-lg" style="max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>Select Activity</h2>
                <button class="btn-close">×</button>
            </div>
            
            <!-- Tabs -->
            <div style="display: flex; gap: 10px; padding: 0 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px;">
                <div id="tab-items" style="${activeTab === "ITEMS" ? activeTabStyle : tabStyle}">Items</div>
                <div id="tab-exploration" style="${activeTab === "EXPLORATION" ? activeTabStyle : tabStyle}">Exploration</div>
            </div>

            <div class="quantity-selector-container">
                <label for="goal-quantity-input" class="quantity-label">Target Quantity:</label>
                <!-- Presets First -->
                <div class="quantity-presets">
                    <button class="quantity-preset-btn" data-qty="1">1</button>
                    <button class="quantity-preset-btn" data-qty="10">10</button>
                    <button class="quantity-preset-btn" data-qty="50">50</button>
                    <button class="quantity-preset-btn" data-qty="100">100</button>
                    <button class="quantity-preset-btn" data-qty="1000">1000</button>
                    <!-- Persistent Custom Input -->
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="goal-quantity-input" placeholder="#" class="quantity-input" style="width: 70px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px; text-align: center; background: rgba(0,0,0,0.2);" />
                        <button id="btn-clear-qty" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #ccc; cursor: pointer; font-size: 14px; padding: 2px 8px; display: none;">✕</button>
                    </div>
                </div>
                
                <!-- Search Bar Inline (Far Right) -->
                <input type="text" class="search-bar" placeholder="Search..." id="item-search-input">
            </div>

             <div class="goals-grid" id="goals-grid-container">
                ${render()}
            </div>
        </div>
     `;

    document.body.appendChild(modal);

    // State Management for Re-rendering Grid
    const updateGrid = () => {
      const grid = modal.querySelector("#goals-grid-container");
      if (grid) {
        grid.innerHTML = render();
        bindGridEvents();
      }

      // Update Tab Styles
      const tabItems = modal.querySelector("#tab-items");
      const tabExpl = modal.querySelector("#tab-exploration");
      if (tabItems)
        tabItems.style.cssText =
          activeTab === "ITEMS" ? activeTabStyle : tabStyle;
      if (tabExpl)
        tabExpl.style.cssText =
          activeTab === "EXPLORATION" ? activeTabStyle : tabStyle;

      // Toggle Quantity Selector
      const qtyContainer = modal.querySelector(".quantity-selector-container");
      if (qtyContainer) {
        qtyContainer.style.display =
          activeTab === "EXPLORATION" ? "none" : "flex";
      }
    };

    // Events
    const close = () => {
      modal.classList.add("hidden");
      setTimeout(() => modal.remove(), 200);
    };

    modal.querySelector(".btn-close").addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    // Tabs
    modal.querySelector("#tab-items").addEventListener("click", () => {
      activeTab = "ITEMS";
      updateGrid();
    });
    modal.querySelector("#tab-exploration").addEventListener("click", () => {
      activeTab = "EXPLORATION";
      updateGrid();
    });

    const qtyInput = modal.querySelector("#goal-quantity-input");
    const clearBtn = modal.querySelector("#btn-clear-qty");
    let currentQty = 1;
    let lastClickedQty = null;

    // Helper to sync state from input
    const syncQty = () => {
      const val = parseInt(qtyInput.value, 10);
      if (val > 0) {
        currentQty = val;
        lastClickedQty = null;
        if (clearBtn) clearBtn.style.display = "block";
      } else {
        if (clearBtn) clearBtn.style.display = "none";
      }
    };

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        qtyInput.value = "";
        currentQty = 1;
        lastClickedQty = null;
        clearBtn.style.display = "none";
        qtyInput.focus();
      });
    }

    // Input events
    qtyInput.addEventListener("input", syncQty);
    qtyInput.addEventListener("change", syncQty);

    modal.querySelectorAll(".quantity-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const btnVal = parseInt(btn.dataset.qty);

        // Strictly Additive Logic
        // If the input is empty (user cleared it), we treat current as 0 effectively before adding (but currentQty is 1 by default logic).
        // Let's check if the input is actually showing a number.
        const inputVal = parseInt(qtyInput.value, 10);
        if (isNaN(inputVal)) {
          // If empty/cleared, start from 0 + btnVal
          currentQty = btnVal;
        } else {
          currentQty += btnVal;
        }

        lastClickedQty = btnVal;
        if (currentQty > 9999) currentQty = 9999;

        if (qtyInput) {
          qtyInput.value = currentQty;
          if (clearBtn) clearBtn.style.display = "block";
        }
      });
    });

    // Search
    const searchInput = modal.querySelector("#item-search-input");
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      updateGrid();
    });

    // Grid Item Clicks (Need to re-bind on render)
    const bindGridEvents = () => {
      modal.querySelectorAll(".goal-item-card").forEach((el) => {
        el.addEventListener("click", () => {
          const id = el.dataset.id;
          const qty = parseInt(qtyInput.value, 10) || currentQty || 1;

          // If Exploration, we are selecting a skill option directly.
          if (activeTab === "EXPLORATION") {
            // The id is the option key (e.g., 'find_forest')
            // We need to trigger the Exploring skill with this target
            this.handleStartActivity("EXPLORING", id, 0);
          } else {
            // Standard Item Selection - let the system decide skill?
            // Existing UIManager passes id to onSelect... wait.
            // The original logic called onSelect(id, qty).
            // onSelect was passed from CharacterDetail.
            // Let's see how onSelect handles it.
            onSelect(id, qty);
          }

          close();
        });
      });
    };

    // Initial Bind
    bindGridEvents();

    // Auto focus search
    searchInput.focus();
  }

  handleStartActivity(skill, target, quantity) {
    const char = gameState.characters[this.selectedCharIndex];
    if (!char) return;

    // For Exploring: JUST start the activity.
    // We don't create a 'Goal' because goals imply Item + Quantity.
    if (skill === "EXPLORING") {
      // Clear active goal so the UI switches to "Activity Mode"
      if (char.activeGoal) {
        goalManager.clearGoal(gameState, char);
      }

      char.startActivity(skill, target, 0); // 0 = Infinite
      this.renderMainWindow();
      return;
    }

    // Default Fallback
    char.startActivity(skill, target, quantity);
    this.renderMainWindow();
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
    } else if (this.currentView === "MAP") {
      if (this.mapView) {
        this.mapView.refreshMap();
      }
    }
  }
}

export const uiManager = new UIManager();
