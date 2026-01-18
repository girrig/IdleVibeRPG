import { gameState } from "../../core/GameState";
import { TALENT_DEFINITIONS } from "../../core/TalentRegistry";

export class TalentsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  render(container) {
    container.className = "mw-content talent-tree-layout";
    const char = gameState.characters[this.uiManager.selectedCharIndex];
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
          this.uiManager.renderMainWindow();
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
}
