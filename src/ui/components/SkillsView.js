import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { getItemDefinition } from "../../core/ItemRegistry";
import { GAME_CONFIG, RESOURCE_NODES } from "../../core/Constants";
import { TERRAIN_TYPES } from "../../core/TerrainTypes";

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeSkillTab = null;
    this.expandedCategories = new Set();
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

      const { discovered, total } = this.getSkillCompletion(skill, char);
      tabBtn.innerHTML = `
            <span class="tab-icon">${skill.icon}</span>
            <span class="tab-name">${skill.name}</span>
            <span class="codex-completion">${discovered}/${total}</span>
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
        } else if (activeSkill.id === "FIGHTING") {
          this.renderFightingSkillView(contentArea, activeSkill, char);
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
    const { discovered, total } = this.getSkillCompletion(activeSkill, char);

    const header = document.createElement("div");
    header.className = "skills-options-header";
    const colorStyle = activeSkill.color ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"` : "";
    header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="codex-section-completion">${discovered}/${total} discovered</span> <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    const list = document.createElement("div");
    list.className = "codex-entry-list";

    this.populateGatheringGrid(list, activeSkill, char);

    container.appendChild(list);
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

        // Find the matching option for this resource
        const matchingOptionKey = Object.keys(activeSkill.options).find(
          (k) => activeSkill.options[k].resourceId === resourceKey,
        );
        const matchingOpt = matchingOptionKey ? activeSkill.options[matchingOptionKey] : {};

        const charLevel = char && char.skills[activeSkill.id.toLowerCase()] ? char.skills[activeSkill.id.toLowerCase()].level : 0;
        const isLocked = charLevel < (matchingOpt.level || 1);

        // Render Card
        const card = document.createElement("div");
        card.className = `skill-action-card ${isLocked ? "locked" : ""}`;

        const displayName = isLocked ? "???" : `${biomeName} ${nodeConfig.name}`;
        const displayIcon = isLocked ? "❓" : biomeIcon;

        card.innerHTML = `
            <div class="action-icon">${displayIcon}</div>
            <div class="action-name">${displayName}</div>
        `;

        // Click opens detail popup
        card.addEventListener("click", () => {
          this.showDetailPopup({
            name: `${biomeName} ${nodeConfig.name}`,
            icon: biomeIcon,
            level: matchingOpt.level || 1,
            xp: matchingOpt.xp || 0,
            interval: matchingOpt.interval || activeSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
            skillColor: activeSkill.color,
            resourceKey,
            biomeId,
            biomeName,
            biomeIcon,
            availableCount: count,
          });
        });

        grid.appendChild(card);
      });
    });
  }

  renderFightingSkillView(container, activeSkill, char) {
    const currentLvl = char && char.skills[activeSkill.id.toLowerCase()] ? char.skills[activeSkill.id.toLowerCase()].level : 1;
    const { discovered, total } = this.getSkillCompletion(activeSkill, char);

    const header = document.createElement("div");
    header.className = "skills-options-header";
    const colorStyle = activeSkill.color ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"` : "";
    header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="codex-section-completion">${discovered}/${total} discovered</span> <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    // Group options by category
    const categories = {};
    Object.entries(activeSkill.options).forEach(([key, opt]) => {
      const cat = opt.category || "Uncategorized";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ key, opt });
    });

    // Define Category Order (Optional, or just alphabetical/keys)
    const orderedCategories = ["Outskirts", "Wilderness", "Dungeon", "Infernal Plane", "Uncategorized"];
    const presentCategories = Object.keys(categories);
    const sortedCategories = orderedCategories.filter(c => presentCategories.includes(c))
      .concat(presentCategories.filter(c => !orderedCategories.includes(c)));

    const scrollContainer = document.createElement("div");
    scrollContainer.className = "fighting-container";
    scrollContainer.style.overflowY = "auto";
    scrollContainer.style.flex = "1";
    scrollContainer.style.paddingRight = "4px";

    sortedCategories.forEach(catName => {
      const isExpanded = this.expandedCategories.has(catName);
      const categoryTitle = document.createElement("div");
      categoryTitle.className = "exploration-section-title collapsible-header";
      categoryTitle.style.marginTop = "16px";
      categoryTitle.style.marginBottom = "8px";
      categoryTitle.style.color = "#ddd";
      categoryTitle.style.borderBottom = "1px solid #444";
      categoryTitle.style.paddingBottom = "4px";
      categoryTitle.style.cursor = "pointer";
      categoryTitle.style.display = "flex";
      categoryTitle.style.alignItems = "center";
      categoryTitle.style.justifyContent = "space-between";

      categoryTitle.innerHTML = `
        <span>${catName}</span>
        <span style="transform: ${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}; transition: transform 0.2s;">▼</span>
      `;

      categoryTitle.addEventListener("click", () => {
        this.toggleCategory(catName);
      });

      scrollContainer.appendChild(categoryTitle);

      if (isExpanded) {
        const list = document.createElement("div");
        list.className = "codex-entry-list";

        categories[catName].forEach(({ key, opt }) => {
          this.renderSkillCard(list, key, opt, currentLvl, activeSkill);
        });

        scrollContainer.appendChild(list);
      }
    });

    container.appendChild(scrollContainer);
  }

  toggleCategory(catName) {
    if (this.expandedCategories.has(catName)) {
      this.expandedCategories.delete(catName);
    } else {
      this.expandedCategories.add(catName);
    }
    this.uiManager.renderMainWindow();
  }

  renderGenericSkillView(container, activeSkill, char) {
    const currentLvl =
      char && char.skills[activeSkill.id.toLowerCase()]
        ? char.skills[activeSkill.id.toLowerCase()].level
        : 1;
    const { discovered, total } = this.getSkillCompletion(activeSkill, char);

    const header = document.createElement("div");
    header.className = "skills-options-header";

    // Header Style
    const colorStyle = activeSkill.color
      ? `style="color: ${activeSkill.color}; border-bottom-color: ${activeSkill.color}"`
      : "";

    header.innerHTML = `<h2 ${colorStyle}>${activeSkill.icon} ${activeSkill.name} <span class="codex-section-completion">${discovered}/${total} discovered</span> <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
    container.appendChild(header);

    // Entry list
    const list = document.createElement("div");
    list.className = "codex-entry-list";

    Object.entries(activeSkill.options).forEach(([key, opt]) => {
      this.renderSkillCard(list, key, opt, currentLvl, activeSkill);
    });

    container.appendChild(list);
  }

  renderExplorationView(container, activeSkill, char) {
    const currentLvl = char && char.skills.exploring ? char.skills.exploring.level : 1;
    const { discovered, total } = this.getSkillCompletion(activeSkill, char);

    // --- Header ---
    const header = document.createElement("div");
    header.className = "skills-options-header";
    header.style.color = activeSkill.color;
    header.style.borderBottomColor = activeSkill.color;
    header.innerHTML = `<h2>${activeSkill.icon} ${activeSkill.name} <span class="codex-section-completion">${discovered}/${total} discovered</span> <span class="header-lvl">Lvl ${currentLvl}</span></h2>`;
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
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        this.showDetailPopup({
          name: expOpt.name,
          icon: expOpt.icon,
          level: expOpt.level,
          xp: expOpt.xp,
          interval: activeSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
          skillColor: activeSkill.color,
          description: expOpt.description,
        });
      });
      wanderContainer.appendChild(card);
    }
    scrollContainer.appendChild(wanderContainer);


    // --- 2. Biome Discovery Section ---
    const discoveryTitle = document.createElement("div");
    discoveryTitle.className = "exploration-section-title";
    discoveryTitle.innerText = "Biome Discovery";
    discoveryTitle.style.marginTop = "20px";
    scrollContainer.appendChild(discoveryTitle);

    const biomeList = document.createElement("div");
    biomeList.className = "codex-entry-list";

    // Filter only "find_" options
    Object.entries(activeSkill.options).forEach(([key, opt]) => {
      if (!key.startsWith("find_")) return;

      const isLocked = currentLvl < opt.level;
      const card = document.createElement("div");
      card.className = `skill-action-card biome-card ${isLocked ? "locked locked-overlay" : ""}`;

      const displayName = isLocked ? "???" : opt.name;
      const displayIcon = isLocked ? "❓" : opt.icon;

      card.innerHTML = `
        <div class="action-icon">${displayIcon}</div>
        <div class="action-name">${displayName}</div>
      `;

      card.addEventListener("click", () => {
        this.showDetailPopup({
          name: isLocked ? "???" : opt.name,
          icon: isLocked ? "❓" : opt.icon,
          level: opt.level,
          xp: opt.xp,
          interval: activeSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
          skillColor: activeSkill.color,
          biomeId: isLocked ? undefined : opt.biomeId,
        });
      });

      biomeList.appendChild(card);
    });

    scrollContainer.appendChild(biomeList);
    container.appendChild(scrollContainer);
  }

  // Refactored helper to prevent duplication in Generic View
  renderSkillCard(container, key, opt, currentLvl, activeSkill) {
    const card = document.createElement("div");
    const isLocked = currentLvl < opt.level;
    card.className = `skill-action-card ${isLocked ? "locked" : ""}`;
    card.setAttribute("data-key", key);

    const displayName = isLocked ? "???" : opt.name;
    const displayIcon = isLocked ? "❓" : (opt.icon || "❓");

    card.innerHTML = `
      <div class="action-icon">${displayIcon}</div>
      <div class="action-name">${displayName}</div>
    `;

    // Click opens detail popup
    card.addEventListener("click", () => {
      this.showDetailPopup({
        name: opt.name,
        icon: opt.icon || "❓",
        level: opt.level,
        xp: opt.xp,
        interval: opt.interval || activeSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
        skillColor: activeSkill.color,
        drops: opt.drops,
        cost: opt.cost,
        category: opt.category,
        resourceId: opt.resourceId,
      });
    });

    container.appendChild(card);
  }

  update(container) {
    if (!this.activeSkillTab) return;

    if (this.activeSkillTab === 'EXPLORING') {
      this.updateExplorationView(container);
    }
    else if (["MINING", "WOODCUTTING", "FISHING", "FORAGING"].includes(this.activeSkillTab)) {
      const list = container.querySelector(".codex-entry-list");
      if (list) {
        list.innerHTML = "";
        const activeSkill = SKILL_DEFINITIONS[this.activeSkillTab];
        const char = gameState.characters[this.uiManager.selectedCharIndex];
        this.populateGatheringGrid(list, activeSkill, char);
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
        // Create a map for faster lookup if strict ordering isn't guaranteed
        const cardMap = {};
        cards.forEach(c => {
          const k = c.getAttribute("data-key");
          if (k) cardMap[k] = c;
        });

        Object.entries(activeSkill.options).forEach(([key, opt]) => {
          const card = cardMap[key];
          if (!card) return;

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
          } else {
            card.classList.remove("locked");
          }
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

  showDetailPopup(data) {
    // Remove any existing popup
    const existing = document.querySelector(".game-modal.codex-popup");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "game-modal codex-popup";
    modal.style.zIndex = "1000";

    const content = document.createElement("div");
    content.className = "modal-content";
    content.style.width = "480px";
    content.style.maxWidth = "90vw";

    // Header
    const header = document.createElement("div");
    header.className = "modal-header";
    if (data.skillColor) {
      header.style.borderBottomColor = data.skillColor;
    }
    header.innerHTML = `
      <h2 style="${data.skillColor ? `color: ${data.skillColor}` : ""}">${data.name}</h2>
      <button class="btn-close">&times;</button>
    `;
    content.appendChild(header);

    // Body
    const body = document.createElement("div");
    body.className = "codex-popup-body";

    // Icon + Title row
    body.innerHTML = `
      <div class="codex-popup-header-row">
        <div class="codex-popup-icon">${data.icon}</div>
        <div class="codex-popup-title">
          <h3>${data.name}</h3>
          ${data.description ? `<div class="codex-subtitle">${data.description}</div>` : ""}
          ${data.category ? `<div class="codex-subtitle">${data.category}</div>` : ""}
        </div>
      </div>
    `;

    // Stats grid
    const statsHtml = `
      <div class="codex-stat-grid">
        <div class="codex-stat-row">
          <span class="stat-label">Level</span>
          <span class="stat-value">${data.level}</span>
        </div>
        <div class="codex-stat-row">
          <span class="stat-label">XP</span>
          <span class="stat-value">${data.xp}</span>
        </div>
        <div class="codex-stat-row">
          <span class="stat-label">Time</span>
          <span class="stat-value">${(data.interval / 1000)}s</span>
        </div>
        ${data.availableCount !== undefined ? `
        <div class="codex-stat-row">
          <span class="stat-label">Available</span>
          <span class="stat-value" style="color: ${data.availableCount > 0 ? '#4ade80' : '#f87171'}">${data.availableCount}</span>
        </div>` : ""}
      </div>
    `;
    body.innerHTML += statsHtml;

    // Cost section (smithing)
    if (data.cost) {
      let costHtml = `<div class="codex-section-title">Materials Required</div><div class="codex-cost-list">`;
      Object.entries(data.cost).forEach(([id, qty]) => {
        const iDef = getItemDefinition(id);
        const itemName = iDef ? iDef.name : id;
        const itemIcon = iDef ? iDef.icon : "📦";
        costHtml += `<div class="codex-cost-item">${itemIcon} ${qty} ${itemName}</div>`;
      });
      costHtml += `</div>`;
      body.innerHTML += costHtml;
    }

    // Drops section (fighting)
    if (data.drops) {
      const totalWeight = data.drops.reduce((sum, e) => sum + e.weight, 0);
      let dropsHtml = `<div class="codex-section-title">Drops</div><div class="codex-drop-table">`;
      data.drops.forEach((entry) => {
        const itemDef = getItemDefinition(entry.item);
        const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
        const icon = itemDef ? itemDef.icon : "📦";
        const name = itemDef ? itemDef.name : entry.item;
        dropsHtml += `
          <div class="codex-drop-row">
            <span class="drop-icon">${icon}</span>
            <span class="drop-name">${name}</span>
            <span class="drop-chance">${percent}%</span>
          </div>`;
      });
      dropsHtml += `</div>`;
      body.innerHTML += dropsHtml;
    }

    // Gathering drops (biome-specific from RESOURCE_NODES)
    if (data.resourceKey) {
      const nodeConfig = RESOURCE_NODES[data.resourceKey];
      if (nodeConfig) {
        const table =
          (nodeConfig.biome_drops && nodeConfig.biome_drops[data.biomeId]) ||
          nodeConfig.default_drops;

        if (table) {
          const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
          let dropsHtml = `<div class="codex-section-title">Drops</div><div class="codex-drop-table">`;
          table.forEach((entry) => {
            const itemDef = getItemDefinition(entry.item);
            const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
            const icon = itemDef ? itemDef.icon : "📦";
            const name = itemDef ? itemDef.name : entry.item;
            dropsHtml += `
              <div class="codex-drop-row">
                <span class="drop-icon">${icon}</span>
                <span class="drop-name">${name}</span>
                <span class="drop-chance">${percent}%</span>
              </div>`;
          });
          dropsHtml += `</div>`;
          body.innerHTML += dropsHtml;
        }
      }
    }

    // Biome info (exploring)
    if (data.biomeId && !data.resourceKey) {
      const biomeDef = TERRAIN_TYPES[data.biomeId];
      if (biomeDef) {
        body.innerHTML += `
          <div class="codex-section-title">Biome</div>
          <div class="codex-stat-row">
            <span class="stat-label">Terrain</span>
            <span class="stat-value">${biomeDef.symbol} ${biomeDef.id.replace(/_/g, " ")}</span>
          </div>
        `;
      }
    }

    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close handlers
    const closeModal = () => modal.remove();
    header.querySelector(".btn-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  getSkillCompletion(skill, char) {
    const charLevel = char && char.skills[skill.id.toLowerCase()]
      ? char.skills[skill.id.toLowerCase()].level : 0;
    const options = Object.values(skill.options);
    const total = options.length;
    const discovered = options.filter(opt => charLevel >= opt.level).length;
    return { discovered, total };
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
