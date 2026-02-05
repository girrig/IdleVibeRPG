import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { getItemDefinition } from "../../core/ItemRegistry";
import { UI_COLORS, GAME_CONFIG, RESOURCE_NODES } from "../../core/Constants";
import { TERRAIN_TYPES } from "../../core/TerrainTypes";

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeSkillTab = null;
  }

  render(container) {
    container.className = "mw-content skills-modal-layout";

    // Add specific skill class for theming (e.g. "skill-foraging")
    if (this.activeSkillTab) {
      container.classList.add(`skill-${this.activeSkillTab.toLowerCase()}`);
    }

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
        if (["MINING", "WOODCUTTING", "FISHING", "FORAGING"].includes(activeSkill.id)) {
          this.renderGatheringSkillView(contentArea, activeSkill, char);
        } else {
          this.renderGenericSkillView(contentArea, activeSkill, char);
        }
      }
    } catch (err) {
      console.error("Error rendering skill view:", err);
      // Fallback
      contentArea.innerHTML = `<div class="error" style="color:red; padding:20px;">
        <h3>Error Rendering Skill</h3>
        <pre>${err.message}</pre>
      </div>`;
    }
  }

  renderGatheringSkillView(container, activeSkill, char) {
    const currentLvl = char && char.skills[activeSkill.id.toLowerCase()] ? char.skills[activeSkill.id.toLowerCase()].level : 1;

    const header = document.createElement("div");
    header.className = "skills-options-header";
    const colorStyle = activeSkill.color ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"` : "";
    header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "skills-actions-grid";

    this.populateGatheringGrid(grid, activeSkill, char);

    container.appendChild(grid);
  }

  populateGatheringGrid(grid, activeSkill, char) {
    // 1. collect all unique resource keys for this skill
    const resourceKeys = new Set();
    Object.values(activeSkill.options).forEach((opt) => {
      if (opt.resourceId) resourceKeys.add(opt.resourceId);
    });

    // 2. Iterate each resource type
    resourceKeys.forEach((resourceKey) => {
      const nodeConfig = RESOURCE_NODES[resourceKey];
      if (!nodeConfig) return;

      // Iterate over ALL allowed biomes to create an Appendix
      nodeConfig.allowedBiomes.forEach((biomeId) => {
        const biomeDef = TERRAIN_TYPES[biomeId];
        const biomeName = biomeDef ? biomeDef.id.replace(/_/g, " ") : biomeId;
        const biomeIcon = biomeDef ? biomeDef.symbol : "❓";

        // Check Availability
        const fullKey = `${resourceKey}:${biomeId}`;
        const count = gameState.availableResources[fullKey] || 0;

        // Drops & Percentages
        let dropsHtml = "";
        const table =
          (nodeConfig.biome_drops && nodeConfig.biome_drops[biomeId]) ||
          nodeConfig.default_drops;

        if (table) {
          const totalWeight = table.reduce(
            (sum, entry) => sum + entry.weight,
            0,
          );

          dropsHtml = `<div class="drop-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        <span style="font-size:0.8em; color:#888; margin-right:4px;">Drops:</span>`;

          table.forEach((entry) => {
            const itemDef = getItemDefinition(entry.item);
            const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
            const icon = itemDef ? itemDef.icon : "📦";
            const name = itemDef ? itemDef.name : entry.item;

            dropsHtml += `
                        <span class="drop-badge" style="
                            display: inline-flex; 
                            align-items: center; 
                            background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid rgba(255, 255, 255, 0.1); 
                            border-radius: 4px; 
                            padding: 2px 6px; 
                            font-size: 0.8em;
                            color: #eee;
                        ">
                            <span style="margin-right: 4px;">${icon}</span>
                            ${name} 
                            <span style="margin-left: 4px; color: #666;">${percent}%</span>
                        </span>
                    `;
          });

          dropsHtml += `</div>`;
        }

        // Visual State for 0 count
        const opacity = count > 0 ? "1" : "0.6";

        // Render Card
        const card = document.createElement("div");
        card.className = "skill-action-card";
        card.style.opacity = opacity;
        // Allow column layout for details to accommodate drop list
        card.style.flexDirection = "column";
        card.style.alignItems = "stretch";

        card.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="action-icon">${biomeIcon}</div>
                    <div class="action-details" style="flex: 1;">
                        <div class="action-name">${biomeName} ${nodeConfig.name}</div>
                        <div class="action-meta">
                            <span class="action-time">Available: <b style="color:${count > 0 ? '#4ade80' : '#888'}">${count}</b></span>
                        </div>
                    </div>
                </div>
                ${dropsHtml}
             `;

        // Only allow clicking if resources exist?
        // Or allow clicking and let the system say "None found"?
        // Typically we only want to start action if resources exist.
        if (count > 0) {
          card.addEventListener("click", () => {
            // Find the OPTION KEY that matches this resource
            // This is slightly ambiguous if multiple options target the same resource (e.g. diff levels)
            // But usually 1:1. We pick the first matching one.
            const matchingOptionKey = Object.keys(activeSkill.options).find(
              (k) => activeSkill.options[k].resourceId === resourceKey,
            );

            if (matchingOptionKey) {
              this.uiManager.handleSkillAction(
                activeSkill.id,
                matchingOptionKey,
              );
            }
          });
        } else {
          card.style.cursor = "default";
          // Optional: Tooltip "Explore more [Biome] to find this."
        }

        grid.appendChild(card);
      });
    });
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

    // Available World Resource Check
    let availableHtml = "";
    const targetResources = ["WOODCUTTING", "MINING", "FISHING"];
    if (targetResources.includes(activeSkill.id)) {
      const resourceKey = opt.resourceId || key;
      if (resourceKey) {
        const { html } = this.generateAvailableResourceHtml(resourceKey);
        availableHtml = `<div class="action-available" style="font-size: 0.9em; margin-top: 4px; color: #888;">${html}</div>`;
      }
    }

    // Drop badges (for monsters with loot tables)
    let dropsHtml = "";
    if (opt.drops) {
      const totalWeight = opt.drops.reduce((sum, e) => sum + e.weight, 0);
      dropsHtml = `<div class="drop-list" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
        <span style="font-size:0.8em; color:#888; margin-right:4px;">Drops:</span>`;
      opt.drops.forEach((entry) => {
        const itemDef = getItemDefinition(entry.item);
        const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
        const icon = itemDef ? itemDef.icon : "📦";
        const name = itemDef ? itemDef.name : entry.item;
        dropsHtml += `
          <span class="drop-badge" style="
            display: inline-flex; align-items: center;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 4px; padding: 2px 6px; font-size: 0.8em; color: #eee;
          ">
            <span style="margin-right: 4px;">${icon}</span>
            ${name}
            <span style="margin-left: 4px; color: #666;">${percent}%</span>
          </span>`;
      });
      dropsHtml += `</div>`;
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
        ${dropsHtml}
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

    if (this.activeSkillTab === 'EXPLORING') {
      this.updateExplorationView(container);
    }
    else if (["MINING", "WOODCUTTING", "FISHING", "FORAGING"].includes(this.activeSkillTab)) {
      const grid = container.querySelector(".skills-actions-grid");
      if (grid) {
        grid.innerHTML = "";
        const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
        const char = gameState.characters[this.uiManager.selectedCharIndex];
        this.populateGatheringGrid(grid, activeSkill, char);
      }

      const char = gameState.characters[this.uiManager.selectedCharIndex];
      const currentLvl = char ? char.skills[this.activeSkillTab.toLowerCase()].level : 1;
      const headerLvl = container.querySelector(".header-lvl");
      if (headerLvl) headerLvl.innerText = `Lvl ${currentLvl} `;
    }
    else {
      // Generic Update logic for smithing/fighting
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

          // Update Available Count & Details
          const availDiv = card.querySelector(".action-available");
          if (availDiv) {
            const availSpan = availDiv.querySelector(".avail-count");
            if (availSpan) {
              const resId = availSpan.getAttribute("data-res-id");
              if (resId) {
                const { html } = this.generateAvailableResourceHtml(resId);
                availDiv.innerHTML = html;
              }
            }
          }

          // Update Locks
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

  updateExplorationView(container) {
    const char = gameState.characters[this.uiManager.selectedCharIndex];
    const currentLvl = char ? char.skills.exploring.level : 1;

    const headerLvl = container.querySelector(".header-lvl");
    if (headerLvl) headerLvl.innerText = `Lvl ${currentLvl} `;

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
        }
      } else {
        card.classList.remove("locked-overlay");
      }
      idx++;
    });
  }

  generateAvailableResourceHtml(resourceKey) {
    const allResources = gameState.availableResources;
    const matchingKeys = Object.keys(allResources).filter(k => k.startsWith(resourceKey + ":"));
    let totalCount = 0;
    let detailsHtml = "";

    if (matchingKeys.length > 0) {
      detailsHtml = '<div class="resource-breakdown" style="font-size: 0.85em; margin-top: 5px; color: #aaa;">';

      matchingKeys.forEach(fullKey => {
        const count = allResources[fullKey];
        if (count <= 0) return;
        totalCount += count;

        const biomeId = fullKey.split(":")[1];
        const biomeDef = TERRAIN_TYPES[biomeId];
        const biomeName = biomeDef ? biomeDef.id.replace(/_/g, " ") : biomeId;
        const biomeIcon = biomeDef ? biomeDef.symbol : "❓";

        // Get Drops
        const nodeConfig = RESOURCE_NODES[resourceKey];
        let drops = [];
        if (nodeConfig) {
          const table = (nodeConfig.biome_drops && nodeConfig.biome_drops[biomeId]) || nodeConfig.default_drops;
          if (table) {
            drops = table.map(entry => {
              const itemDef = getItemDefinition(entry.item);
              return itemDef ? itemDef.name : entry.item;
            });
          }
        }
        const uniqueDrops = [...new Set(drops)].slice(0, 3).join(", ");

        detailsHtml += `
           <div style="margin-left: 8px;">
             ${biomeIcon} ${count} in ${biomeName} <span style="color:#666;">(${uniqueDrops})</span>
           </div>
         `;
      });
      detailsHtml += '</div>';
    } else {
      // Fallback for generic nodes without biome?
      totalCount = gameState.getAvailableResourceCount(resourceKey);
    }

    const countColor = totalCount > 0 ? "#4ade80" : "#f87171";
    return {
      html: `
        World Available: <span class="avail-count" data-res-id="${resourceKey}" style="color: ${countColor}">${totalCount}</span>
        ${totalCount > 0 ? detailsHtml : ""}
      `,
      totalCount
    };
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
