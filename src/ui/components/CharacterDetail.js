import { gameState } from "../../core/GameState";
import { goalManager } from "../../core/GoalManager";
import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";
import { SKILL_DEFINITIONS } from "../../core/SkillRegistry";
import { UI_COLORS, SKILL_COLORS } from "../../core/Constants";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "❓" };
}

export class CharacterDetail {
  static isDragging = false;

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
      // We could move these rgba strings to a helper if we want strict globals,
      // but key colors are now in UI_COLORS.
      // Using helper to derive rgba from constant would be ideal but for now using literals matching conventions
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

  static getQueueHTML(char) {
    if (!char.goalQueue || char.goalQueue.length === 0) return "";

    return `<div class="goal-queue-list" style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          ${char.goalQueue
            .map((q, i) => {
              // Handle Group vs Legacy
              const targetItem = q.mainGoal ? q.mainGoal.itemId : q.targetItem;
              const targetQty = q.mainGoal
                ? q.mainGoal.quantity
                : q.targetQuantity;

              const qDef = getItemDefinition(targetItem);
              const isGroup = !!q.steps && q.steps.length > 1;

              // Render Steps if it's a group
              let stepsHtml = "";
              if (isGroup) {
                stepsHtml = `<div style="margin-top: 4px; padding-left: 0; display: flex; flex-direction: column; gap: 2px;">
                    ${q.steps
                      .map((step, idx) => {
                        const sDef = getItemDefinition(step.targetItem);
                        return `<div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                           <span style="opacity: 0.5; min-width: 12px;">${idx + 1}.</span> 
                           <span>${sDef.icon}</span>
                           <span>Get ${step.targetQuantity} ${sDef.name}</span>
                        </div>`;
                      })
                      .join("")}
                 </div>`;
              }

              // Added draggable and data-index
              return `<div class="queue-item-card" draggable="true" data-index="${i}" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; display: flex; align-items: flex-start; gap: 10px; cursor: grab;">
                  <div style="color: #64748b; font-size: 12px; min-width: 15px; pointer-events: none; margin-top: 2px;">${i + 1}.</div>
                  <div style="font-size: 16px; pointer-events: none; margin-top: 0px;">${qDef.icon}</div>
                  <div style="flex: 1; pointer-events: none;">
                    <div style="font-size: 13px; color: #e2e8f0; font-weight: 500;">Get ${targetQty} ${qDef.name}</div>
                    ${stepsHtml}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; pointer-events: none; margin-top: 2px;">Queued</div>
                  <button class="btn-remove-queue" data-index="${i}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 2px; margin-top: 1px;">✕</button>
              </div>`;
            })
            .join("")}
      </div>`;
  }

  static bindQueueDragEvents(container, char, uiManager) {
    const list = container.querySelector(".goal-queue-list");
    if (!list) return;

    let draggedItem = null;
    let draggedIndex = null; // Index from source data

    // Drag Proxy variables
    let dragProxy = null;
    let startX = 0;
    let startY = 0;

    // Transparent empty image to hide default ghost
    const emptyImg = new Image();
    emptyImg.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    const items = list.querySelectorAll(".queue-item-card");
    items.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        draggedItem = item;
        // Don't rely on dataset index during move, logic relies on DOM order
        draggedIndex = parseInt(item.dataset.index);

        CharacterDetail.isDragging = true; // Pause updates

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setDragImage(emptyImg, 0, 0); // Hide default

        // Create Custom Proxy
        const rect = item.getBoundingClientRect();
        dragProxy = item.cloneNode(true);
        dragProxy.style.position = "fixed";
        dragProxy.style.zIndex = "9999";
        dragProxy.style.width = `${rect.width}px`;
        dragProxy.style.height = `${rect.height}px`;
        dragProxy.style.left = `${rect.left}px`;
        dragProxy.style.top = `${rect.top}px`;
        dragProxy.style.pointerEvents = "none";
        dragProxy.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)"; // Moderate shadow
        // dragProxy.style.transform = "scale(1.05)"; // Removed per feedback
        dragProxy.style.opacity = "1";
        dragProxy.style.backgroundColor = "#1e293b";
        dragProxy.style.borderRadius = "4px";

