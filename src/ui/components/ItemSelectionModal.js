import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";
import { sourceRegistry } from "../../core/SourceRegistry";
import { SKILL_DEFINITIONS, ITEM_TO_NODE_MAP } from "../../core/SkillRegistry";

export class ItemSelectionModal {
    constructor(character, onSelect, gameState) {
        this.character = character;
        this.onSelect = onSelect;
        this.gameState = gameState;
        this.modal = null;
        this.activeTab = "ITEMS";
        this.searchTerm = "";
        this.currentQty = 1;
    }

    show() {
        this.createModal();
        this.bindEvents();
        document.body.appendChild(this.modal);
        this.modal.querySelector("#item-search-input").focus();
    }

    createModal() {
        this.modal = document.createElement("div");
        this.modal.className = "game-modal";
        this.modal.innerHTML = `
        <div class="modal-content modal-lg" style="max-height: 85vh; overflow: hidden; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>Select Activity</h2>
                <button class="btn-close">×</button>
            </div>
            
            <div style="display: flex; gap: 10px; padding: 0 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px;">
                <div id="tab-items" style="padding: 8px 16px; cursor: pointer; border-bottom: 2px solid #FFD700; color: #fff; font-weight: bold;">Items</div>
                <div id="tab-exploration" style="padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent; color: #aaa; font-weight: bold;">Exploration</div>
            </div>

            <div class="quantity-selector-container">
                <label for="goal-quantity-input" class="quantity-label">Target Quantity:</label>
                <div class="quantity-presets">
                    <button class="quantity-preset-btn" data-qty="1">1</button>
                    <button class="quantity-preset-btn" data-qty="10">10</button>
                    <button class="quantity-preset-btn" data-qty="50">50</button>
                    <button class="quantity-preset-btn" data-qty="100">100</button>
                    <button class="quantity-preset-btn" data-qty="1000">1000</button>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="goal-quantity-input" placeholder="#" class="quantity-input" value="1" style="width: 70px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px; text-align: center; background: rgba(0,0,0,0.2);" />
                        <button id="btn-clear-qty" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #ccc; cursor: pointer; font-size: 14px; padding: 2px 8px; display: none;">✕</button>
                    </div>
                </div>
                <input type="text" class="search-bar" placeholder="Search..." id="item-search-input">
            </div>

             <div class="goals-grid" id="goals-grid-container">
                ${this.renderGrid()}
            </div>
        </div>
     `;
        this.updateTabStyles();
    }

    renderGrid() {
        let gridHtml = "";

        if (this.activeTab === "ITEMS") {
            const allItems = Object.entries(ITEM_DEFINITIONS);
            const filtered = allItems
                .filter(([id, def]) => {
                    const source = sourceRegistry.getSource(id);
                    if (source && source.type === "SKILL") {
                        const skillId = source.skillId.toLowerCase();
                        const reqLevel = source.reqLevel;
                        const charSkill = this.character.skills[skillId];
                        const charLevel = charSkill ? charSkill.level : 0;
                        if (charLevel < reqLevel) return false;
                    }
                    // Hide resource-gathered items if no matching nodes are explored
                    const nodeSources = ITEM_TO_NODE_MAP[id];
                    if (nodeSources && nodeSources.length > 0 && this.gameState) {
                        const hasAvailable = nodeSources.some(({ nodeType, biome }) => {
                            const key = `${nodeType}:${biome}`;
                            return (this.gameState.availableResources[key] || 0) > 0;
                        });
                        if (!hasAvailable) return false;
                    }
                    return def.name.toLowerCase().includes(this.searchTerm.toLowerCase());
                })
                .sort(([, a], [, b]) => a.name.localeCompare(b.name));

            gridHtml = filtered.map(([id, def]) => `
          <div class="goal-item-card" data-id="${id}" style="cursor: pointer;">
              <div class="goal-item-icon">${def.icon}</div>
              <div class="goal-item-name">${def.name}</div>
          </div>
      `).join("");

        } else if (this.activeTab === "EXPLORATION") {
            const exploring = SKILL_DEFINITIONS.EXPLORING;
            if (exploring && exploring.options) {
                const charLevel = this.character.skills.exploring ? this.character.skills.exploring.level : 1;
                const allOptions = Object.entries(exploring.options);

                const wanderOptions = allOptions.filter(([id]) => id.startsWith("wander"));
                const biomeOptions = allOptions
                    .filter(([id]) => !id.startsWith("wander"))
                    .filter(([, opt]) => {
                        if (opt.level > charLevel) return false;
                        // Search Check
                        if (this.searchTerm && !opt.name.toLowerCase().includes(this.searchTerm.toLowerCase())) return false;
                        return true;
                    })
                    .sort((a, b) => a[1].level - b[1].level);

                let wanderHtml = "";
                if (!this.searchTerm) {
                    wanderHtml = `
              <div class="exploration-section-title">Wander Mode</div>
              <div class="wander-options-container">
                ${wanderOptions.map(([id, opt]) => {
                        const type = id.split("_")[1] || "normal";
                        return `
                    <div class="wander-card ${type}" data-id="${id}">
                      <div class="wander-icon">${opt.icon}</div>
                      <div class="wander-title">${opt.name}</div>
                      <div class="wander-desc">${opt.description || "Just wandering..."}</div>
                      <div class="wander-stats">Lvl ${opt.level}</div>
                    </div>
                  `;
                    }).join("")}
              </div>
            `;
                }

                const biomeHtml = `
            <div class="exploration-section-title" style="margin-top: 20px;">Expeditions</div>
            <div class="expeditions-grid">
              ${biomeOptions.map(([id, opt]) => `
                  <div class="biome-card" data-id="${id}">
                    <div class="biome-icon">${opt.icon}</div>
                    <div class="biome-info">
                      <div class="biome-name">${opt.name}</div>
                      <div class="biome-level">Requires Level ${opt.level}</div>
                    </div>
                  </div>
              `).join("")}
            </div>
          `;

                gridHtml = `<div class="exploration-container">${wanderHtml}${biomeHtml}</div>`;
            }
        }
        return gridHtml;
    }

