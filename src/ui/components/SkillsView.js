import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeSkillTab = "MINING";
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
            this.uiManager.handleStartActivity(activeSkill.id, key);
            this.uiManager.renderMainWindow();
          });
        }

        grid.appendChild(card);
      });
      contentArea.appendChild(grid);
    }

    container.appendChild(sidebar);
    container.appendChild(contentArea);
  }
}
