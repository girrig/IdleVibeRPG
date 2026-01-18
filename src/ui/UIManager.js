import { gameState } from "../core/GameState";
import { SKILL_DEFINITIONS } from "../core/SkillRegistry";

import { TALENT_DEFINITIONS } from "../core/TalentRegistry";

export class UIManager {
  renderTalentsContent(container) {
    container.className = "mw-content talent-tree-layout";
    const char = gameState.characters[this.selectedCharIndex];
    if (!char) return;

    container.innerHTML = `
        <div class="talents-header">
            <h3>Talent Tree</h3>
            <span class="talent-points">Points: ${char.talentPoints}</span>
        </div>
        <div class="talents-grid">
            ${this.renderTalentColumns(char)}
        </div>
      `;

    // bind events
    container.querySelectorAll(".talent-node").forEach((node) => {
      node.addEventListener("click", () => {
        const id = node.dataset.id;
        if (char.unlockTalent(id)) {
          gameState.saveGame(); // optimize later
          this.renderMainWindow();
        }
      });
    });
  }

  renderTalentColumns(char) {
    // Simple 3-column layout based on definition
    // Group by column (Strength=0, Dex=1, Int=2)
    const cols = [[], [], []];
    Object.values(TALENT_DEFINITIONS).forEach((def) => {
      if (def.position && def.position.col !== undefined) {
        if (!cols[def.position.col]) cols[def.position.col] = [];
        cols[def.position.col].push(def);
      }
    });

    return cols
      .map((colTalents, colIndex) => {
        return `
            <div class="talent-col">
                <div class="talent-col-header">${["Strength", "Dexterity", "Intelligence"][colIndex]}</div>
                ${colTalents
                  .sort((a, b) => a.position.row - b.position.row)
                  .map((def) => {
                    const unlocked = char.talents[def.id];
                    const prereqMet = def.prerequisites.every(
                      (id) => char.talents[id],
                    );
                    const affordable = char.talentPoints >= def.cost;
                    const locked = !unlocked && (!prereqMet || !affordable);
                    // Actually, "locked" visually usually means "cannot buy yet".
                    // "Available" means can buy.

                    let statusClass = "locked";
                    if (unlocked) statusClass = "unlocked";
                    else if (prereqMet) statusClass = "available";

                    if (unlocked) statusClass += " purchased";

                    return `
                        <div class="talent-node ${statusClass}" data-id="${def.id}" title="${def.name}: ${def.description} (Cost: ${def.cost})">
                            <div class="talent-icon">${def.icon}</div>
                            <div class="talent-name">${def.name}</div>
                            ${unlocked ? '<div class="check">✔</div>' : ""}
                        </div>
                        ${this.renderConnector(def, colTalents)}
                    `;
                  })
                  .join("")}
            </div>
          `;
      })
      .join("");
  }

  renderConnector(def, colTalents) {
    // Check if there is a next node in this column
    const next = colTalents.find(
      (t) => t.position.row === def.position.row + 1,
    );
    if (next && next.prerequisites.includes(def.id)) {
      return `<div class="talent-connector"></div>`;
    }
    return "";
  }
  constructor() {
    this.container = null;
    this.mainWindow = null;
    this.charPanel = null;
    this.selectedCharIndex = 0;
    this.currentView = null; // Default closed
  }

