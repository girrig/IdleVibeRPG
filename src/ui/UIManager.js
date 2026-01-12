import { gameState } from "../core/GameState";
import CHAR_IMG_URL from "../assets/character.png";

export class UIManager {
  constructor() {
    this.container = null;
    this.resourcePanel = null;
    this.charPanel = null;
  }

  initialize() {
    this.createOverlay();
    // Subscribe to game state
    gameState.addListener(() => this.update());
    this.update(); // Initial sync
  }

  createOverlay() {
    // Parent container
    const app = document.getElementById("app");
    this.container = document.createElement("div");
    this.container.id = "ui-layer";
    app.appendChild(this.container);

    // Resource Panel (Top Right)
    this.resourcePanel = document.createElement("div");
    this.resourcePanel.className = "hud-panel resource-display";
    this.resourcePanel.innerHTML = `
      <div class="resource-row">
        <span class="res-name">Copper Ore</span>
        <span class="res-value" id="res-copper">0</span>
      </div>
    `;
    this.container.appendChild(this.resourcePanel);

    // Character Card (Bottom Left) -- HARDCODED FOR HERO 1 FOR NOW
    this.charPanel = document.createElement("div");
    this.charPanel.className = "hud-panel character-card";
    this.charPanel.innerHTML = `
      <div class="char-portrait" style="background-image: url('${CHAR_IMG_URL}')"></div>
      <div class="char-info">
        <div class="char-name" id="char-name">Hero</div>
        <div class="char-status" id="char-status">Idle</div>
        <button class="btn-action" id="btn-action">Start Mining</button>
      </div>
    `;
    this.container.appendChild(this.charPanel);

    // Bind Button Events
    const btn = this.charPanel.querySelector("#btn-action");
    btn.addEventListener("click", () => {
      this.handleActionClick();
    });
  }

  handleActionClick() {
    const char = gameState.characters[0];
    if (!char) return;

    if (char.currentActivity) {
      char.stopActivity();
    } else {
      char.startActivity("MINING", "copper_ore");
    }
    // Update will be triggered by gameState listener, but we can force one if needed logic-wise
    // In this architecture, Character triggers a change?
    // Character just updates local state.
    // We should probably trigger a state update manually or assume tick handles it?
    // Let's force a notify for responsiveness.
    gameState.notifyListeners();
  }

  update() {
    if (!this.container) return;

    // Update Resources
    const copper = gameState.inventory.getCount("copper_ore");
    const copperEl = document.getElementById("res-copper");
    if (copperEl) copperEl.innerText = copper;

    // Update Character
    const char = gameState.characters[0];
    if (char) {
      document.getElementById("char-name").innerText = char.name;

      const statusEl = document.getElementById("char-status");
      const btnEl = document.getElementById("btn-action");

      if (char.currentActivity) {
        statusEl.innerText = `Mining ${char.currentActivity.target}...`;
        statusEl.style.color = "#fbbf24"; // Amber for busy

        btnEl.innerText = "Stop";
        btnEl.classList.add("btn-stop");
      } else {
        statusEl.innerText = "Idle";
        statusEl.style.color = "#4ade80"; // Green for idle

        btnEl.innerText = "Start Mining";
        btnEl.classList.remove("btn-stop");
      }
    }
  }
}

export const uiManager = new UIManager();