        document.body.appendChild(dragProxy);

        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        // Hide original but keep in layout?
        // User wants "list contents move".
        // If we want gaps to close, we should display:none or similar?
        // But usually standard behavior is the "gap" travels with the mouse.
        // So we keep opacity 0 (invisible but takes space) and move IT around DOM.
        item.style.opacity = "0";
      });

      // Update proxy position
      item.addEventListener("drag", (e) => {
        if (dragProxy && e.clientX !== 0 && e.clientY !== 0) {
          dragProxy.style.left = `${e.clientX - startX}px`;
          dragProxy.style.top = `${e.clientY - startY}px`;
        }
      });

      item.addEventListener("dragend", () => {
        CharacterDetail.isDragging = false; // Resume updates
        item.style.opacity = "1";
        if (dragProxy) {
          dragProxy.remove();
          dragProxy = null;
        }
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = "move";

        // Live Reordering Logic
        if (draggedItem && draggedItem !== item) {
          const rect = item.getBoundingClientRect();
          const next = (e.clientY - rect.top) / rect.height > 0.5;
          list.insertBefore(draggedItem, (next && item.nextSibling) || item);
        }
      });

      item.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // On Drop, reconstruct the queue based on new DOM order
        CharacterDetail.isDragging = false; // Resume updates
        const newQueue = [];
        const newDomItems = list.querySelectorAll(".queue-item-card");

        newDomItems.forEach((domItem) => {
          const originalIndex = parseInt(domItem.dataset.index);
          if (char.goalQueue[originalIndex]) {
            newQueue.push(char.goalQueue[originalIndex]);
          }
        });

        // Update Model
        char.goalQueue = newQueue;
        gameState.saveGame();

        // Refresh UI
        uiManager.renderMainWindow();
      });
    });
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
    `;
    container.appendChild(header);

    // Dashboard Grid
    const dashboard = document.createElement("div");
    dashboard.className = "char-dashboard-layout";
    container.appendChild(dashboard);

    // -- LEFT COLUMN (Main) --
    const leftCol = document.createElement("div");
    leftCol.className = "dash-col-main";
    dashboard.appendChild(leftCol);

    // Goal Section (Appended to Left)
    const goalSection = document.createElement("div");
    goalSection.className = "char-detail-section char-goal-section";

    // Logic for goal content (Same as before)
    if (char.activeGoal) {
      const goal = char.activeGoal;
      const targetDef = getItemDefinition(goal.targetItem);

      const currentCount = gameState.inventory.getCount(goal.targetItem);
      const startCount = goal.startCount || 0;
      const targetQuantity = goal.targetQuantity || 1;
      const collected = Math.max(0, currentCount - startCount);
      const progressPercent = Math.min(100, (collected / targetQuantity) * 100);

      // Render Queue List
      const queueHtml = CharacterDetail.getQueueHTML(char);

      const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="section-title" style="margin-bottom: 0;">Tasks</div>
            <button class="btn-top-action" style="padding: 5px 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
                + Queue Task
            </button>
        </div>`;

      goalSection.innerHTML = `
            ${headerHtml}
                <div class="active-goal-card" style="margin-bottom: 10px; position: relative; padding-top: 15px;">
                    <button class="btn-cancel-goal" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #fca5a5; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 14px; padding: 0;" title="Cancel Current Task">✕</button>
                    <div class="goal-info">
                        <span class="goal-icon">${targetDef.icon}</span>
                        <div class="goal-text">
                            <div class="goal-name">Get ${targetQuantity} ${targetDef.name}</div>
                            <div class="goal-progress-text">${collected} / ${targetQuantity}</div>
                        </div>
                    </div>
                    <div class="goal-progress-bar-bg">
                        <div class="goal-progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="goal-status">
                        Status: <span style="color: ${UI_COLORS.STATUS_ACTIVE}">${goal.status}</span>
                    </div>
                    ${
                      char.activeGoalGroup &&
                      char.activeGoalGroup.steps.length > 1
                        ? `<div class="active-goal-steps" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px;">
                            ${char.activeGoalGroup.steps
                              .map((step, idx) => {
                                const sDef = getItemDefinition(step.targetItem);
                                const isCurrent =
                                  idx === char.activeGoalGroup.currentStepIndex;
                                const isDone =
                                  idx < char.activeGoalGroup.currentStepIndex;
                                const color = isCurrent
                                  ? "#e2e8f0"
                                  : isDone
                                    ? "#4ade80"
                                    : "#64748b";
                                const icon = isDone ? "✓" : sDef.icon;
                                const weight = isCurrent ? "500" : "400";
                                return `
                                <div style="font-size: 11px; color: ${color}; display: flex; align-items: center; gap: 6px; font-weight: ${weight};">
                                    <span style="min-width: 12px; opacity: 0.7;">${idx + 1}.</span>
                                    <span>${icon}</span>
                                    <span>Get ${step.targetQuantity} ${sDef.name}</span>
                                    ${isCurrent ? '<span style="font-size: 9px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 4px; border-radius: 2px;">Active</span>' : ""}
                                </div>`;
                              })
                              .join("")}
                        </div>`
                        : ""
                    }
                </div>
            
            ${queueHtml}
        `;

      // Bind Queue Drag Events
      CharacterDetail.bindQueueDragEvents(goalSection, char, this.uiManager);

      goalSection
        .querySelector(".btn-cancel-goal")
        .addEventListener("click", () => {
          goalManager.clearGoal(char);
          this.uiManager.renderMainWindow();
        });

      // Remove Queue Item Listeners
      goalSection.querySelectorAll(".btn-remove-queue").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.target.dataset.index);
          goalManager.removeGoalFromQueue(char, idx);
          this.uiManager.renderMainWindow();
        });
      });

      goalSection
        .querySelector(".btn-top-action")
        .addEventListener("click", () => {
          this.uiManager.showItemSelectionModal((itemId, quantity) => {
            goalManager.setGoal(char, itemId, quantity);
            this.uiManager.renderMainWindow();
          });
        });
    } else {
      const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="section-title" style="margin-bottom: 0;">Tasks</div>
            <button class="btn-top-action" style="padding: 5px 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
                + New Task
            </button>
        </div>`;

      goalSection.innerHTML = `
            ${headerHtml}
            <div class="no-goal-state">
                <div style="color: #94a3b8;">No active tasks</div>
            </div>
        `;
      goalSection
        .querySelector(".btn-top-action")
        .addEventListener("click", () => {
          this.uiManager.showItemSelectionModal((itemId, quantity) => {
            goalManager.setGoal(char, itemId, quantity);
            this.uiManager.renderMainWindow();
          });
        });
    }
    leftCol.appendChild(goalSection);

    // Skills Section (Appended to Left)
    const skillsSection = document.createElement("div");
    skillsSection.className = "char-detail-section char-skills-section";
    skillsSection.innerHTML = `
        <div class="section-title">Skills</div>
        <div class="skills-grid-detail">
             ${Object.entries(char.skills)
               .map(([id, skill]) => ({
                 id,
                 skill,
                 name: id.charAt(0).toUpperCase() + id.slice(1),
               }))
               .sort((a, b) => a.name.localeCompare(b.name))
               .map(({ id, skill, name }) => {
                 const xpNeeded = skill.level * 100;
                 const percent = Math.min((skill.xp / xpNeeded) * 100, 100);
                 const def = SKILL_DEFINITIONS[id.toUpperCase()];
                 const color = def ? def.color : UI_COLORS.PURCHASED; // Fallback green -> PURCHASED

                 return `
                <div class="skill-row-compact" title="${skill.xp} / ${xpNeeded} XP">
                    <div class="skill-info-compact">
                    <span class="skill-name-compact">${name}</span>
                    <span class="skill-lvl-compact">Lv ${skill.level}</span>
                    </div>
                    <div class="skill-bar-bg-compact">
                    <div class="skill-bar-fill-compact ${id}" style="width: ${percent}%; background-color: ${color}"></div>
                    </div>
                </div>
                `;
               })
               .join("")}
        </div>
    `;
    leftCol.appendChild(skillsSection);

    // -- RIGHT COLUMN (Side) --
    const rightCol = document.createElement("div");
    rightCol.className = "dash-col-side";
    dashboard.appendChild(rightCol);

    // Attributes Panel (New)
    const statsSection = document.createElement("div");
    statsSection.className = "char-detail-section char-stats-section";
    statsSection.innerHTML = `
        <div class="section-title">Attributes</div>
        <div class="stats-grid-visual">
             <div class="stat-box">
                <div class="stat-label" style="color:${UI_COLORS.STAT_STR}">STR</div>
                <div class="stat-value stat-pill">${char.stats.strength}</div>
             </div>
             <div class="stat-box">
                <div class="stat-label" style="color:${UI_COLORS.STAT_DEX}">DEX</div>
                <div class="stat-value stat-pill">${char.stats.dexterity}</div>
             </div>
             <div class="stat-box">
                <div class="stat-label" style="color:${UI_COLORS.STAT_INT}">INT</div>
                <div class="stat-value stat-pill">${char.stats.intelligence}</div>
             </div>
        </div>
    `;
    rightCol.appendChild(statsSection);

    // Equipment Section (Appended to Right)
    const equipSection = document.createElement("div");
    equipSection.className = "char-detail-section char-equip-section";
    equipSection.innerHTML = `
         <div class="section-title">Equipment</div>
         <div class="equip-slots-layout">
            <div class="equip-row">
                <div class="equip-slot-mini" title="Head">🧢</div>
            </div>
            <div class="equip-row">
                <div class="equip-slot-mini" title="Main Hand">⚔️</div>
                <div class="equip-slot-mini" title="Chest">👕</div>
                <div class="equip-slot-mini" title="Off Hand">🛡️</div>
            </div>
            <div class="equip-row">
                 <div class="equip-slot-mini" title="Gloves">🧤</div>
                 <div class="equip-slot-mini" title="Legs">👖</div>
                 <div class="equip-slot-mini" title="Belt">🥋</div>
            </div>
             <div class="equip-row">
                 <div class="equip-slot-mini" title="Ring">💍</div>
                 <div class="equip-slot-mini" title="Feet">👢</div>
                 <div class="equip-slot-mini" title="Trinket">🧿</div>
            </div>
        </div>
    `;
    rightCol.appendChild(equipSection);
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

    // Update Attributes
    const statValues = container.querySelectorAll(".stat-value.stat-pill");
    if (statValues.length >= 3) {
      statValues[0].innerText = char.stats.strength;
      statValues[1].innerText = char.stats.dexterity;
      statValues[2].innerText = char.stats.intelligence;
    }

    // Update Goal Section
    const goalSection = container.querySelector(".char-goal-section");
    if (goalSection) {
      const hasActiveGoal = !!char.activeGoal;
      const isShowingActive = !!goalSection.querySelector(".active-goal-card");

      // State mismatch detection: Re-render section if needed
      if (hasActiveGoal !== isShowingActive) {
        // Re-render this section completely
        // Actually, we can just use the same logic as renderDetailContent's goal part.
        // Or better, let's just delegate to a helper or just rewrite innerHTML here.
        // Since we are in a static method, we don't have easy access to 'this'.
        // But we can reproduce the render logic since it's short.

        if (hasActiveGoal) {
          // Render Active State
          const goal = char.activeGoal;
          const targetDef = getItemDefinition(goal.targetItem);
          const currentCount = gameState.inventory.getCount(goal.targetItem);
          const startCount = goal.startCount || 0;
          const targetQuantity = goal.targetQuantity || 1;
          const collected = Math.max(0, currentCount - startCount);
          const progressPercent = Math.min(
            100,
            (collected / targetQuantity) * 100,
          );

          // Render Queue List
          const queueHtml = CharacterDetail.getQueueHTML(char);

          const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="section-title" style="margin-bottom: 0;">Tasks</div>
                <button class="btn-top-action" style="padding: 5px 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
                    + Queue Task
                </button>
            </div>`;

          goalSection.innerHTML = `
                ${headerHtml}
                <div class="active-goal-card" style="margin-bottom: 10px; position: relative; padding-top: 15px;">
                    <button class="btn-cancel-goal" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #fca5a5; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 14px; padding: 0;" title="Cancel Current Task">✕</button>
                    <div class="goal-info">
                        <span class="goal-icon">${targetDef.icon}</span>
                        <div class="goal-text">
                            <div class="goal-name">Get ${targetQuantity} ${targetDef.name}</div>
                            <div class="goal-progress-text">${collected} / ${targetQuantity}</div>
                        </div>
                    </div>
                    <div class="goal-progress-bar-bg">
                        <div class="goal-progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="goal-status">
                        Status: <span style="color: ${UI_COLORS.STATUS_ACTIVE}">${goal.status}</span>
                    </div>
                    ${
                      char.activeGoalGroup &&
                      char.activeGoalGroup.steps.length > 1
                        ? `<div class="active-goal-steps" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px;">
                            ${char.activeGoalGroup.steps
                              .map((step, idx) => {
                                const sDef = getItemDefinition(step.targetItem);
                                const isCurrent =
                                  idx === char.activeGoalGroup.currentStepIndex;
                                const isDone =
                                  idx < char.activeGoalGroup.currentStepIndex;
                                const color = isCurrent
                                  ? "#e2e8f0"
                                  : isDone
                                    ? "#4ade80"
                                    : "#64748b";
                                const icon = isDone ? "✓" : sDef.icon;
                                const weight = isCurrent ? "500" : "400";
                                return `
                                <div style="font-size: 11px; color: ${color}; display: flex; align-items: center; gap: 6px; font-weight: ${weight};">
                                    <span style="min-width: 12px; opacity: 0.7;">${idx + 1}.</span>
                                    <span>${icon}</span>
                                    <span>Get ${step.targetQuantity} ${sDef.name}</span>
                                    ${isCurrent ? '<span style="font-size: 9px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 4px; border-radius: 2px;">Active</span>' : ""}
                                </div>`;
                              })
                              .join("")}
                        </div>`
                        : ""
                    }
                </div>
                
                ${queueHtml}
            `;

          // Bind Queue Drag Events
          CharacterDetail.bindQueueDragEvents(goalSection, char, uiManager);

          goalSection
            .querySelector(".btn-cancel-goal")
            .addEventListener("click", () => {
              goalManager.clearGoal(char);
              uiManager.renderMainWindow();
            });

          // Remove Queue Item Listeners
          goalSection.querySelectorAll(".btn-remove-queue").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const idx = parseInt(e.target.dataset.index);
              goalManager.removeGoalFromQueue(char, idx);
              uiManager.renderMainWindow();
            });
          });

          goalSection
            .querySelector(".btn-top-action")
            .addEventListener("click", () => {
              uiManager.showItemSelectionModal((itemId, quantity) => {
                goalManager.setGoal(char, itemId, quantity);
                uiManager.renderMainWindow();
              });
            });
        } else {
          // Render Empty State
          const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="section-title" style="margin-bottom: 0;">Tasks</div>
                <button class="btn-top-action" style="padding: 5px 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
                    + New Task
                </button>
            </div>`;

          goalSection.innerHTML = `
                ${headerHtml}
                <div class="no-goal-state">
                    <div style="color: #94a3b8;">No active tasks</div>
                </div>
            `;
          goalSection
            .querySelector(".btn-top-action")
            .addEventListener("click", () => {
              uiManager.showItemSelectionModal((itemId, quantity) => {
                goalManager.setGoal(char, itemId, quantity);
                uiManager.renderMainWindow();
              });
            });
        }
      }
      // If states match and we have a goal, update values
      else if (hasActiveGoal) {
        const goal = char.activeGoal;
        const targetDef = getItemDefinition(goal.targetItem); // Needed for icon/name update
        const currentCount = gameState.inventory.getCount(goal.targetItem);
        const startCount = goal.startCount || 0;
        const targetQuantity = goal.targetQuantity || 1;
        const collected = Math.max(0, currentCount - startCount);
        const progressPercent = Math.min(
          100,
          (collected / targetQuantity) * 100,
        );

        // Update Text
        const progressText = goalSection.querySelector(".goal-progress-text");
        if (progressText) {
          progressText.innerText = `${collected} / ${targetQuantity}`;
        }

        // Update Name and Icon (Fix for auto-advancing tasks)
        const nameEl = goalSection.querySelector(".goal-name");
        if (nameEl)
          nameEl.innerText = `Get ${targetQuantity} ${targetDef.name}`;

        const iconEl = goalSection.querySelector(".goal-icon");
        if (iconEl) iconEl.innerText = targetDef.icon;

        // Update Bar
        const barFill = goalSection.querySelector(".goal-progress-bar-fill");
        if (barFill) {
          barFill.style.width = `${progressPercent}%`;
        }

        // Update Status
        const statusSpan = goalSection.querySelector(".goal-status span");
        if (statusSpan) statusSpan.innerText = goal.status;

        // Update Steps List (Active Goal Group)
        const stepsContainer = goalSection.querySelector(".active-goal-steps");
        if (
          stepsContainer &&
          char.activeGoalGroup &&
          char.activeGoalGroup.steps.length > 1
        ) {
          stepsContainer.innerHTML = char.activeGoalGroup.steps
            .map((step, idx) => {
              const sDef = getItemDefinition(step.targetItem);
              const isCurrent = idx === char.activeGoalGroup.currentStepIndex;
              const isDone = idx < char.activeGoalGroup.currentStepIndex;
              const color = isCurrent
                ? "#e2e8f0"
                : isDone
                  ? "#4ade80"
                  : "#64748b";
              const icon = isDone ? "✓" : sDef.icon;
              const weight = isCurrent ? "500" : "400";
              return `
                <div style="font-size: 11px; color: ${color}; display: flex; align-items: center; gap: 6px; font-weight: ${weight};">
                    <span style="min-width: 12px; opacity: 0.7;">${idx + 1}.</span>
                    <span>${icon}</span>
                    <span>Get ${step.targetQuantity} ${sDef.name}</span>
                    ${isCurrent ? '<span style="font-size: 9px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 4px; border-radius: 2px;">Active</span>' : ""}
                </div>`;
            })
            .join("");
        }

        // Update Queue List (Fix for stale queue visibility)
        const currentQueueList = goalSection.querySelector(".goal-queue-list");
        const newQueueHtml = CharacterDetail.getQueueHTML(char);

        if (currentQueueList) {
          if (newQueueHtml) {
            // Replace existing queue
            // SKIP UPDATE IF DRAGGING
            if (
              !CharacterDetail.isDragging &&
              currentQueueList.outerHTML !== newQueueHtml
            ) {
              currentQueueList.outerHTML = newQueueHtml;
              CharacterDetail.bindQueueDragEvents(goalSection, char, uiManager);

              // Re-bind remove buttons
              goalSection
                .querySelectorAll(".btn-remove-queue")
                .forEach((btn) => {
                  btn.addEventListener("click", (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    goalManager.removeGoalFromQueue(char, idx);
                    uiManager.renderMainWindow();
                  });
                });
            }
          } else {
            // Remove queue if empty
            currentQueueList.remove();
          }
        } else if (newQueueHtml) {
          // Append new queue if none existed
          goalSection.insertAdjacentHTML("beforeend", newQueueHtml);
          CharacterDetail.bindQueueDragEvents(goalSection, char, uiManager);

          // Re-bind remove buttons
          goalSection.querySelectorAll(".btn-remove-queue").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const idx = parseInt(e.target.dataset.index);
              goalManager.removeGoalFromQueue(char, idx);
              uiManager.renderMainWindow();
            });
          });
        }
      }
    }

    // Update Skills
    Object.entries(char.skills).forEach(([id, skill]) => {
      const bar = container.querySelector(`.skill-bar-fill-compact.${id}`);
      const row = bar ? bar.closest(".skill-row-compact") : null;
      if (bar && row) {
        const xpNeeded = skill.level * 100;
        const percent = Math.min((skill.xp / xpNeeded) * 100, 100);
        bar.style.width = `${percent}%`;

        // Ensure color is set (in case of dynamic update, though strictly only needed on render usually,
        // unless we want to support dynamic theme changes without re-render.
        // But render sets style attribute, so we just update width here is fine.
        // Actually, let's enforce it just in case.)
        const def = SKILL_DEFINITIONS[id.toUpperCase()];
        if (def && def.color) bar.style.backgroundColor = def.color;

        const lvl = row.querySelector(".skill-lvl-compact");
        if (lvl) lvl.innerText = `Lv ${skill.level}`;
        row.title = `${skill.xp} / ${xpNeeded} XP`;
      }
    });
  }
}