  getAvatarUrl(spriteKey) {
    return CHAR_IMG_URL;
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
      <div class="sidebar-item" id="nav-heroes" title="Heroes" style="font-size: 24px;">🦸</div>
      <div class="sidebar-item" id="nav-equip" title="Equipment" style="font-size: 24px;">🛡️</div>
      <div class="sidebar-item" id="nav-skills" title="Skills" style="font-size: 24px;">⭐</div>
      <div class="sidebar-item" id="nav-talents" title="Talents" style="font-size: 24px;">🌳</div>
      <div class="sidebar-item" id="nav-inv" title="Inventory" style="font-size: 24px;">🎒</div>
      <div class="sidebar-item" id="nav-settings" title="Settings" style="font-size: 24px;">⚙️</div>
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
      .querySelector("#nav-talents")
      .addEventListener("click", () => this.switchView("TALENTS"));
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

    // Cleanup settings interval when switching away
    if (this.settingsInterval) {
      clearInterval(this.settingsInterval);
      this.settingsInterval = null;
    }

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
    } else if (this.currentView === "TALENTS") {
      titleEl.innerText = "Talents";
      this.renderTalentsContent(contentEl);
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
    let grid = container.querySelector(".hero-grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "hero-grid";
      container.appendChild(grid);
    }

    // Clear and Rebuild (simplest way to handle dynamic additions correctly without complex diffing for now)
    // Or, better: synchronize children.
    // For recruitment, simple clear/rebuild is safer to avoid dupes or ordering issues.
    // But updateHeroCard relies on existing DOM.
    // Hybrid approach:

    // 1. Update existing cards
    gameState.characters.forEach((char, index) => {
      let card = document.getElementById(`hero-card-${index}`);
      if (!card) {
        card = this.createHeroCard(char, index);
        grid.insertBefore(card, grid.lastElementChild); // Insert before recruit btn if exists? No, just append for now.
        // Actually, if we clear grid, we lose state.
        // Let's do:
        grid.appendChild(card);
      } else {
        // Determine if card is already in grid (it should be)
        if (!grid.contains(card)) grid.appendChild(card);
        this.updateHeroCard(char, index);
      }
    });

    // 2. Handle Recruit Card
    let recruitCard = document.getElementById("hero-recruit-card");
    if (gameState.characters.length < 8) {
      if (!recruitCard) {
        recruitCard = document.createElement("div");
        recruitCard.className = "hero-card recruit-card";
        recruitCard.id = "hero-recruit-card";
        recruitCard.innerHTML = `
                <div class="recruit-content">
                    <div class="recruit-icon">+</div>
                    <div class="recruit-text">Recruit Hero</div>
                    <div class="recruit-cost">FREE</div> 
                </div>
            `;
        recruitCard.addEventListener("click", () => {
          if (gameState.recruitCharacter()) {
            // Refresh view
            this.renderMainWindow();
          }
        });
        grid.appendChild(recruitCard);
      } else {
        // Move to end if needed (only if not already the last child)
        if (grid.lastElementChild !== recruitCard) {
          grid.appendChild(recruitCard);
        }
      }
    } else {
      if (recruitCard) recruitCard.remove();
    }
  }

