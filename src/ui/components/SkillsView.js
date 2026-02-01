import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { getItemDefinition } from "../../core/ItemRegistry";
import { UI_COLORS, GAME_CONFIG } from "../../core/Constants";

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeSkillTab = null;
  }

  render(container) {
    container.className = "mw-content skills-modal-layout";
    const char = gameState.characters[this.uiManager.selectedCharIndex];

    // Skill Categories Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "skills-category-sidebar";

    // Main Content Area
    const contentArea = document.createElement("div");
    contentArea.className = "skills-options-area";

    container.appendChild(sidebar);
    container.appendChild(contentArea);

    const sortedSkills = Object.values(SKILL_DEFINITIONS).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // Ensure active tab defaults to the first skill in the sorted list if not set
    if (!this.activeSkillTab && sortedSkills.length > 0) {
      this.activeSkillTab = sortedSkills[0].id;
    }

    sortedSkills.forEach((skill) => {
      // Create Sidebar Item
      const tabBtn = document.createElement("div");
      const isActive = this.activeSkillTab === skill.id;
      tabBtn.className = `skill-category-tab ${isActive ? "active" : ""}`;
      // Apply color if active
      if (isActive && skill.color) {
        tabBtn.style.borderColor = skill.color;
        tabBtn.style.color = skill.color;
        // Background handled by CSS class, or we can tint it too
        tabBtn.style.background = `rgba(${this.hexToRgb(skill.color)}, 0.15)`;
      } else {
        // Reset styles for inactive
        tabBtn.style.borderColor = "";
        tabBtn.style.color = "";
        tabBtn.style.background = "";
      }

      tabBtn.innerHTML = `
            <span class="tab-icon">${skill.icon}</span>
            <span class="tab-name">${skill.name}</span>
        `;

      tabBtn.addEventListener("click", () => {
        this.activeSkillTab = skill.id;
        this.uiManager.renderMainWindow(); // Full re-render to update UI
      });

      sidebar.appendChild(tabBtn);
    });

    const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];

    if (!activeSkill) {
      console.error("Active skill not found:", this.activeSkillTab);
      // Fallback or just Reset
      if (sortedSkills.length > 0) {
        this.activeSkillTab = sortedSkills[0].id;
        // Retry once immediately or just let next render handle it? 
        // Let's just return and hope next click fixes or recursive call?
        // Safer to just show error.
        container.innerHTML = `<div class="error">Skill not found: ${this.activeSkillTab}</div>`;
        return;
      }
    }

    try {
      if (activeSkill.id === "EXPLORING") {
        this.renderExplorationView(contentArea, activeSkill, char);
      } else {
        this.renderGenericSkillView(contentArea, activeSkill, char);
      }
    } catch (err) {
      console.error("Error rendering skill view:", err);
      contentArea.innerHTML = `<div class="error" style="color:red; padding:20px;">
        <h3>Error Rendering Skill</h3>
        <pre>${err.message}\n${err.stack}</pre>
      </div>`;
    }
  }

  renderGenericSkillView(container, activeSkill, char) {
    const currentLvl =
      char && char.skills[activeSkill.id.toLowerCase()]
        ? char.skills[activeSkill.id.toLowerCase()].level
        : 1;

    const header = document.createElement("div");
    header.className = "skills-options-header";

    // Header Style
    const colorStyle = activeSkill.color
      ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"`
      : "";

    header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    // Grid for options
    const grid = document.createElement("div");
    grid.className = "skills-actions-grid";

    Object.entries(activeSkill.options).forEach(([key, opt]) => {
      this.renderSkillCard(grid, key, opt, currentLvl, activeSkill);
    });

    container.appendChild(grid);
  }

  renderExplorationView(container, activeSkill, char) {
    const currentLvl = char && char.skills.exploring ? char.skills.exploring.level : 1;

    // --- Header ---
    const header = document.createElement("div");
    header.className = "skills-options-header";
    header.style.color = activeSkill.color;
    header.style.borderBottomColor = activeSkill.color;
    header.innerHTML = `<h2>${activeSkill.icon} ${activeSkill.name} <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    const scrollContainer = document.createElement("div");
    scrollContainer.className = "exploration-container";

    // --- 1. Wander Section (Expansion) ---
    const wanderTitle = document.createElement("div");
    wanderTitle.className = "exploration-section-title";
    wanderTitle.innerText = "Map Expansion";
    scrollContainer.appendChild(wanderTitle);

    const wanderContainer = document.createElement("div");
    wanderContainer.className = "wander-options-container";

    // Expansion Card
    const expOpt = activeSkill.options.wander_expansion;
    if (expOpt) {
      const card = document.createElement("div");
      card.className = "wander-card safe"; // Expansion is generally safe/low risk
      card.innerHTML = `
        <div class="wander-icon">${expOpt.icon}</div>
        <div class="wander-content">
            <div class="wander-title">${expOpt.name}</div>
            <div class="wander-desc">${expOpt.description}</div>
        </div>
        <div class="wander-stats">
            <span>XP: ${expOpt.xp}</span>
        </div>
      `;
      // Read-Only: No click handler
      wanderContainer.appendChild(card);
    }
    scrollContainer.appendChild(wanderContainer);


    // --- 2. Biome Discovery Section ---
    const discoveryTitle = document.createElement("div");
    discoveryTitle.className = "exploration-section-title";
    discoveryTitle.innerText = "Biome Discovery";
    discoveryTitle.style.marginTop = "20px";
    scrollContainer.appendChild(discoveryTitle);

    const biomeGrid = document.createElement("div");
    biomeGrid.className = "expeditions-grid";

    // Filter only "find_" options
    Object.entries(activeSkill.options).forEach(([key, opt]) => {
      if (!key.startsWith("find_")) return;

      const isLocked = currentLvl < opt.level;
      const card = document.createElement("div");
      card.className = `biome-card ${isLocked ? "locked-overlay" : ""}`;

      card.innerHTML = `
        <div class="biome-icon">${opt.icon}</div>
          <div class="biome-info">
            <div class="biome-name">${opt.name}</div>
            <div class="biome-level">Lvl ${opt.level} • ${opt.xp} XP</div>
          </div>
            ${isLocked ? '<div style="margin-left:auto;">🔒</div>' : ''}
      `;

      // Read-Only: No click handler

      biomeGrid.appendChild(card);
    });

    scrollContainer.appendChild(biomeGrid);
    container.appendChild(scrollContainer);
  }

  // Refactored helper to prevent duplication in Generic View
  renderSkillCard(container, key, opt, currentLvl, activeSkill) {
    const card = document.createElement("div");
    const isLocked = currentLvl < opt.level;
    card.className = `skill-action-card ${isLocked ? "locked" : ""}`;

    let iconHtml = `<div class="action-icon">${opt.icon || "❓"}</div>`;

    let costHtml = "";
    if (opt.cost) {
      const costStr = Object.entries(opt.cost)
        .map(([id, qty]) => {
          const iDef = getItemDefinition(id);
          return `${qty} ${iDef.name}`;
        })
        .join(", ");
      costHtml = `<div class="action-cost" style="font-size: 0.8em; color: ${UI_COLORS.COST};">Requires: ${costStr}</div>`;
    }

    // Available World Resource Check (for Woodcuttin/Mining/etc)
    let availableHtml = "";
    const targetResources = ["WOODCUTTING", "MINING", "FISHING"]; // Skills that gather from world
    if (targetResources.includes(activeSkill.id) && key) { // Check key is simple resource ID often
      // Actually, key is often the resource ID (oak_log, copper_ore)
      // Let's verify if gameState has any record of it.
      const avail = gameState.getAvailableResourceCount(key);
      // Only show if it's relevant (non-zero or matching type)
      // Or always show "World: 0" if it's a gatherable?
      // Let's show it prominently.
      availableHtml = `<div class="action-available" style="font-size: 0.9em; margin-top: 4px; color: #888;">
            World: <span class="avail-count" data-res-id="${key}" style="color: ${avail > 0 ? '#4ade80' : '#f87171'}">${avail}</span>
        </div>`;
    }

    card.innerHTML = `
              ${iconHtml}
      <div class="action-details">
        <div class="action-name">${opt.name}</div>
        <div class="action-meta">
          <span class="action-req">Req: Lv ${opt.level}</span>
          <span class="action-xp">${opt.xp} XP</span>
          <span class="action-time">⏱️ ${(opt.interval || activeSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL) / 1000}s</span>
        </div>
        ${availableHtml}
        ${costHtml}
      </div>
              ${isLocked ? '<div class="lock-overlay">🔒</div>' : ""}
      `;

    // Click handler for task starting
    card.addEventListener("click", () => {
      if (!isLocked) {
        const char = gameState.characters[this.uiManager.selectedCharIndex];
        // start task...
        this.uiManager.handleSkillAction(activeSkill.id, key);
      }
    });

    container.appendChild(card);
  }

  update(container) {
    if (!this.activeSkillTab) return;

    // Delegate update based on type
    if (this.activeSkillTab === 'EXPLORING') {
      const char = gameState.characters[this.uiManager.selectedCharIndex];
      const currentLvl = char ? char.skills.exploring.level : 1;
      // Simple full re-render for Exploration to handle locks easily or just update text?
      // Updating text is better for performance, but structure is different.
      // For simplicity in this refactor, we just update locks in Biome Grid.

      const headerLvl = container.querySelector(".header-lvl");
      if (headerLvl) headerLvl.innerText = `Lvl ${currentLvl} `;

      // Update Biome Cards
      const activeSkill = SKILL_DEFINITIONS['EXPLORING'];
      const cards = container.querySelectorAll(".biome-card");
      let idx = 0;
      Object.entries(activeSkill.options).forEach(([key, opt]) => {
        if (!key.startsWith("find_")) return;
        if (idx >= cards.length) return;

        const card = cards[idx];
        const isLocked = currentLvl < opt.level;

        if (isLocked) {
          if (!card.classList.contains("locked-overlay")) {
            card.classList.add("locked-overlay");
            // Re-add lock icon if missing? logic handled in render, 
            // but dynamic updates might need clearing innerHTML.
            // Validating if this is sufficient.
          }
        } else {
          card.classList.remove("locked-overlay");
          // Remove lock icon if present
          // Ideally we re-render or toggle visibility. 
          // For now, let's trust the re-render on level up or click? 
          // update() is called on game ticks?
        }
        idx++;
      });

    } else {
      // Generic Update
      const headerLvl = container.querySelector(".header-lvl");
      const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
      const char = gameState.characters[this.uiManager.selectedCharIndex];

      if (activeSkill && char) {
        const currentLvl = char.skills[activeSkill.id.toLowerCase()]?.level || 1;
        if (headerLvl) headerLvl.innerText = `Lvl ${currentLvl} `;

        const cards = container.querySelectorAll(".skill-action-card");
        let cardIndex = 0;
        Object.entries(activeSkill.options).forEach(([key, opt]) => {
          if (cardIndex >= cards.length) return;
          const card = cards[cardIndex];

          // Update Available Count
          const availSpan = card.querySelector(".avail-count");
          if (availSpan) {
            const resId = availSpan.getAttribute("data-res-id");
            if (resId) {
              const avail = gameState.getAvailableResourceCount(resId);
              availSpan.innerText = avail;
              availSpan.style.color = avail > 0 ? '#4ade80' : '#f87171';
            }
          }

          const isLocked = currentLvl < opt.level;
          if (isLocked) {
            card.classList.add("locked");
            if (!card.querySelector(".lock-overlay")) {
              const overlay = document.createElement("div");
              overlay.className = "lock-overlay";
              overlay.innerText = "🔒";
              card.appendChild(overlay);
            }
          } else {
            card.classList.remove("locked");
            const overlay = card.querySelector(".lock-overlay");
            if (overlay) overlay.remove();
          }
          cardIndex++;
        });
      }
    }
  }

  // Helper
  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)} `
      : "255, 255, 255";
  }
}
