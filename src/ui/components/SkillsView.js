import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { getItemDefinition } from "../../core/ItemRegistry";

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeSkillTab = "FIGHTING";
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

    // Ensure active tab defaults if not set
    if (!this.activeSkillTab) this.activeSkillTab = "FIGHTING";

    const sortedSkills = Object.values(SKILL_DEFINITIONS).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

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

    // Render Options for Active Tab
    const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
    if (activeSkill) {
      const header = document.createElement("div");
      header.className = "skills-options-header";
      const currentLvl =
        char && char.skills[activeSkill.id.toLowerCase()]
          ? char.skills[activeSkill.id.toLowerCase()].level
          : 1;
      const colorStyle = activeSkill.color
        ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"`
        : "";

      header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
      // Also apply border color to the container header div if we want
      if (activeSkill.color) header.style.borderBottomColor = activeSkill.color;

      contentArea.appendChild(header);

      const grid = document.createElement("div");
      grid.className = "skills-actions-grid";

      Object.entries(activeSkill.options).forEach(([key, opt]) => {
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
          costHtml = `<div class="action-cost" style="font-size: 0.8em; color: #ffab40;">Requires: ${costStr}</div>`;
        }

        card.innerHTML = `
                ${iconHtml}
                <div class="action-details">
                    <div class="action-name">${opt.name}</div>
                    <div class="action-meta">
                        <span class="action-req">Req: Lv ${opt.level}</span>
                        <span class="action-xp">${opt.xp} XP</span>
                        <span class="action-time">⏱️ ${(opt.interval || activeSkill.interval || 3000) / 1000}s</span>
                    </div>
                    ${costHtml}
                </div>
                ${isLocked ? '<div class="lock-overlay">🔒</div>' : ""}
             `;

        if (!isLocked) {
          card.addEventListener("click", () => {
            this.uiManager.handleStartActivity(activeSkill.id, key);
            this.uiManager.renderMainWindow();
          });
          card.dataset.hasListener = "true";
        }

        grid.appendChild(card);
      });
      contentArea.appendChild(grid);
    }

    container.appendChild(sidebar);
    container.appendChild(contentArea);
  }

  update(container) {
    if (!this.activeSkillTab) return;

    // Find the header level element
    const headerLvl = container.querySelector(".header-lvl");
    const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
    const char = gameState.characters[this.uiManager.selectedCharIndex];

    if (activeSkill && char) {
      const currentLvl = char.skills[activeSkill.id.toLowerCase()]?.level || 1;

      // Update Header Text
      if (headerLvl) {
        headerLvl.innerText = `Lvl ${currentLvl}`;
      }

      // Update Card Locks
      const cards = container.querySelectorAll(".skill-action-card");
      let cardIndex = 0;
      Object.entries(activeSkill.options).forEach(([key, opt]) => {
        if (cardIndex >= cards.length) return;
        const card = cards[cardIndex];
        const isLocked = currentLvl < opt.level;

        // Toggle locked class
        if (isLocked) {
          card.classList.add("locked");
          if (!card.querySelector(".lock-overlay")) {
            // Re-add lock overlay if missing
            const overlay = document.createElement("div");
            overlay.className = "lock-overlay";
            overlay.innerText = "🔒";
            card.appendChild(overlay);

            // Remove click listener if needed (though difficult to remove anonymous fn,
            // css pointer-events: none usually handles this for locked items or we can clone node)
          }
        } else {
          card.classList.remove("locked");
          const overlay = card.querySelector(".lock-overlay");
          if (overlay) overlay.remove();

          // Re-binding click listener is tricky if we don't track it.
          // A safer full re-render approach might be needed if we want to enable clicking on unlock.
          // BUT, for now, let's just assume the user will likely switch tabs or we can just attach the listener
          // initially but gate it logic-wise?
          // Actually, the initial render adds listener ONLY if !isLocked.
          // So if it unlocks, we need to add the listener.
          // Simplest fix for "Unlock on the fly" without full re-render:
          // Just verify if it HAS a listener.
          // Actually, cloning the node to strip listeners and re-adding is a nuclear option.
          // Let's rely on checking if it WAS locked.

          if (!card.dataset.hasListener) {
            card.addEventListener("click", () => {
              if (card.classList.contains("locked")) return; // double check
              this.uiManager.handleStartActivity(activeSkill.id, key);
              this.uiManager.renderMainWindow();
            });
            card.dataset.hasListener = "true";
          }
        }
        cardIndex++;
      });
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
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "255, 255, 255";
  }
}