  updateHeroCard(char, index) {
    const card = document.getElementById(`hero-card-${index}`);
    if (!card) return;

    // Update Status
    const statusBadge = card.querySelector(".hero-status-badge");
    const statusDot = card.querySelector(".status-dot");
    if (statusBadge && statusDot) {
      const statusText = char.currentActivity
        ? char.currentActivity.type
        : "Idle";
      const statusColor = char.currentActivity ? "#fbbf24" : "#4ade80";
      // Only update if changed to avoid thrashing (though textContent is cheap)
      if (statusBadge.innerText.trim() !== statusText) {
        statusBadge.innerHTML = `<span class="status-dot" style="background: ${statusColor}"></span>${statusText}`;
        statusBadge.style.color = statusColor;
      }
    }

    // Update Active Tab Content
    // We rely on stable IDs for bars
    if (card.querySelector('[data-tab="STATS"].active')) {
      // Update Stats (Simple HTML replace is fine for text, but let's be cleaner if needed.
      // For now, simple replace of stats body is okay as there are no animations there yet.
      // actually, let's leave stats as is, or optimize if flickering occurs.
      const bodyEl = card.querySelector(`#hero-body-${index}`);
      // Re-rendering body implies destroying it? Yes.
      // If we want to animate stats later, we need specific IDs.
      // For now, let's just re-render stats as they are text.
      // BUT, to be safe, let's check if we can just find spans.
      // ... skipping for brevity, prioritizing Skills.
      const lvSpan = bodyEl.querySelector(".stat-lv-val"); // We need to add classes to createHerocard first
      if (lvSpan) lvSpan.innerText = char.stats.level;
      // ... implementing full stat update in createHeroCard might be better.
      // Let's just re-call renderBody if it's STATS tab? No, that breaks the pattern.
      // Let's assume Stats text update is fast enough.

      // Re-triggering renderBody() IS the old way. We want to avoid it.
      // Let's hack: The simple way is: do nothing for Stats if not critical, OR rebuild.
      // Rebuilding stats is cheap. Rebuilding SKILLS is what kills animation.
      // So:
      const renderBody = card._renderBody; // We need to attach this function to card or similar
      if (renderBody) renderBody(true); // true = update mode?
    }

    if (card.querySelector('[data-tab="SKILLS"].active')) {
      // Update Skills Bars
      Object.entries(char.skills).forEach(([id, skill]) => {
        const bar = card.querySelector(`#skill-fill-${index}-${id}`);
        const row = card.querySelector(`#skill-row-${index}-${id}`);
        const lvlSpan = card.querySelector(`#skill-lvl-${index}-${id}`);

        if (bar && row && lvlSpan) {
          const xpNeeded = skill.level * 100;
          const percent = Math.min((skill.xp / xpNeeded) * 100, 100);
          bar.style.width = `${percent}%`;
          row.title = `${skill.xp} / ${xpNeeded} XP`;
          lvlSpan.innerText = `Lv ${skill.level}`;
        }
      });
    }
  }

