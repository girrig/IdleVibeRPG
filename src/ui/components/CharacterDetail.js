import { gameState } from "../../core/GameState";
import { UI_COLORS } from "../../core/Constants";
import { CharacterTasksPanel } from "./panels/CharacterTasksPanel";
import { CharacterAttributesPanel } from "./panels/CharacterAttributesPanel";
import { CharacterEquipmentPanel } from "./panels/CharacterEquipmentPanel";
import { CharacterSkillsPanel } from "./panels/CharacterSkillsPanel";

export class CharacterDetail {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  render(container) {
    container.className = "mw-content char-split-layout";
    const charIndex = this.uiManager.selectedCharIndex;

    // Sidebar for Characters
    const sidebar = document.createElement("div");
    sidebar.className = "char-sidebar-list";

    // Character List Items
    gameState.characters.forEach((char, index) => {
      const item = document.createElement("div");
      item.id = `char-list-item-${index}`;
      item.className = `char-list-item ${index === charIndex ? "active" : ""}`;

      // Determine status badge
      const activity = char.currentActivity
        ? char.currentActivity.type
        : "Idle";

      const badgeColor = char.currentActivity
        ? "rgba(251, 191, 36, 0.2)" // Gold low opacity
        : "rgba(148, 163, 184, 0.2)"; // Slate low opacity
      const badgeTextColor = char.currentActivity
        ? UI_COLORS.STATUS_ACTIVE
        : UI_COLORS.STATUS_IDLE;

      item.innerHTML = `
            <div class="char-list-avatar">👤</div>
            <div class="char-list-info">
                <div class="char-list-name">${char.name}</div>
                <div class="char-list-status">Lv ${char.stats.level} ${char.type}</div>
            </div>
            <div class="char-list-badge" style="background: ${badgeColor}; color: ${badgeTextColor};">${activity}</div>
        `;
      item.addEventListener("click", () => {
        this.uiManager.selectedCharIndex = index;
        this.uiManager.renderMainWindow(); // Full Re-render
      });
      sidebar.appendChild(item);
    });

    // Recruit Button
    if (gameState.characters.length < 8) {
      const recruitBtn = document.createElement("div");
      recruitBtn.className = "char-list-item recruit";
      recruitBtn.innerHTML = `
             <div class="char-list-avatar" style="background:transparent; border: 1px dashed #666;">+</div>
             <div class="char-list-info">
                <div class="char-list-name">Recruit New</div>
             </div>
        `;
      recruitBtn.addEventListener("click", () => {
        if (gameState.recruitCharacter()) {
          this.uiManager.renderMainWindow();
        }
      });
      sidebar.appendChild(recruitBtn);
    }

    container.appendChild(sidebar);

    // Detail Panel
    const detailPanel = document.createElement("div");
    detailPanel.className = "char-detail-panel";

    const char = gameState.characters[charIndex];
    if (char) {
      this.renderDetailContent(detailPanel, char);
    }

    container.appendChild(detailPanel);
  }

  renderDetailContent(container, char) {
    // Header
    const header = document.createElement("div");
    header.className = "char-detail-header";
    header.innerHTML = `
        <div class="char-detail-avatar">👤</div>
        <div class="char-detail-title">
            <h2>${char.name}</h2>
            <span>Level ${char.stats.level} ${char.type}</span>
        </div>
        <div class="char-header-stats" style="margin-left: auto; display: flex; gap: 15px; align-items: center;">
             <div class="stat-pill char-header-stat-str" style="background:rgba(239, 68, 68, 0.15); color:#fca5a5; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid rgba(239, 68, 68, 0.3);">STR ${char.stats.strength}</div>
             <div class="stat-pill char-header-stat-dex" style="background:rgba(34, 197, 94, 0.15); color:#86efac; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid rgba(34, 197, 94, 0.3);">DEX ${char.stats.dexterity}</div>
             <div class="stat-pill char-header-stat-int" style="background:rgba(59, 130, 246, 0.15); color:#93c5fd; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid rgba(59, 130, 246, 0.3);">INT ${char.stats.intelligence}</div>
        </div>
    `;
    container.appendChild(header);

    // Dashboard Grid
    const dashboard = document.createElement("div");
    dashboard.className = "char-dashboard-layout";
    container.appendChild(dashboard);

    // -- LEFT COLUMN (Main) --
    // Now takes full width
    const leftCol = document.createElement("div");
    leftCol.className = "dash-col-main";
    leftCol.style.flex = "1"; // Take full space
    dashboard.appendChild(leftCol);

    // -- RIGHT COLUMN (Side) --
    const rightCol = document.createElement("div");
    rightCol.className = "dash-col-side";
    dashboard.appendChild(rightCol);

    // 1. Goal Section
    CharacterTasksPanel.render(leftCol, char, this.uiManager);

    // 2. Equipment Section
    CharacterEquipmentPanel.render(rightCol, char);

    // 3. Skills Section
    CharacterSkillsPanel.render(rightCol, char);
  }

  static updateContent(container, uiManager) {
    const char = gameState.characters[uiManager.selectedCharIndex];
    if (!char) return;

    // Update Sidebar Status
    gameState.characters.forEach((c, i) => {
      const item = container.querySelector(`#char-list-item-${i}`);
      if (item) {
        const status = item.querySelector(".char-list-status");
        if (status) status.innerText = `Lv ${c.stats.level} ${c.type}`;

        // Update Badge
        const badge = item.querySelector(".char-list-badge");
        if (badge) {
          const activity = c.currentActivity ? c.currentActivity.type : "Idle";
          const badgeColor = c.currentActivity
            ? "rgba(251, 191, 36, 0.2)"
            : "rgba(148, 163, 184, 0.2)";
          const badgeTextColor = c.currentActivity
            ? UI_COLORS.STATUS_ACTIVE
            : UI_COLORS.STATUS_IDLE;

          badge.style.background = badgeColor;
          badge.style.color = badgeTextColor;
          badge.innerText = activity;
        }

        if (i === uiManager.selectedCharIndex) item.classList.add("active");
        else item.classList.remove("active");
      }
    });

    // Update Detail Header
    const lvlSpan = container.querySelector(".char-detail-title span");
    if (lvlSpan) lvlSpan.innerText = `Level ${char.stats.level} ${char.type}`;

    // Update Header Stats
    const strEl = container.querySelector(".char-header-stat-str");
    if (strEl) strEl.innerText = `STR ${char.stats.strength}`;
    const dexEl = container.querySelector(".char-header-stat-dex");
    if (dexEl) dexEl.innerText = `DEX ${char.stats.dexterity}`;
    const intEl = container.querySelector(".char-header-stat-int");
    if (intEl) intEl.innerText = `INT ${char.stats.intelligence}`;

    // Update Sub-Panels
    CharacterTasksPanel.update(container, char, uiManager);
    CharacterSkillsPanel.update(container, char);
    CharacterEquipmentPanel.update(container, char);
  }
}
