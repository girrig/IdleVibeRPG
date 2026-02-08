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
import { ItemSelectionModal } from "./components/ItemSelectionModal";

import { ITEM_DEFINITIONS } from "../core/ItemRegistry";
import { sourceRegistry } from "../core/SourceRegistry";
import { SKILL_DEFINITIONS } from "../core/SkillRegistry";
import { goalManager } from "../core/GoalManager";
import { version } from "../../package.json";

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
      <div class="sidebar-item" id="nav-skills" title="Codex" style="font-size: 24px;">📖</div>
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

    // Top Right Container (Version + Save)
    const topRightContainer = document.createElement("div");
    topRightContainer.className = "top-right-container";

    // Version Display
    const versionDisplay = document.createElement("span");
    versionDisplay.className = "version-display";
    versionDisplay.innerText = `v${version}`;
    topRightContainer.appendChild(versionDisplay);

    // Global Save Button
    const saveBtn = document.createElement("button");
    saveBtn.id = "global-save-btn";
    saveBtn.className = "btn-save-global";
    saveBtn.innerText = "Save";
    topRightContainer.appendChild(saveBtn);

    this.container.appendChild(topRightContainer);

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
      titleEl.innerText = "Codex";
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

  showItemSelectionModal(onSelectCallback) {
    const char = gameState.characters[this.selectedCharIndex];
    const modal = new ItemSelectionModal(char, (result) => {
      if (result.type === "EXPLORATION") {
        this.handleStartActivity("EXPLORING", result.id, 0);
      } else {
        onSelectCallback(result.id, result.qty);
      }
    }, gameState);
    modal.show();
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