  createHeroCard(char, index) {
    const card = document.createElement("div");
    card.className = "hero-card";
    card.id = `hero-card-${index}`;
    if (index === this.selectedCharIndex) {
      card.classList.add("selected");
    }

    // Internal State for Tab
    let currentTab = "SKILLS";

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
           <!-- Using emoji for avatar -->
              <div class="hero-avatar-img" style="font-size: 32px; display: flex; justify-content: center; align-items: center;">👤</div>
           </div>
           <div class="hero-info">
              <h3>${char.name}</h3>
              <span>Lvl ${char.stats.level} ${char.type}</span>
           </div>
        </div>
        
        <div class="hero-tabs">
           <button class="hero-tab-btn active" data-tab="SKILLS">Skills</button>
           <button class="hero-tab-btn" data-tab="EQUIP">Equip</button>
           <button class="hero-tab-btn" data-tab="STATS">Stats</button>
        </div>
        
        <div class="hero-body" id="hero-body-${index}">
           <!-- Dynamic Content -->
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
    const btnEquip = card.querySelector('[data-tab="EQUIP"]');

    const renderBody = (updateMode = false) => {
      // If updating, only touch DOM if needed. For Stats, we just rebuild for now (text).
      // For Skills, we build once, then update via updateHeroCard.

      if (!updateMode) bodyEl.innerHTML = ""; // Clear if full render, unless optimized update

      if (currentTab === "STATS") {
        if (!updateMode || bodyEl.innerHTML === "") {
          bodyEl.innerHTML = `
                <div class="stat-row"><span>Lv</span><span class="stat-lv-val">${char.stats.level}</span></div>

                <div class="stat-row"><span>STR</span><span style="color: #f87171">${char.stats.strength}</span></div>
                <div class="stat-row"><span>DEX</span><span style="color: #4ade80">${char.stats.dexterity}</span></div>
                <div class="stat-row"><span>INT</span><span style="color: #60a5fa">${char.stats.intelligence}</span></div>
              `;
        }
      } else if (currentTab === "SKILLS") {
        // Skills View
        if (!updateMode || bodyEl.innerHTML === "") {
          bodyEl.innerHTML = `
                ${Object.entries(char.skills)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([id, skill]) => {
                    const xpNeeded = skill.level * 100;
                    const percent = Math.min((skill.xp / xpNeeded) * 100, 100);
                    const name = id.charAt(0).toUpperCase() + id.slice(1);
                    return `
                    <div class="skill-row" id="skill-row-${index}-${id}" title="${skill.xp} / ${xpNeeded} XP">
                      <div class="skill-info">
                        <span class="skill-name">${name}</span>
                        <span class="skill-lvl" id="skill-lvl-${index}-${id}">Lv ${skill.level}</span>
                      </div>
                      <div class="skill-bar-bg">
                        <div class="skill-bar-fill ${id}" id="skill-fill-${index}-${id}" style="width: ${percent}%"></div>
                      </div>
                    </div>
                  `;
                  })
                  .join("")}
              `;
        }
      } else if (currentTab === "EQUIP") {
        if (!updateMode || bodyEl.innerHTML === "") {
          bodyEl.innerHTML = `
               <div class="equip-slots-mini" style="flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px;">
                  <div class="equip-slot-mini" title="Head">🧢</div>
                  <div class="equip-slot-mini" title="Chest">👕</div>
                  <div class="equip-slot-mini" title="Belt">🥋</div>
                  <div class="equip-slot-mini" title="Gloves">🧤</div>
                  <div class="equip-slot-mini" title="Legs">👖</div>
                  <div class="equip-slot-mini" title="Feet">👢</div>
                  <div class="equip-slot-mini" title="Main Hand">⚔️</div>
                  <div class="equip-slot-mini" title="Off Hand">🛡️</div>
               </div>
          `;
        }
      }
    };

    // Attach renderBody to card for external updates
    card._renderBody = renderBody;

    btnStats.addEventListener("click", () => {
      currentTab = "STATS";
      btnStats.classList.add("active");
      btnSkills.classList.remove("active");
      btnEquip.classList.remove("active");
      renderBody();
    });

    btnSkills.addEventListener("click", () => {
      currentTab = "SKILLS";
      btnSkills.classList.add("active");
      btnStats.classList.remove("active");
      btnEquip.classList.remove("active");
      renderBody();
    });

    btnEquip.addEventListener("click", () => {
      currentTab = "EQUIP";
      btnEquip.classList.add("active");
      btnStats.classList.remove("active");
      btnSkills.classList.remove("active");
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
                    <div class="equip-avatar-img" style="font-size: 128px; display: flex; justify-content: center; align-items: center;">👤</div>
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

            <!-- Far Right: Inventory Panel -->
            <div class="equip-inv-panel">
                <div class="equip-inv-header">Inventory</div>
                <div class="equip-inv-grid">
                    ${this.getInventoryHTML()}
                </div>
            </div>
        </div>
    `;
  }

  renderInvContent(container) {
    container.className = "mw-content inventory-grid";
    container.innerHTML = this.getInventoryHTML();
  }

  getInventoryHTML() {
    const items = gameState.inventory.items;
    const entries = Object.entries(items).filter(([_, count]) => count > 0);

    if (entries.length === 0) {
      return '<div class="empty-msg">No items</div>';
    } else {
      return entries
        .map(([id, count]) => {
          let icon = "🎒";
          if (id.includes("copper")) icon = "🪨";
          if (id.includes("wood")) icon = "🪵";
          if (id.includes("fish")) icon = "🐟";
          // Add more icons later

          return `
          <div class="inv-card" title="${id.replace(/_/g, " ")}">
            <div class="inv-card-icon">${icon}</div>
            <div class="inv-card-count">${count}</div>
          </div>
        `;
        })
        .join("");
    }
  }

  renderSkillContent(container) {
    container.className = "mw-content skills-modal-layout";
    const char = gameState.characters[this.selectedCharIndex];

    // Skill Categories Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "skills-category-sidebar";

    // Main Content Area
    const contentArea = document.createElement("div");
    contentArea.className = "skills-options-area";

    // State for internal tab selection (simple local var or instance var if persistence needed)
    // For now, default to mining or current persisted tab
    if (!this.activeSkillTab) this.activeSkillTab = "MINING";

    Object.values(SKILL_DEFINITIONS).forEach((skill) => {
      // Create Sidebar Item
      const tabBtn = document.createElement("div");
      tabBtn.className = `skill-category-tab ${
        this.activeSkillTab === skill.id ? "active" : ""
      }`;
      tabBtn.innerHTML = `
            <span class="tab-icon">${skill.icon}</span>
            <span class="tab-name">${skill.name}</span>
        `;

      tabBtn.addEventListener("click", () => {
        this.activeSkillTab = skill.id;
        this.renderMainWindow(); // Full re-render to update UI
      });

      sidebar.appendChild(tabBtn);
    });

    // Render Options for Active Tab
    const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
    if (activeSkill) {
      const header = document.createElement("div");
      header.className = "skills-options-header";
      const currentLvl =
        char && char.skills[activeSkill.id.toLowerCase()]
          ? char.skills[activeSkill.id.toLowerCase()].level
          : 1;
      header.innerHTML = `<h2>${activeSkill.icon} ${activeSkill.name} <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
      contentArea.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "skills-actions-grid";

      Object.entries(activeSkill.options).forEach(([key, opt]) => {
        const card = document.createElement("div");
        const isLocked = currentLvl < opt.level;
        card.className = `skill-action-card ${isLocked ? "locked" : ""}`;

        let iconHtml = `<div class="action-icon">${opt.icon || "❓"}</div>`;

        card.innerHTML = `
                ${iconHtml}
                <div class="action-details">
                    <div class="action-name">${opt.name}</div>
                    <div class="action-meta">
                        <span class="action-req">Req: Lv ${opt.level}</span>
                        <span class="action-xp">${opt.xp} XP</span>
                    </div>
                </div>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ""}
             `;

        if (!isLocked) {
          card.addEventListener("click", () => {
            this.handleStartActivity(activeSkill.id, key);
            this.renderMainWindow();
          });
        }

        grid.appendChild(card);
      });
      contentArea.appendChild(grid);
    }

    container.appendChild(sidebar);
    container.appendChild(contentArea);
  }

  renderSettingsContent(container) {
    container.className = "mw-content settings-panel";
    container.innerHTML = `
        <div class="setting-category">
            <h3>Gameplay</h3>
            <div class="setting-row">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="setting-label">Auto-Save</span>
                    <span id="autosave-timer" class="setting-note" style="font-size: 0.8em; color: #888; min-width: 80px; display: inline-block;"></span>
                </div>
                <input type="checkbox" id="setting-autosave">
            </div>
             <div class="setting-row" style="align-items: flex-start; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span class="setting-label">Notifications</span>
                    <input type="checkbox" id="setting-notifications-master">
                </div>
                <!-- Sub settings -->
                <div id="notif-sub-settings" style="display: flex; flex-direction: column; gap: 8px; padding-left: 20px; width: 100%; box-sizing: border-box; border-left: 2px solid rgba(255,255,255,0.1);">
                    <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Level Up</span>
                        <input type="checkbox" id="setting-notifications-levelup">
                    </div>
                    <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Activities</span>
                        <input type="checkbox" id="setting-notifications-activity">
                    </div>
                     <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Auto-Save Log</span>
                        <input type="checkbox" id="setting-notifications-autosave">
                    </div>
                </div>
            </div>
        </div>
        <div class="setting-category">
            <h3>Account</h3>
             <div class="setting-row" style="justify-content: center;">
               <button class="btn-setting" id="btn-save-game">Save Game</button>
            </div>
            <div class="setting-row">
               <button class="btn-setting danger" id="btn-reset-game">Reset Progress</button>
            </div>
        </div>
    `;

    setTimeout(() => {
      const btnSave = container.querySelector("#btn-save-game");
      const btnReset = container.querySelector("#btn-reset-game");
      const chkAutoSave = container.querySelector("#setting-autosave");
      const chkNotifMaster = container.querySelector(
        "#setting-notifications-master",
      );
      const chkNotifLevelUp = container.querySelector(
        "#setting-notifications-levelup",
      );
      const chkNotifActivity = container.querySelector(
        "#setting-notifications-activity",
      );
      const chkNotifAutoSave = container.querySelector(
        "#setting-notifications-autosave",
      );
      const timerSpan = container.querySelector("#autosave-timer");

      // Clear previous interval if any
      if (this.settingsInterval) clearInterval(this.settingsInterval);

      if (chkAutoSave) {
        chkAutoSave.checked = gameState.settings.autoSave;

        const updateTimer = () => {
          if (!gameState.settings.autoSave) {
            timerSpan.innerText = "(Paused)";
            return;
          }
          const left = Math.max(
            0,
            Math.ceil((gameState.nextAutoSaveTime - Date.now()) / 1000),
          );
          timerSpan.innerText = `(Next in ${left}s)`;
        };

        // Initial call
        updateTimer();

        // Start Interval
        this.settingsInterval = setInterval(updateTimer, 1000);

        chkAutoSave.addEventListener("change", (e) => {
          gameState.toggleAutoSave(e.target.checked);
          updateTimer(); // Update immediately
        });
      }

      // Notification Handlers
      if (chkNotifMaster) {
        // Safety: ensure notifications object exists (legacy migration handled in load, but just in case)
        if (!gameState.settings.notifications) {
          gameState.settings.notifications = {
            master: true,
            levelUp: true,
            activity: true,
            autoSave: true,
          };
        }

        chkNotifMaster.checked = gameState.settings.notifications.master;
        chkNotifLevelUp.checked = gameState.settings.notifications.levelUp;
        chkNotifActivity.checked = gameState.settings.notifications.activity;
        chkNotifAutoSave.checked = gameState.settings.notifications.autoSave;

        const toggleSub = (disabled) => {
          const subDiv = container.querySelector("#notif-sub-settings");
          if (disabled) {
            subDiv.style.opacity = 0.5;
            subDiv.style.pointerEvents = "none";
          } else {
            subDiv.style.opacity = 1;
            subDiv.style.pointerEvents = "auto";
          }
        };

        toggleSub(!chkNotifMaster.checked);

        chkNotifMaster.addEventListener("change", (e) => {
          gameState.toggleNotifications(e.target.checked, "master");
          toggleSub(!e.target.checked);
        });

        chkNotifLevelUp.addEventListener("change", (e) =>
          gameState.toggleNotifications(e.target.checked, "levelUp"),
        );
        chkNotifActivity.addEventListener("change", (e) =>
          gameState.toggleNotifications(e.target.checked, "activity"),
        );
        chkNotifAutoSave.addEventListener("change", (e) =>
          gameState.toggleNotifications(e.target.checked, "autoSave"),
        );
      }

      if (btnSave) {
        btnSave.addEventListener("click", () => {
          if (gameState.saveGame()) {
            alert("Game Saved!");
          }
        });
      }

      if (btnReset) {
        btnReset.addEventListener("click", () => {
          if (confirm("Are you sure you want to reset ALL progress?")) {
            gameState.resetGame();
          }
        });
      }
    }, 0);
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
    // Refresh Inv if active
    if (this.currentView === "INV") {
      const contentEl = this.mainWindow.querySelector("#mw-content");
      if (contentEl) {
        // Simple re-render to catch count updates
        // Optimized: only if item count changed? For now, re-render is cheap
        this.renderInvContent(contentEl); // Re-run render
      }
    } else if (this.currentView === "HEROES") {
      const contentEl = this.mainWindow.querySelector(".mw-content");
      if (contentEl) {
        // Delegates to updateHeroCard internally if grid exists
        this.renderHeroesContent(contentEl);
      }
    }
  }
}

export const uiManager = new UIManager();
