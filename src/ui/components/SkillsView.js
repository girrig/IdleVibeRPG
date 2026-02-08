import { gameState } from "../../core/GameState";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { ITEM_DEFINITIONS, getItemDefinition } from "../../core/ItemRegistry";
import { GAME_CONFIG, RESOURCE_NODES } from "../../core/Constants";
import { TERRAIN_TYPES } from "../../core/TerrainTypes";
import { sourceRegistry } from "../../core/SourceRegistry";
import { ICONS } from "../../core/Icons";

const CODEX_CATEGORIES = [
  { id: "MONSTERS",  name: "Monsters",  icon: ICONS.codex.monsters,  color: "#e74c3c" },
  { id: "NODES",     name: "Nodes",     icon: ICONS.codex.nodes,     color: "#2ecc71" },
  { id: "RECIPES",   name: "Recipes",   icon: ICONS.codex.recipes,   color: "#ff8800" },
  { id: "BIOMES",    name: "Biomes",    icon: ICONS.codex.biomes,    color: "#8e44ad" },
  { id: "ITEMS",     name: "Items",     icon: ICONS.codex.items,     color: "#3498db" },
];

export class SkillsView {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.activeCategory = null;
    this.revealAll = true;
  }

  render(container) {
    container.className = "mw-content skills-modal-layout";

    const char = gameState.characters[this.uiManager.selectedCharIndex];

    if (!this.activeCategory) {
      this.activeCategory = CODEX_CATEGORIES[0].id;
    }

    // Sidebar
    const sidebar = document.createElement("div");
    sidebar.className = "skills-category-sidebar";

    CODEX_CATEGORIES.forEach((cat) => {
      const tabBtn = document.createElement("div");
      const isActive = this.activeCategory === cat.id;
      tabBtn.className = `skill-category-tab ${isActive ? "active" : ""}`;

      if (isActive) {
        tabBtn.style.borderColor = cat.color;
        tabBtn.style.color = cat.color;
        tabBtn.style.background = `rgba(${this.hexToRgb(cat.color)}, 0.15)`;
      }

      const { discovered, total } = this.getCategoryCompletion(cat.id, char);
      tabBtn.innerHTML = `
        <span class="tab-icon">${cat.icon}</span>
        <span class="tab-name">${cat.name}</span>
        <span class="codex-completion">${discovered}/${total}</span>
      `;

      tabBtn.addEventListener("click", () => {
        this.activeCategory = cat.id;
        this.uiManager.renderMainWindow();
      });

      sidebar.appendChild(tabBtn);
    });

    // Debug: Reveal All toggle
    const toggle = document.createElement("div");
    toggle.className = `codex-reveal-toggle ${this.revealAll ? "active" : ""}`;
    toggle.innerHTML = `🔓 Reveal All`;
    toggle.addEventListener("click", () => {
      this.revealAll = !this.revealAll;
      this.uiManager.renderMainWindow();
    });
    sidebar.appendChild(toggle);

    // Content Area
    const contentArea = document.createElement("div");
    contentArea.className = "skills-options-area";

    container.appendChild(sidebar);
    container.appendChild(contentArea);

    const activeCat = CODEX_CATEGORIES.find(c => c.id === this.activeCategory);

    try {
      switch (this.activeCategory) {
        case "MONSTERS":  this.renderMonstersView(contentArea, activeCat, char); break;
        case "NODES":     this.renderNodesView(contentArea, activeCat, char); break;
        case "RECIPES":   this.renderRecipesView(contentArea, activeCat, char); break;
        case "BIOMES":    this.renderBiomesView(contentArea, activeCat, char); break;
        case "ITEMS":     this.renderItemsView(contentArea, activeCat, char); break;
      }
    } catch (err) {
      console.error("Error rendering codex view:", err);
      contentArea.innerHTML = `<div class="error" style="color:red; padding:20px;">
        <h3>Error Rendering Codex</h3>
        <pre>${err.message}</pre>
      </div>`;
    }
  }

  // --- Category Renderers ---

  renderMonstersView(container, cat, char) {
    const fightingSkill = SKILL_DEFINITIONS.FIGHTING;
    const { discovered, total } = this.getCategoryCompletion("MONSTERS", char);

    this.renderHeader(container, cat, `${discovered}/${total} discovered`);

    const grid = document.createElement("div");
    grid.className = "codex-entry-list";

    Object.entries(fightingSkill.options).forEach(([key, opt]) => {
      const isLocked = !this.revealAll && !gameState.discoveries.has(`monster:${key}`);
      const card = this.createTile(opt.icon, opt.name, isLocked);

      if (!isLocked) {
        card.addEventListener("click", () => {
          this.showDetailPopup({
            name: opt.name,
            icon: opt.icon,
            level: opt.level,
            xp: opt.xp,
            interval: opt.interval || fightingSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
            skillColor: cat.color,
            category: opt.category,
            drops: opt.drops,
          });
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderNodesView(container, cat, char) {
    const { discovered, total } = this.getCategoryCompletion("NODES", char);

    this.renderHeader(container, cat, `${discovered}/${total} discovered`);

    const grid = document.createElement("div");
    grid.className = "codex-entry-list";

    Object.entries(RESOURCE_NODES).forEach(([nodeKey, node]) => {
      const match = this.findResourceOption(nodeKey);
      const isLocked = !this.revealAll && !gameState.discoveries.has(`node:${nodeKey}`);

      const card = this.createTile(node.icon, node.name, isLocked);

      if (!isLocked) {
        card.addEventListener("click", () => {
          this.showDetailPopup({
            name: node.name,
            icon: node.icon,
            level: match ? match.option.level : 1,
            xp: match ? match.option.xp : 0,
            interval: match ? (match.option.interval || SKILL_DEFINITIONS[match.skillId]?.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL) : undefined,
            skillColor: cat.color,
            allowedBiomes: node.allowedBiomes,
            resourceKey: nodeKey,
          });
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderRecipesView(container, cat, char) {
    const smithingSkill = SKILL_DEFINITIONS.SMITHING;
    const { discovered, total } = this.getCategoryCompletion("RECIPES", char);

    this.renderHeader(container, cat, `${discovered}/${total} discovered`);

    const grid = document.createElement("div");
    grid.className = "codex-entry-list";

    Object.entries(smithingSkill.options).forEach(([key, opt]) => {
      const isLocked = !this.revealAll && !gameState.discoveries.has(`recipe:${key}`);
      const card = this.createTile(opt.icon, opt.name, isLocked);

      if (!isLocked) {
        card.addEventListener("click", () => {
          this.showDetailPopup({
            name: opt.name,
            icon: opt.icon,
            level: opt.level,
            xp: opt.xp,
            interval: opt.interval || smithingSkill.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
            skillColor: cat.color,
            cost: opt.cost,
          });
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderBiomesView(container, cat, char) {
    const { discovered, total } = this.getCategoryCompletion("BIOMES", char);

    this.renderHeader(container, cat, `${discovered}/${total} discovered`);

    const grid = document.createElement("div");
    grid.className = "codex-entry-list";

    // Only show biomes that have a find_ exploring option
    Object.entries(TERRAIN_TYPES).forEach(([biomeId, biomeDef]) => {
      const exploreOpt = this.findBiomeOption(biomeId);
      if (!exploreOpt) return;

      const isLocked = !this.revealAll && !gameState.discoveries.has(`biome:${biomeId}`);
      const displayName = biomeDef.name;
      const card = this.createTile(biomeDef.symbol, displayName, isLocked);

      if (!isLocked) {
        card.addEventListener("click", () => {
          this.showDetailPopup({
            name: displayName,
            icon: biomeDef.symbol,
            level: exploreOpt.level,
            xp: exploreOpt.xp,
            interval: SKILL_DEFINITIONS.EXPLORING?.interval || GAME_CONFIG.DEFAULT_SKILL_INTERVAL,
            skillColor: cat.color,
            biomeId: biomeId,
            resourcesFound: this.getResourcesInBiome(biomeId),
          });
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  renderItemsView(container, cat, char) {
    const { discovered, total } = this.getCategoryCompletion("ITEMS", char);

    this.renderHeader(container, cat, `${discovered}/${total} discovered`);

    const grid = document.createElement("div");
    grid.className = "codex-entry-list";

    Object.entries(ITEM_DEFINITIONS).forEach(([itemId, itemDef]) => {
      if (itemDef.category === "Currency") return;

      const isLocked = !this.revealAll && !gameState.discoveries.has(`item:${itemId}`);
      const card = this.createTile(itemDef.icon, itemDef.name, isLocked);

      if (!isLocked) {
        card.addEventListener("click", () => {
          const source = sourceRegistry.getSource(itemId);
          this.showDetailPopup({
            name: itemDef.name,
            icon: itemDef.icon,
            level: source ? source.reqLevel : undefined,
            skillColor: cat.color,
            value: itemDef.value,
            itemCategory: itemDef.category,
            sourceInfo: source ? {
              skill: SKILL_DEFINITIONS[source.skillId]?.name || source.skillId,
              detail: source.detail,
            } : null,
          });
        });
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  // --- Shared Helpers ---

  renderHeader(container, cat, completionText) {
    const header = document.createElement("div");
    header.className = "skills-options-header";
    header.innerHTML = `<h2 style="color: ${cat.color}; border-bottom-color: ${cat.color}">
      ${cat.icon} ${cat.name}
      <span class="codex-section-completion">${completionText}</span>
    </h2>`;
    container.appendChild(header);
  }

  createTile(icon, name, isLocked) {
    const card = document.createElement("div");
    card.className = `skill-action-card ${isLocked ? "locked" : ""}`;
    const displayIcon = isLocked ? ICONS.misc.locked : icon;
    const displayName = isLocked ? "???" : name;
    card.innerHTML = `
      <div class="action-icon">${displayIcon}</div>
      <div class="action-name">${displayName}</div>
    `;
    return card;
  }

  // --- Completion ---

  getCategoryCompletion(categoryId, char) {
    switch (categoryId) {
      case "MONSTERS": {
        const keys = Object.keys(SKILL_DEFINITIONS.FIGHTING?.options || {});
        return {
          discovered: keys.filter(k => gameState.discoveries.has(`monster:${k}`)).length,
          total: keys.length,
        };
      }
      case "NODES": {
        const keys = Object.keys(RESOURCE_NODES);
        return {
          discovered: keys.filter(k => gameState.discoveries.has(`node:${k}`)).length,
          total: keys.length,
        };
      }
      case "RECIPES": {
        const keys = Object.keys(SKILL_DEFINITIONS.SMITHING?.options || {});
        return {
          discovered: keys.filter(k => gameState.discoveries.has(`recipe:${k}`)).length,
          total: keys.length,
        };
      }
      case "BIOMES": {
        let total = 0;
        let discovered = 0;
        Object.keys(TERRAIN_TYPES).forEach(biomeId => {
          const opt = this.findBiomeOption(biomeId);
          if (!opt) return;
          total++;
          if (gameState.discoveries.has(`biome:${biomeId}`)) discovered++;
        });
        return { discovered, total };
      }
      case "ITEMS": {
        let total = 0;
        let discovered = 0;
        Object.entries(ITEM_DEFINITIONS).forEach(([itemId, def]) => {
          if (def.category === "Currency") return;
          total++;
          if (gameState.discoveries.has(`item:${itemId}`)) discovered++;
        });
        return { discovered, total };
      }
      default:
        return { discovered: 0, total: 0 };
    }
  }

  // --- Discovery Helpers ---

  findResourceOption(resourceKey) {
    const gatheringSkills = ["MINING", "WOODCUTTING", "FISHING", "FORAGING"];
    for (const skillId of gatheringSkills) {
      const skill = SKILL_DEFINITIONS[skillId];
      if (!skill?.options) continue;
      const option = Object.values(skill.options).find(opt => opt.resourceId === resourceKey);
      if (option) return { skillId, option };
    }
    return null;
  }

  findBiomeOption(biomeId) {
    const exploring = SKILL_DEFINITIONS.EXPLORING;
    if (!exploring?.options) return null;
    const entry = Object.entries(exploring.options).find(
      ([key, opt]) => opt.biomeId === biomeId
    );
    return entry ? entry[1] : null;
  }

  getResourcesInBiome(biomeId) {
    return Object.values(RESOURCE_NODES)
      .filter(node => node.allowedBiomes && node.allowedBiomes.includes(biomeId))
      .map(node => ({ name: node.name, icon: node.icon }));
  }

  update() {}

  // --- Detail Popup ---

  showDetailPopup(data) {
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
          ${data.itemCategory ? `<div class="codex-subtitle">${data.itemCategory}</div>` : ""}
        </div>
      </div>
    `;

    // Stats grid
    const statRows = [];
    if (data.level !== undefined) {
      statRows.push(`<div class="codex-stat-row"><span class="stat-label">Level</span><span class="stat-value">${data.level}</span></div>`);
    }
    if (data.xp !== undefined) {
      statRows.push(`<div class="codex-stat-row"><span class="stat-label">XP</span><span class="stat-value">${data.xp}</span></div>`);
    }
    if (data.interval !== undefined) {
      statRows.push(`<div class="codex-stat-row"><span class="stat-label">Time</span><span class="stat-value">${(data.interval / 1000)}s</span></div>`);
    }
    if (data.value !== undefined) {
      statRows.push(`<div class="codex-stat-row"><span class="stat-label">Value</span><span class="stat-value">${data.value} ${ICONS.items.coins}</span></div>`);
    }
    if (statRows.length > 0) {
      body.innerHTML += `<div class="codex-stat-grid">${statRows.join("")}</div>`;
    }

    // Cost section (recipes)
    if (data.cost) {
      let costHtml = `<div class="codex-section-title">Materials Required</div><div class="codex-cost-list">`;
      Object.entries(data.cost).forEach(([id, qty]) => {
        const iDef = getItemDefinition(id);
        const itemName = iDef ? iDef.name : id;
        const itemIcon = iDef ? iDef.icon : ICONS.misc.package;
        costHtml += `<div class="codex-cost-item">${itemIcon} ${qty} ${itemName}</div>`;
      });
      costHtml += `</div>`;
      body.innerHTML += costHtml;
    }

    // Drops section (monsters)
    if (data.drops) {
      const totalWeight = data.drops.reduce((sum, e) => sum + e.weight, 0);
      let dropsHtml = `<div class="codex-section-title">Drops</div><div class="codex-drop-table">`;
      data.drops.forEach((entry) => {
        const itemDef = getItemDefinition(entry.item);
        const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
        const icon = itemDef ? itemDef.icon : ICONS.misc.package;
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

    // Resource drops (default_drops for resource nodes)
    if (data.resourceKey) {
      const nodeConfig = RESOURCE_NODES[data.resourceKey];
      if (nodeConfig?.default_drops) {
        const table = nodeConfig.default_drops;
        const totalWeight = table.reduce((sum, e) => sum + e.weight, 0);
        let dropsHtml = `<div class="codex-section-title">Drops</div><div class="codex-drop-table">`;
        table.forEach((entry) => {
          const itemDef = getItemDefinition(entry.item);
          const percent = ((entry.weight / totalWeight) * 100).toFixed(0);
          const icon = itemDef ? itemDef.icon : ICONS.misc.package;
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

    // Allowed biomes (resources)
    if (data.allowedBiomes) {
      let biomesHtml = `<div class="codex-section-title">Found In</div><div class="codex-biome-tags">`;
      data.allowedBiomes.forEach(biomeId => {
        const biomeDef = TERRAIN_TYPES[biomeId];
        if (biomeDef) {
          biomesHtml += `<span class="biome-tag">${biomeDef.symbol} ${biomeDef.name}</span>`;
        }
      });
      biomesHtml += `</div>`;
      body.innerHTML += biomesHtml;
    }

    // Resources found in biome
    if (data.resourcesFound && data.resourcesFound.length > 0) {
      let resHtml = `<div class="codex-section-title">Resources</div><div class="codex-resource-list">`;
      data.resourcesFound.forEach(r => {
        resHtml += `<div class="codex-resource-item">${r.icon} ${r.name}</div>`;
      });
      resHtml += `</div>`;
      body.innerHTML += resHtml;
    }

    // Source info (items)
    if (data.sourceInfo) {
      let sourceHtml = `<div class="codex-section-title">Source</div>`;
      sourceHtml += `<div class="codex-stat-row"><span class="stat-label">Skill</span><span class="stat-value">${data.sourceInfo.skill}</span></div>`;
      if (data.sourceInfo.detail) {
        sourceHtml += `<div class="codex-stat-row"><span class="stat-label">Location</span><span class="stat-value">${data.sourceInfo.detail}</span></div>`;
      }
      body.innerHTML += sourceHtml;
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

  // --- Utility ---

  hexToRgb(hex) {
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
