import { gameState } from "../../core/GameState";
import { TALENT_DEFINITIONS } from "../../core/TalentRegistry";

export class TalentsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.uiManager = uiManager;
    this.activeCategory = "Fighting";
    this.categories = [
      { id: "Fighting", label: "Fighting", icon: "⚔️", columns: [6] },
      { id: "Fishing", label: "Fishing", icon: "🎣", columns: [5] },
      { id: "Mining", label: "Mining", icon: "⛏️", columns: [3] },
      { id: "Woodcutting", label: "Woodcutting", icon: "🪓", columns: [4] },
    ];
  }

  render(container) {
    container.className = "mw-content talent-tree-layout";
    const char = gameState.characters[this.uiManager.selectedCharIndex];
    if (!char) return;

    let pointLabel = "Attribute Points";
    let pointValue = char.talentPoints;

    const skillMap = {
      Mining: "mining",
      Woodcutting: "woodcutting",
      Fishing: "fishing",
      Fighting: "fighting",
    };

    if (this.activeCategory !== "Attributes") {
      const skillKey = skillMap[this.activeCategory];
      if (skillKey && char.skills[skillKey]) {
        pointLabel = `${this.activeCategory} Points`;
        pointValue = char.skills[skillKey].talentPoints || 0;
      }
    }

    container.innerHTML = `
        <div class="talents-body">
            <div class="talents-sidebar">
                <div class="sidebar-points-display">
                    ${pointLabel}: <span class="points-val">${pointValue}</span>
                </div>
                ${this.categories
                  .map(
                    (cat) => `
                    <div class="talent-sidebar-item ${this.activeCategory === cat.id ? "active" : ""}" data-category="${cat.id}">
                        <span class="tab-icon">${cat.icon}</span>
                        <span class="tab-name">${cat.label}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
            <div class="talents-main">
                <div class="talents-grid">
                    ${this.renderTalentColumns(char)}
                </div>
            </div>
        </div>
      `;

    // bind events
    // Sidebar clicks
    container.querySelectorAll(".talent-sidebar-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.activeCategory = item.dataset.category;
        this.render(container); // Re-render to show new category
      });
    });

    // Talent clicks
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
    const activeCatDef = this.categories.find(
      (c) => c.id === this.activeCategory,
    );
    const validCols = activeCatDef ? activeCatDef.columns : [];

    const headers = [
      "Strength",
      "Dexterity",
      "Intelligence",
      "Mining",
      "Woodcutting",
      "Fishing",
      "Fighting",
    ];

    // Collect talents for active columns
    const cols = [];
    Object.values(TALENT_DEFINITIONS).forEach((def) => {
      if (
        def.position &&
        def.position.col !== undefined &&
        validCols.includes(def.position.col)
      ) {
        if (!cols[def.position.col]) cols[def.position.col] = [];
        cols[def.position.col].push(def);
      }
    });

    return validCols
      .map((colIndex) => {
        const colTalents = cols[colIndex] || [];
        return `
            <div class="talent-col">
                <div class="talent-col-header">${headers[colIndex] || "Unknown"}</div>
                ${colTalents
                  .sort((a, b) => a.position.row - b.position.row)
                  .map((def) => {
                    const unlocked = char.talents[def.id];
                    const prereqMet = def.prerequisites.every(
                      (id) => char.talents[id],
                    );
                    const affordable = char.talentPoints >= def.cost;
                    const locked = !unlocked && (!prereqMet || !affordable);

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