    updateGrid() {
        const grid = this.modal.querySelector("#goals-grid-container");
        if (!grid) return;

        if (this.activeTab === "EXPLORATION") {
            grid.classList.remove("goals-grid");
        } else {
            grid.classList.add("goals-grid");
        }
        grid.innerHTML = this.renderGrid();
        this.bindGridEvents();
    }

    updateTabStyles() {
        const tabStyle = `padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent; color: #aaa; font-weight: bold;`;
        const activeTabStyle = `padding: 8px 16px; cursor: pointer; border-bottom: 2px solid #FFD700; color: #fff; font-weight: bold;`;

        const tabItems = this.modal.querySelector("#tab-items");
        const tabExpl = this.modal.querySelector("#tab-exploration");
        if (tabItems) tabItems.style.cssText = this.activeTab === "ITEMS" ? activeTabStyle : tabStyle;
        if (tabExpl) tabExpl.style.cssText = this.activeTab === "EXPLORATION" ? activeTabStyle : tabStyle;

        const qtyContainer = this.modal.querySelector(".quantity-selector-container");
        if (qtyContainer) {
            qtyContainer.style.display = this.activeTab === "EXPLORATION" ? "none" : "flex";
        }
    }

    bindEvents() {
        this.modal.querySelector(".btn-close").addEventListener("click", () => this.close());
        this.modal.addEventListener("click", (e) => {
            if (e.target === this.modal) this.close();
        });

        this.modal.querySelector("#tab-items").addEventListener("click", () => {
            this.activeTab = "ITEMS";
            this.updateGrid();
            this.updateTabStyles();
        });
        this.modal.querySelector("#tab-exploration").addEventListener("click", () => {
            this.activeTab = "EXPLORATION";
            this.updateGrid();
            this.updateTabStyles();
        });

        const searchInput = this.modal.querySelector("#item-search-input");
        searchInput.addEventListener("input", (e) => {
            this.searchTerm = e.target.value;
            this.updateGrid();
        });

        // Quantity Logic
        const qtyInput = this.modal.querySelector("#goal-quantity-input");
        const clearBtn = this.modal.querySelector("#btn-clear-qty");

        const syncQty = () => {
            const val = parseInt(qtyInput.value, 10);
            if (val > 0) {
                this.currentQty = val;
                clearBtn.style.display = "block";
            } else {
                clearBtn.style.display = "none";
            }
        };

        qtyInput.addEventListener("input", syncQty);
        qtyInput.addEventListener("change", syncQty);

        clearBtn.addEventListener("click", () => {
            qtyInput.value = "";
            this.currentQty = 1;
            clearBtn.style.display = "none";
            qtyInput.focus();
        });

        this.modal.querySelectorAll(".quantity-preset-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const btnVal = parseInt(btn.dataset.qty);
                const inputVal = parseInt(qtyInput.value, 10);
                if (isNaN(inputVal)) {
                    this.currentQty = btnVal;
                } else {
                    this.currentQty += btnVal;
                }
                if (this.currentQty > 9999) this.currentQty = 9999;
                qtyInput.value = this.currentQty;
                clearBtn.style.display = "block";
            });
        });

        this.bindGridEvents();
    }

    bindGridEvents() {
        this.modal.querySelectorAll(".goal-item-card, .wander-card, .biome-card").forEach((el) => {
            el.addEventListener("click", () => {
                const id = el.dataset.id;
                // If active tab is exploration, we might want to handle it differently 
                // but the original UIManager handled it by checking activeTab or type
                // We pass the selection back to UIManager.

                // NOTE: Original logic passed a skill start activity for EXPLORATION directly in UIManager
                // We should pass enough info for UIManager to decide.

                if (this.activeTab === "EXPLORATION") {
                    this.onSelect({ type: "EXPLORATION", id, qty: 0 }); // Exploration doesn't use quantity usually
                } else {
                    this.onSelect({ type: "ITEM", id, qty: this.currentQty });
                }
                this.close();
            });
        });
    }

    close() {
        this.modal.classList.add("hidden");
        setTimeout(() => this.modal.remove(), 200);
    }
}
