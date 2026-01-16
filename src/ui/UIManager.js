import { gameState } from "../core/GameState";
import { SKILL_DEFINITIONS } from "../core/SkillRegistry";
import CHAR_IMG_URL from "../assets/character.png";
import ICON_HEROES from "../assets/icon_heroes.png";
import ICON_EQUIP from "../assets/icon_equip.png";
import ICON_SKILLS from "../assets/icon_skills.png";
import ICON_INV from "../assets/icon_inv.png";
import ICON_SETTINGS from "../assets/icon_settings.png";

export class UIManager {
  constructor() {
    this.container = null;
    this.mainWindow = null;
    this.charPanel = null;
    this.selectedCharIndex = 0;
    this.currentView = null; // Default closed
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

    // Sidebar (Left Center)
    this.sidebar = document.createElement("div");
    this.sidebar.className = "hud-panel sidebar";
    this.sidebar.innerHTML = `
      <div class="sidebar-item" id="nav-heroes" title="Heroes" style="background-image: url('${ICON_HEROES}')"></div>
      <div class="sidebar-item" id="nav-equip" title="Equipment" style="background-image: url('${ICON_EQUIP}')"></div>
      <div class="sidebar-item" id="nav-skills" title="Skills" style="background-image: url('${ICON_SKILLS}')"></div>
      <div class="sidebar-item" id="nav-inv" title="Inventory" style="background-image: url('${ICON_INV}')"></div>
      <div class="sidebar-item" id="nav-settings" title="Settings" style="background-image: url('${ICON_SETTINGS}')"></div>
    `;
    this.container.appendChild(this.sidebar);

    // Main Window (Center)
    this.mainWindow = document.createElement("div");
    this.mainWindow.className = "hud-panel main-window";
    this.mainWindow.innerHTML = `
      <div class="mw-header">
        <h2 id="mw-title">Heroes</h2>
      </div>
      <div class="mw-content" id="mw-content">
         <!-- Dynamic Content -->
      </div>
    `;
    this.container.appendChild(this.mainWindow);

    this.bindEvents();
    this.renderMainWindow(); // Initial Render
  }

  bindEvents() {
    // Sidebar Switching
    this.sidebar
      .querySelector("#nav-heroes")
      .addEventListener("click", () => this.switchView("HEROES"));
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
      .querySelector("#nav-settings")
      .addEventListener("click", () => this.switchView("SETTINGS"));
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

    if (!this.currentView) {
      this.mainWindow.classList.add("hidden");
      return;
    }
    this.mainWindow.classList.remove("hidden");

    if (this.currentView === "HEROES") {
      titleEl.innerText = "Heroes";
      this.renderHeroesContent(contentEl);
    } else if (this.currentView === "EQUIP") {
      titleEl.innerText = "Equipment";
      this.renderEquipContent(contentEl);
    } else if (this.currentView === "INV") {
      titleEl.innerText = "Inventory";
      this.renderInvContent(contentEl);
    } else if (this.currentView === "SKILLS") {
      titleEl.innerText = "Skills";
      this.renderSkillContent(contentEl);
    } else if (this.currentView === "SETTINGS") {
      titleEl.innerText = "Settings";
      this.renderSettingsContent(contentEl);
    }
  }

  handleSwitchChar(delta) {
    const count = gameState.characters.length;
    this.selectedCharIndex = (this.selectedCharIndex + delta + count) % count;
    this.renderMainWindow(); // Refresh current view for new char
    this.update();
  }

