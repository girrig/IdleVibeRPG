import { gameState } from "../../core/GameState";
import { goalManager } from "../../core/GoalManager";
import { ITEM_DEFINITIONS } from "../../core/ItemRegistry";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: "❓" };
}

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
        ? "rgba(251, 191, 36, 0.2)"
        : "rgba(148, 163, 184, 0.2)"; // Amber/Slate bg
      const badgeTextColor = char.currentActivity ? "#fbbf24" : "#94a3b8";

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

      goalSection.innerHTML = `
            <div class="section-title">Current Task</div>
            <div class="active-goal-card">
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
                    Status: <span style="color: #fbbf24">${goal.status}</span>
                </div>
                <button class="btn-cancel-goal">Cancel Task</button>
            </div>
        `;
      goalSection
        .querySelector(".btn-cancel-goal")
        .addEventListener("click", () => {
          goalManager.clearGoal(char);
          this.uiManager.renderMainWindow();
        });
    } else {
      goalSection.innerHTML = `
            <div class="section-title">Current Task</div>
            <div class="no-goal-state">
                <div>No active task</div>
                <button class="btn-set-goal">Select Item Target</button>
            </div>
        `;
      goalSection
        .querySelector(".btn-set-goal")
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
                 return `
                <div class="skill-row-compact" title="${skill.xp} / ${xpNeeded} XP">
                    <div class="skill-info-compact">
                    <span class="skill-name-compact">${name}</span>
                    <span class="skill-lvl-compact">Lv ${skill.level}</span>
                    </div>
                    <div class="skill-bar-bg-compact">
                    <div class="skill-bar-fill-compact ${id}" style="width: ${percent}%"></div>
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
                <div class="stat-label" style="color:#f87171">STR</div>
                <div class="stat-value stat-pill">${char.stats.strength}</div>
             </div>
             <div class="stat-box">
                <div class="stat-label" style="color:#4ade80">DEX</div>
                <div class="stat-value stat-pill">${char.stats.dexterity}</div>
             </div>
             <div class="stat-box">
                <div class="stat-label" style="color:#60a5fa">INT</div>
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
          const badgeTextColor = c.currentActivity ? "#fbbf24" : "#94a3b8";

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

          goalSection.innerHTML = `
                <div class="section-title">Current Task</div>
                <div class="active-goal-card">
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
                        Status: <span style="color: #fbbf24">${goal.status}</span>
                    </div>
                    <button class="btn-cancel-goal">Cancel Task</button>
                </div>
            `;
          goalSection
            .querySelector(".btn-cancel-goal")
            .addEventListener("click", () => {
              goalManager.clearGoal(char);
              uiManager.renderMainWindow();
            });
        } else {
          // Render Empty State
          goalSection.innerHTML = `
                <div class="section-title">Current Task</div>
                <div class="no-goal-state">
                    <div>No active task</div>
                    <button class="btn-set-goal">Select Item Target</button>
                </div>
            `;
          goalSection
            .querySelector(".btn-set-goal")
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

        // Update Bar
        const barFill = goalSection.querySelector(".goal-progress-bar-fill");
        if (barFill) {
          barFill.style.width = `${progressPercent}%`;
        }

        // Update Status
        const statusSpan = goalSection.querySelector(".goal-status span");
        if (statusSpan) statusSpan.innerText = goal.status;
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

        const lvl = row.querySelector(".skill-lvl-compact");
        if (lvl) lvl.innerText = `Lv ${skill.level}`;
        row.title = `${skill.xp} / ${xpNeeded} XP`;
      }
    });
  }
}
