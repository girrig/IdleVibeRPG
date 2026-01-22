import { CharacterAttributesPanel } from "./panels/CharacterAttributesPanel";
import { CharacterEquipmentPanel } from "./panels/CharacterEquipmentPanel";
import { CharacterSkillsPanel } from "./panels/CharacterSkillsPanel";
import { gameState } from "../../core/GameState";

export class CharacterSummarySidebar {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  render(container) {
    container.innerHTML = "";
    container.className = "hud-panel right-sidebar";

    const charIndex = this.uiManager.selectedCharIndex;
    const char = gameState.characters[charIndex];

    if (!char) {
      container.innerHTML = `<div style="padding: 20px; color: #aaa;">No Character Selected</div>`;
      return;
    }

    // Header / Name
    const header = document.createElement("div");
    header.className = "sidebar-char-header";
    header.innerHTML = `
        <div class="sidebar-avatar">👤</div>
        <div class="sidebar-info">
            <div class="name">${char.name}</div>
            <div class="meta">Lv ${char.stats.level} ${char.type}</div>
        </div>
    `;
    container.appendChild(header);

    // Attributes
    CharacterAttributesPanel.render(container, char);

    // Skills
    CharacterSkillsPanel.render(container, char);

    // Equipment
    CharacterEquipmentPanel.render(container, char);

    // Add logic to refresh equipment if needed on update
  }

  update(container) {
    // similar to render loop but optimized?
    // For now, simpler to just re-call sub-component updates.
    // But sub-components expect their *own parent* usually.
    // Actually my panels append themselves.
    // So update() in panels usually expects the CONTAINER and finds the child.

    const charIndex = this.uiManager.selectedCharIndex;
    const char = gameState.characters[charIndex];
    if (!char) return;

    // Update Header
    const nameEl = container.querySelector(".sidebar-info .name");
    if (nameEl) nameEl.innerText = char.name;
    const metaEl = container.querySelector(".sidebar-info .meta");
    if (metaEl) metaEl.innerText = `Lv ${char.stats.level} ${char.type}`;

    // Update Sub-panels
    CharacterAttributesPanel.update(container, char);
    CharacterSkillsPanel.update(container, char);
    CharacterEquipmentPanel.update(container, char);
  }
}
