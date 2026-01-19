import { gameState } from "../../core/GameState";
import { TALENT_DEFINITIONS } from "../../core/TalentRegistry";

export class TalentsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.uiManager = uiManager;
    this.activeCategory = "Fighting";
    this.categories = [
      { id: "Fighting", label: "Fighting", icon: "⚔️", columns: [6, 7] },
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
                <div class="main-points-display">
                    ${pointLabel}: <span class="points-val">${pointValue}</span>
                </div>
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

        if (char.talents[id]) {
          // Already unlocked -> Refund
          if (char.refundTalent(id)) {
            gameState.saveGame();
            this.uiManager.renderMainWindow();
          }
        } else {
          // Locked -> Unlock
          if (char.unlockTalent(id)) {
            gameState.saveGame(); // optimize later
            this.uiManager.renderMainWindow();
          }
        }
      });
    });

    // Draw connectors after a brief delay to ensure layout is settled
    setTimeout(() => this.drawConnectors(), 0);
    // Also redraw on window resize
    window.addEventListener("resize", () => this.drawConnectors());
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
      "Fighting (Offense)",
      "Fighting (Defense)",
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

    // Render columns
    const columnsHtml = validCols
      .map((colIndex) => {
        const colTalents = cols[colIndex] || [];
        return `
            <div class="talent-col" data-col="${colIndex}">
                <div class="talent-col-header">${headers[colIndex] || "Unknown"}</div>
                ${colTalents
                  .sort((a, b) => a.position.row - b.position.row)
                  .map((def) => {
                    const unlocked = char.talents[def.id];
                    const prereqMet = def.prerequisites.every(
                      (id) => char.talents[id],
                    );
                    const affordable = char.talentPoints >= def.cost;

                    let statusClass = "locked";
                    if (unlocked) statusClass = "unlocked";
                    else if (prereqMet) statusClass = "available";

                    if (unlocked) statusClass += " purchased";

                    return `
                        <div class="talent-node-wrapper">
                            <div class="talent-node ${statusClass}" id="talent-node-${def.id}" data-id="${def.id}" title="${def.name}: ${def.description} (Cost: ${def.cost})">
                                <div class="talent-icon">${def.icon}</div>
                                <div class="talent-name">${def.name}</div>
                                ${unlocked ? '<div class="check">✔</div>' : ""}
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
          `;
      })
      .join("");

    return `
        <svg class="talent-connections-svg"></svg>
        ${columnsHtml}
      `;
  }

  drawConnectors() {
    const svg = document.querySelector(".talent-connections-svg");
    if (!svg) return;

    // Clear existing
    svg.innerHTML = "";

    // Set SVG size to match grid scroll area
    const grid = document.querySelector(".talents-grid");
    if (!grid) return;

    svg.setAttribute("width", grid.scrollWidth);
    svg.setAttribute("height", grid.scrollHeight);

    const char = gameState.characters[this.uiManager.selectedCharIndex];
    if (!char) return;

    Object.values(TALENT_DEFINITIONS).forEach((def) => {
      const node = document.getElementById(`talent-node-${def.id}`);
      // Only draw for visible nodes
      if (!node) return;

      def.prerequisites.forEach((preId) => {
        const preNode = document.getElementById(`talent-node-${preId}`);
        if (preNode) {
          this.drawConnectorLine(
            svg,
            preNode,
            node,
            char.talents[def.id] || false,
          );
        }
      });
    });
  }

  drawConnectorLine(svg, startEl, endEl, isUnlocked) {
    const gridRect = document
      .querySelector(".talents-grid")
      .getBoundingClientRect();
    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // Calculate center points relative to the grid container
    // We add scroll values because the SVG covers the full scrollable area
    const gridScrollLeft = document.querySelector(".talents-grid").scrollLeft;
    const gridScrollTop = document.querySelector(".talents-grid").scrollTop;

    const x1 =
      startRect.left - gridRect.left + startRect.width / 2 + gridScrollLeft;
    const y1 =
      startRect.top - gridRect.top + startRect.height / 2 + gridScrollTop;
    const x2 =
      endRect.left - gridRect.left + endRect.width / 2 + gridScrollLeft;
    const y2 = endRect.top - gridRect.top + endRect.height / 2 + gridScrollTop;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", isUnlocked ? "#4ade80" : "#444");
    line.setAttribute("stroke-width", "3");

    svg.appendChild(line);
  }
}