  renderHeroesContent(container) {
    container.className = "mw-content";

    // Grid Container
    const grid = document.createElement("div");
    grid.className = "hero-grid";

    gameState.characters.forEach((char, index) => {
      const card = this.createHeroCard(char, index);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  createHeroCard(char, index) {
    const card = document.createElement("div");
    card.className = "hero-card";
    if (index === this.selectedCharIndex) {
      card.classList.add("selected");
    }

    // Internal State for Tab
    let currentTab = "STATS";

    // Activity Color/Text
    const statusText = char.currentActivity
      ? char.currentActivity.type
      : "Idle";
    const statusColor = char.currentActivity ? "#fbbf24" : "#4ade80";

    // HTML Structure
    card.innerHTML = `
        <div class="hero-status-badge" style="color: ${statusColor}">
            <span class="status-dot" style="background: ${statusColor}"></span>
            ${statusText}
        </div>
        <div class="hero-header">
           <div class="hero-avatar-box">
           <!-- Using background image for avatar -->
              <div class="hero-avatar-img" style="background-image: url('${CHAR_IMG_URL}')"></div>
           </div>
           <div class="hero-info">
              <h3>${char.name}</h3>
              <span>Lvl ${char.stats.level} ${char.type}</span>
           </div>
        </div>
        
        <div class="hero-tabs">
           <button class="hero-tab-btn active" data-tab="STATS">Stats</button>
           <button class="hero-tab-btn" data-tab="SKILLS">Skills</button>
        </div>
        
        <div class="hero-body" id="hero-body-${index}">
           <!-- Dynamic Content -->
        </div>
        
        <div class="hero-equip-window">
           <div class="hero-equip-title">Equipment</div>
           <div class="equip-slots-mini">
              <div class="equip-slot-mini" title="Main Hand">⚔️</div>
              <div class="equip-slot-mini" title="Off Hand">🛡️</div>
              <div class="equip-slot-mini" title="Armor">👕</div>
           </div>
        </div>
      `;

    // Select Hero Handler
    card.addEventListener("click", (e) => {
      // Prevent selection loops or tab clicks triggering selection logic if needed
      // Actually, selecting on tab click is fine too, but let's be cleaner
      if (e.target.closest(".hero-tab-btn")) return;

      if (this.selectedCharIndex !== index) {
        this.selectedCharIndex = index;
        this.update();
        this.renderMainWindow();
      }
    });

    // Tab Handlers
    const bodyEl = card.querySelector(`#hero-body-${index}`);
    const btnStats = card.querySelector('[data-tab="STATS"]');
    const btnSkills = card.querySelector('[data-tab="SKILLS"]');

    const renderBody = () => {
      bodyEl.innerHTML = "";
      if (currentTab === "STATS") {
        bodyEl.innerHTML = `
                <div class="stat-row"><span>Lv</span><span>${char.stats.level}</span></div>
                <div class="stat-row"><span>XP</span><span>${char.stats.xp}</span></div>
                <div class="stat-row"><span>STR</span><span style="color: #f87171">${char.stats.strength}</span></div>
                <div class="stat-row"><span>DEX</span><span style="color: #4ade80">${char.stats.dexterity}</span></div>
                <div class="stat-row"><span>INT</span><span style="color: #60a5fa">${char.stats.intelligence}</span></div>
              `;
      } else {
        // Skills View
        bodyEl.innerHTML = `
                <div class="stat-row"><span>Mining</span><span>${char.skills.mining.level}</span></div>
                <div class="stat-row"><span>Woodcutting</span><span>${char.skills.woodcutting.level}</span></div>
                <div class="stat-row"><span>Fishing</span><span>${char.skills.fishing.level}</span></div>
                <div class="stat-row"><span>Fighting</span><span>${char.skills.fighting.level}</span></div>
              `;
      }
    };

    btnStats.addEventListener("click", () => {
      currentTab = "STATS";
      btnStats.classList.add("active");
      btnSkills.classList.remove("active");
      btnSkills.classList.remove("active"); // duplicate remove for safety? no
      renderBody();
    });

    btnSkills.addEventListener("click", () => {
      currentTab = "SKILLS";
      btnSkills.classList.add("active");
      btnStats.classList.remove("active");
      renderBody();
    });

    // Initial Render for this card
    renderBody();

    return card;
  }

  renderEquipContent(container) {
    container.className = "mw-content";
    const char = gameState.characters[this.selectedCharIndex];

    container.innerHTML = `
        <div class="equipment-layout">
            <!-- Left Column: Armor -->
            <div class="equip-column left">
                <div class="equip-slot-lg" data-slot="head">
                    <span class="slot-icon">🧢</span>
                    <span class="slot-label">Head</span>
                </div>
                <div class="equip-slot-lg" data-slot="chest">
                    <span class="slot-icon">👕</span>
                    <span class="slot-label">Chest</span>
                </div>
                 <div class="equip-slot-lg" data-slot="belt">
                    <span class="slot-icon">🥋</span>
                    <span class="slot-label">Belt</span>
                </div>
                <div class="equip-slot-lg" data-slot="gloves">
                    <span class="slot-icon">🧤</span>
                    <span class="slot-label">Gloves</span>
                </div>
                <div class="equip-slot-lg" data-slot="legs">
                    <span class="slot-icon">👖</span>
                    <span class="slot-label">Legs</span>
                </div>
                <div class="equip-slot-lg" data-slot="feet">
                    <span class="slot-icon">👢</span>
                    <span class="slot-label">Feet</span>
                </div>
            </div>

            <!-- Center: Avatar -->
            <div class="equip-center">
                 <div class="equip-avatar-display">
                    <div class="equip-avatar-img" style="background-image: url('${CHAR_IMG_URL}')"></div>
                 </div>
                 <div class="equip-char-name">${char ? char.name : "Hero"}</div>
            </div>

            <!-- Right Column: Weapons & Jewelry -->
            <div class="equip-column right">
                <div class="equip-slot-lg" data-slot="mainHand">
                    <span class="slot-icon">⚔️</span>
                    <span class="slot-label">Main Hand</span>
                </div>
                <div class="equip-slot-lg" data-slot="offHand">
                    <span class="slot-icon">🛡️</span>
                    <span class="slot-label">Off Hand</span>
                </div>
                <div class="equip-row-dual">
                    <div class="equip-slot-lg" data-slot="ring1">
                        <span class="slot-icon">💍</span>
                        <span class="slot-label">Ring 1</span>
                    </div>
                    <div class="equip-slot-lg" data-slot="ring2">
                        <span class="slot-icon">💍</span>
                        <span class="slot-label">Ring 2</span>
                    </div>
                </div>
                <div class="equip-row-dual">
                     <div class="equip-slot-lg" data-slot="trinket1">
                        <span class="slot-icon">🧿</span>
                        <span class="slot-label">Trinket 1</span>
                    </div>
                     <div class="equip-slot-lg" data-slot="trinket2">
                        <span class="slot-icon">🧿</span>
                        <span class="slot-label">Trinket 2</span>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  renderInvContent(container) {
    container.className = "mw-content inventory-list";
    const items = gameState.inventory.items;
    const entries = Object.entries(items).filter(([_, count]) => count > 0);

    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-msg">No items</div>';
    } else {
      container.innerHTML = entries
        .map(
          ([id, count]) => `
          <div class="inv-item">
            <span class="inv-name">${id.replace(/_/g, " ")}</span>
            <span class="inv-count">${count}</span>
          </div>
        `
        )
        .join("");
    }
  }

  renderSkillContent(container) {
    container.className = "mw-content";
    const char = gameState.characters[this.selectedCharIndex];
    Object.values(SKILL_DEFINITIONS).forEach((skill) => {
      const skillSection = document.createElement("div");
      skillSection.className = "skill-section";

      const skillTitle = document.createElement("h3");
      const currentLvl =
        char && char.skills[skill.id.toLowerCase()]
          ? char.skills[skill.id.toLowerCase()].level
          : 1;
      skillTitle.innerText = `${skill.name} (Lvl ${currentLvl})`;
      skillSection.appendChild(skillTitle);

      const optionsGrid = document.createElement("div");
      optionsGrid.className = "skill-options";

      Object.entries(skill.options).forEach(([key, opt]) => {
        const btn = document.createElement("button");
        btn.className = "skill-option-btn";
        btn.innerHTML = `
          <div class="opt-name">${opt.name}</div>
          <div class="opt-level">Lvl ${opt.level} (XP: ${opt.xp})</div>
        `;
        if (currentLvl < opt.level) {
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
        }

        btn.addEventListener("click", () => {
          if (currentLvl >= opt.level) {
            this.handleStartActivity(skill.id, key);
            this.renderMainWindow(); // Refresh? or just Activity starts
          }
        });
        optionsGrid.appendChild(btn);
      });

      skillSection.appendChild(optionsGrid);
      container.appendChild(skillSection);
    });
  }

  renderSettingsContent(container) {
    container.className = "mw-content settings-panel";
    container.innerHTML = `
        <div class="settings-disclaimer">
            ⚠️ Disclaimer: These settings are currently placeholders and do not affect the game.
        </div>
        <div class="setting-category">
            <h3>Audio</h3>
            <div class="setting-row">
                <span class="setting-label">Master Volume</span>
                <input type="range" class="setting-slider" min="0" max="100" value="80">
            </div>
            <div class="setting-row">
                <span class="setting-label">Music</span>
                <input type="checkbox" checked>
            </div>
            <div class="setting-row">
                <span class="setting-label">SFX</span>
                <input type="checkbox" checked>
            </div>
        </div>
        <div class="setting-category">
            <h3>Gameplay</h3>
            <div class="setting-row">
                <span class="setting-label">Auto-Save</span>
                <input type="checkbox" checked>
            </div>
             <div class="setting-row">
                <span class="setting-label">Show Particles</span>
                <input type="checkbox" checked>
            </div>
             <div class="setting-row">
                <span class="setting-label">Notifications</span>
                <input type="checkbox">
            </div>
        </div>
        <div class="setting-category">
            <h3>Account</h3>
             <div class="setting-row">
               <button class="btn-setting">Save Game</button>
               <button class="btn-setting">Load Game</button>
            </div>
            <div class="setting-row">
               <button class="btn-setting danger">Reset Progress</button>
            </div>
        </div>
    `;
  }

  handleStartActivity(skillId, targetId) {
    const char = gameState.characters[this.selectedCharIndex];
    if (!char) return;

    char.startActivity(skillId, targetId);
    gameState.notifyListeners(); // Will trigger update()
  }

  handleStopAction() {
    const char = gameState.characters[this.selectedCharIndex];
    if (char) {
      char.stopActivity();
      gameState.notifyListeners();
    }
  }

  update() {
    if (!this.container) return;

    // Refresh Inv if active
    if (this.currentView === "INV") {
      const contentEl = this.mainWindow.querySelector(".inventory-list");
      if (contentEl) {
        // Simple re-render to catch count updates
        // Optimized: only if item count changed? For now, re-render is cheap
        this.renderInvContent(contentEl); // Re-run render
      }
    }
  }
}

export const uiManager = new UIManager();
