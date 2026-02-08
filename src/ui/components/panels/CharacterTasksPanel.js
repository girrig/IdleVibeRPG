import { gameState } from "../../../core/GameState";
import { goalManager } from "../../../core/GoalManager";
import { ITEM_DEFINITIONS } from "../../../core/ItemRegistry";
import { UI_COLORS } from "../../../core/Constants";
import { ICONS } from "../../../core/Icons";

function getItemDefinition(id) {
  return ITEM_DEFINITIONS[id] || { name: id, icon: ICONS.misc.locked };
}

export class CharacterTasksPanel {
  static isDragging = false;

  static render(container, char, uiManager) {
    const goalSection = document.createElement("div");
    goalSection.className = "char-detail-section char-goal-section";

    // Check if we need to render Active Goal, Active Activity (Non-Goal), or Empty state
    if (char.activeGoal) {
      CharacterTasksPanel.renderActiveState(goalSection, char, uiManager);
    } else if (char.currentActivity) {
      CharacterTasksPanel.renderActivityState(goalSection, char, uiManager);
    } else {
      CharacterTasksPanel.renderEmptyState(goalSection, char, uiManager);
    }

    container.appendChild(goalSection);
  }

  static renderActivityState(goalSection, char, uiManager) {
    // This is for activities WITHOUT a Goal (e.g. Exploring)
    const activity = char.currentActivity;

    // Try to find definition in Skills or Items
    // Ideally we know the skill definition from SkillRegistry
    // We can iterate skills to look for options? Or pass metadata?
    // Since activity.target is the ID.

    let icon = "⚡";
    let name = activity.target;

    // Hacky lookup? Or standard?
    // Exploring options are in SkillRegistry.
    // We can try to import SKILL_DEFINITIONS or just heuristics.
    // Let's assume the icon/name is sufficient or we can fetch it if we imports.
    // We imported ITEM_DEFINITIONS. We can import SKILL_DEFINITIONS too?
    // Or just display the target string formatted.

    const formattedName = name
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="section-title" style="margin-bottom: 0;">Current Activity</div>
        </div>`;

    goalSection.innerHTML = `
            ${headerHtml}
            <div class="active-goal-card activity-state" style="margin-bottom: 10px; position: relative; padding-top: 15px; border-color: #fbbf24;">
                <button class="btn-stop-activity" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #fca5a5; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 14px; padding: 0;" title="Stop Activity">⏹</button>
                <div class="goal-info">
                    <span class="goal-icon">${icon}</span>
                    <div class="goal-text">
                        <div class="goal-name">${formattedName}</div>
                        <div style="font-size: 11px; color: #94a3b8;">${activity.phase ? activity.phase : "Ongoing..."}</div>
                    </div>
                </div>
                 <div class="goal-progress-bar-bg" style="background: rgba(255,255,255,0.05);">
                    <div class="goal-progress-bar-fill" style="width: 100%; animation: pulse 2s infinite; background: #fbbf24;"></div>
                </div>
            </div>
            
             <div class="goal-queue-list" style="margin-top: 10px;">
                <div style="font-size: 11px; color: #64748b; font-style: italic;">
                    To set specific goals or queues, use the "+ New Task" button when idle.
                </div>
             </div>
      `;

    // Bind Stop
    goalSection
      .querySelector(".btn-stop-activity")
      .addEventListener("click", () => {
        char.stopActivity();
        uiManager.renderMainWindow();
      });
  }

  static renderActiveState(goalSection, char, uiManager) {
    const goal = char.activeGoal;
    const targetDef = getItemDefinition(goal.targetItem);

    const currentCount = gameState.inventory.getCount(goal.targetItem);
    const startCount = goal.startCount || 0;
    const targetQuantity = goal.targetQuantity || 1;
    const collected = Math.max(0, currentCount - startCount);
    const progressPercent = Math.min(100, (collected / targetQuantity) * 100);

    // Render Queue List
    const queueHtml = CharacterTasksPanel.getQueueHTML(char);

    const headerHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div class="section-title" style="margin-bottom: 0;">Tasks</div>
            <button class="btn-top-action" style="padding: 5px 10px; background: #3b82f6; border: 1px solid #2563eb; border-radius: 4px; color: white; cursor: pointer; font-size: 12px; font-weight: 500;">
                + Queue Task
            </button>
        </div>`;

    goalSection.innerHTML = `
            ${headerHtml}
                <div class="active-goal-card" draggable="true" data-index="-1" data-group-id="${char.activeGoalGroup ? char.activeGoalGroup.id : ""}" style="margin-bottom: 10px; position: relative; padding-top: 15px; cursor: grab;">
                    <button class="btn-cancel-goal" style="position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #fca5a5; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 14px; padding: 0;" title="Cancel Current Task">✕</button>
                    <div class="goal-info">
                        <span class="goal-icon">${targetDef.icon}</span>
                        <div class="goal-text">
                            <div class="goal-name">Get ${targetQuantity} ${targetDef.name} <span class="goal-progress-inline" style="color: #94a3b8; font-size: 0.9em; margin-left: 6px;">(${collected}/${targetQuantity})</span></div>
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
                        ? CharacterTasksPanel.renderGroupSteps(char)
                        : ""
                    }
                </div>
            
            ${queueHtml}
        `;

    CharacterTasksPanel.bindEvents(goalSection, char, uiManager);
  }

  static renderEmptyState(goalSection, char, uiManager) {
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

    CharacterTasksPanel.bindEvents(goalSection, char, uiManager);
  }

  static renderGroupSteps(char) {
    return `<div class="active-goal-steps" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px;">
        ${char.activeGoalGroup.steps
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
            // Sub-task Progress
            const sCurrent = gameState.inventory.getCount(step.targetItem);
            // If undefined (Pending), assume we start from NOW (Relative)
            const sStart =
              step.startCount !== undefined ? step.startCount : sCurrent;
            const sCollected = isDone
              ? step.targetQuantity
              : Math.max(0, sCurrent - sStart);
            const weight = isCurrent ? "500" : "400";

            return `
            <div style="font-size: 11px; color: ${color}; display: flex; align-items: center; gap: 6px; font-weight: ${weight};">
                <span style="min-width: 12px; opacity: 0.7;">${idx + 1}.</span>
                <span>${icon}</span>
                <span>Get ${step.targetQuantity} ${sDef.name} <span style="opacity: 0.7;">(${sCollected}/${step.targetQuantity})</span></span>
                ${isCurrent ? '<span style="font-size: 9px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 0 4px; border-radius: 2px;">Active</span>' : ""}
            </div>`;
          })
          .join("")}
    </div>`;
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

              // Progress Logic Helper
              const getProgressHtml = (step, isDone = false) => {
                const sCurrent = gameState.inventory.getCount(step.targetItem);
                const sStart =
                  step.startCount !== undefined ? step.startCount : sCurrent;
                const sCollected = isDone
                  ? step.targetQuantity
                  : Math.max(0, sCurrent - sStart);
                return `<span style="opacity: 0.7; font-size: 0.9em; margin-left: 4px;">(${sCollected}/${step.targetQuantity})</span>`;
              };

              // Render Steps if it's a group
              let stepsHtml = "";
              if (isGroup) {
                stepsHtml = `<div style="margin-top: 4px; padding-left: 0; display: flex; flex-direction: column; gap: 2px;">
                    ${q.steps
                      .map((step, idx) => {
                        const sDef = getItemDefinition(step.targetItem);
                        const isDone = (q.currentStepIndex || 0) > idx;
                        const checkMark = isDone ? "✓" : "";

                        return `<div style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
                           <span style="opacity: 0.5; min-width: 12px;">${checkMark || idx + 1 + "."}</span> 
                           <span>${sDef.icon}</span>
                           <span>Get ${step.targetQuantity} ${sDef.name} ${getProgressHtml(step, isDone)}</span>
                        </div>`;
                      })
                      .join("")}
                 </div>`;
              }

              // If NOT a group (or effectively single step which is the main goal), we show progress on the main line
              // But 'q' might be a Group object, so we look at q.steps[0] if available for the progress data.
              let mainProgress = "";
              if (!isGroup && q.steps && q.steps.length > 0) {
                mainProgress = getProgressHtml(q.steps[0], false);
              }

              // Added draggable and data-index
              return `<div class="queue-item-card" draggable="true" data-index="${i}" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; display: flex; align-items: flex-start; gap: 10px; cursor: grab;">
                  <div style="color: #64748b; font-size: 12px; min-width: 15px; pointer-events: none; margin-top: 2px;">${i + 1}.</div>
                  <div style="font-size: 16px; pointer-events: none; margin-top: 0px;">${qDef.icon}</div>
                  <div style="flex: 1; pointer-events: none;">
                    <div style="font-size: 13px; color: #e2e8f0; font-weight: 500;">Get ${targetQty} ${qDef.name} ${mainProgress}</div>
                    ${stepsHtml}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8; pointer-events: none; margin-top: 2px;">Queued</div>
                  <button class="btn-remove-queue" data-index="${i}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 2px; margin-top: 1px;">✕</button>
              </div>`;
            })
            .join("")}
      </div>`;
  }

  static bindEvents(goalSection, char, uiManager) {
    // Bind Queue Drag Events
    CharacterTasksPanel.bindQueueDragEvents(goalSection, char, uiManager);

    // Cancel Button
    const cancelBtn = goalSection.querySelector(".btn-cancel-goal");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        goalManager.clearGoal(gameState, char);
        uiManager.renderMainWindow();
      });
    }

    // Remove Queue Item Listeners
    goalSection.querySelectorAll(".btn-remove-queue").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.dataset.index);
        goalManager.removeGoalFromQueue(gameState, char, idx);
        uiManager.renderMainWindow();
      });
    });

    // New/Queue Task Button
    goalSection
      .querySelector(".btn-top-action")
      .addEventListener("click", () => {
        uiManager.showItemSelectionModal((itemId, quantity) => {
          goalManager.setGoal(gameState, char, itemId, quantity);
          uiManager.renderMainWindow();
        });
      });
  }

  static bindQueueDragEvents(container, char, uiManager) {
    if (!container) return;

    // Helper to setup drag listeners
    const setupDragListeners = (itemEl, index) => {
      // Avoid binding twice on the same element instance
      if (itemEl.dataset.dragBound) return;

      itemEl.addEventListener("dragstart", (e) => {
        CharacterTasksPanel.isDragging = true;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
        itemEl.classList.add("dragging");
        itemEl.style.opacity = "0.5";
      });

      itemEl.addEventListener("dragend", (e) => {
        CharacterTasksPanel.isDragging = false;
        itemEl.classList.remove("dragging");
        itemEl.style.opacity = "1";
      });

      // Visual reordering only for queue items
      if (itemEl.classList.contains("queue-item-card")) {
        itemEl.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        });
      }

      itemEl.dataset.dragBound = "true";
    };

    const list = container.querySelector(".goal-queue-list");
    const activeGoalCard = container.querySelector(".active-goal-card");

    // Bind to Queue Items (ALWAYS run this check, as items might be new)
    if (list) {
      const items = list.querySelectorAll(".queue-item-card");
      items.forEach((item) => {
        setupDragListeners(item, parseInt(item.dataset.index));
      });
    }

    // Bind to Active Card (ALWAYS run this check)
    if (activeGoalCard) {
      if (!activeGoalCard.dataset.dragBound) {
        // Check if it's draggable (has data-index="-1")
        if (activeGoalCard.getAttribute("data-index") === "-1") {
          setupDragListeners(activeGoalCard, -1);
        }

        activeGoalCard.addEventListener("dragover", (e) => {
          e.preventDefault(); // Allow drop
          e.dataTransfer.dropEffect = "move";
        });

        activeGoalCard.dataset.dragBound = "true";
      }
    }

    // Universal Drop Handler (Bind Once to Container)
    // Only bind if not already bound
    if (!container.dataset.dragBound) {
      container.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const fromIndexStr = e.dataTransfer.getData("text/plain");
        if (!fromIndexStr) return;

        const fromIndex = parseInt(fromIndexStr);
        let toIndex = -1; // Default target

        const queueItem = e.target.closest(".queue-item-card");
        const activeCard = e.target.closest(".active-goal-card");
        const queueList = e.target.closest(".goal-queue-list");

        if (activeCard) {
          toIndex = -1;
        } else if (queueItem) {
          const rect = queueItem.getBoundingClientRect();
          const isBefore = (e.clientY - rect.top) / rect.height < 0.5;
          const targetIndex = parseInt(queueItem.dataset.index);
          toIndex = targetIndex + (isBefore ? 0 : 1);
        } else if (queueList) {
          toIndex = char.goalQueue ? char.goalQueue.length : 0;
        } else {
          if (queueList) toIndex = char.goalQueue ? char.goalQueue.length : 0;
          else toIndex = -1;
        }

        if (isNaN(fromIndex) || fromIndex === toIndex) {
          CharacterTasksPanel.isDragging = false;
          return;
        }

        // Adjust for downward move (splice removal shifts indices left)
        let finalToIndex = toIndex;
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
          finalToIndex = toIndex - 1;
        }

        CharacterTasksPanel.isDragging = false;
        goalManager.reorderGoalQueue(gameState, char, fromIndex, finalToIndex);
        gameState.saveGame();
        uiManager.renderMainWindow();
      });

      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      container.dataset.dragBound = "true";
    }
  }

  static update(container, char, uiManager) {
    const goalSection = container.querySelector(".char-goal-section");
    if (!goalSection) return;

    const hasActiveGoal = !!char.activeGoal;
    const isShowingActive = !!goalSection.querySelector(".active-goal-card");

    // If Global State (Active vs Activity vs Empty) Changed, full re-render of this section
    const isShowingGoal = !!goalSection.querySelector(
      ".active-goal-card:not(.activity-state)",
    );
    const isShowingActivity = !!goalSection.querySelector(
      ".active-goal-card.activity-state",
    );

    let desiredState = "EMPTY";
    if (hasActiveGoal) desiredState = "GOAL";
    else if (char.currentActivity) desiredState = "ACTIVITY";

    let currentState = "EMPTY";
    if (isShowingGoal) currentState = "GOAL";
    else if (isShowingActivity) currentState = "ACTIVITY";

    if (desiredState !== currentState) {
      goalSection.innerHTML = "";
      if (desiredState === "GOAL") {
        CharacterTasksPanel.renderActiveState(goalSection, char, uiManager);
      } else if (desiredState === "ACTIVITY") {
        CharacterTasksPanel.renderActivityState(goalSection, char, uiManager);
      } else {
        CharacterTasksPanel.renderEmptyState(goalSection, char, uiManager);
      }
      return;
    }

    // Check if the Goal Group ID changed (e.g. Next Task in Queue activated)
    if (hasActiveGoal) {
      const activeCard = goalSection.querySelector(".active-goal-card");
      const renderedGroupId = activeCard ? activeCard.dataset.groupId : null;
      const currentGroupId = char.activeGoalGroup
        ? char.activeGoalGroup.id.toString()
        : "";

      // If IDs are mismatched (and we have IDs), force re-render
      if (
        renderedGroupId &&
        currentGroupId &&
        renderedGroupId !== currentGroupId
      ) {
        goalSection.innerHTML = "";
        CharacterTasksPanel.renderActiveState(goalSection, char, uiManager);
        return;
      }

      // Also check if structure changed (Steps vs No Steps)
      // If we have steps but UI doesn't show them (or vice versa)
      const hasStepsUI = !!goalSection.querySelector(".active-goal-steps");
      const needsStepsui =
        char.activeGoalGroup && char.activeGoalGroup.steps.length > 1;

      if (hasStepsUI !== needsStepsui) {
        goalSection.innerHTML = "";
        CharacterTasksPanel.renderActiveState(goalSection, char, uiManager);
        return;
      }
    }

    // If we are dragging, DO NOT UPDATE DOM to prevent glitches
    if (CharacterTasksPanel.isDragging) return;

    // Smart Update for Active State
    if (hasActiveGoal) {
      const goal = char.activeGoal;
      const targetDef = getItemDefinition(goal.targetItem);
      const currentCount = gameState.inventory.getCount(goal.targetItem);
      const startCount = goal.startCount || 0;
      const targetQuantity = goal.targetQuantity || 1;
      const collected = Math.max(0, currentCount - startCount);
      const progressPercent = Math.min(100, (collected / targetQuantity) * 100);

      // Update Name
      const nameEl = goalSection.querySelector(".goal-name");
      if (nameEl)
        nameEl.innerHTML = `Get ${targetQuantity} ${targetDef.name} <span class="goal-progress-inline" style="color: #94a3b8; font-size: 0.9em; margin-left: 6px;">(${collected}/${targetQuantity})</span>`;

      // Update Icon
      const iconEl = goalSection.querySelector(".goal-icon");
      if (iconEl && iconEl.innerText !== targetDef.icon)
        iconEl.innerText = targetDef.icon;

      // Update Bar
      const barFill = goalSection.querySelector(".goal-progress-bar-fill");
      if (barFill) barFill.style.width = `${progressPercent}%`;

      // Update Status
      const statusSpan = goalSection.querySelector(".goal-status span");
      if (statusSpan) statusSpan.innerText = goal.status;

      // Update Steps List
      if (char.activeGoalGroup && char.activeGoalGroup.steps.length > 1) {
        const stepsContainer = goalSection.querySelector(".active-goal-steps");
        // Lazy update: just re-render steps innerHTML
        if (stepsContainer) {
          const newSteps = CharacterTasksPanel.renderGroupSteps(char); // Returns <div class=...>...</div>
          // We only want the inner content, but renderGroupSteps returns the wrapper.
          // Let's just replace the wrapper.
          if (stepsContainer.outerHTML !== newSteps) {
            stepsContainer.outerHTML = newSteps;
          }
        }
      }

      // Update Queue
      const currentQueueList = goalSection.querySelector(".goal-queue-list");
      const newQueueHtml = CharacterTasksPanel.getQueueHTML(char);

      if (currentQueueList && newQueueHtml) {
        if (currentQueueList.outerHTML !== newQueueHtml) {
          currentQueueList.outerHTML = newQueueHtml;
          CharacterTasksPanel.bindQueueDragEvents(goalSection, char, uiManager);
          // Remove Queue Item Listeners Re-bind
          goalSection.querySelectorAll(".btn-remove-queue").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const idx = parseInt(e.target.dataset.index);
              goalManager.removeGoalFromQueue(gameState, char, idx);
              uiManager.renderMainWindow();
            });
          });
        }
      }
    } else if (char.currentActivity && isShowingActivity) {
      // Smart Update for Activity State
      const activity = char.currentActivity;

      // Update Name
      const name = activity.target;
      const formattedName = name
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const nameEl = goalSection.querySelector(".goal-name");
      if (nameEl && nameEl.innerText !== formattedName)
        nameEl.innerText = formattedName;

      // Update Phase / Status
      // The subtitle is the second div inside .goal-text
      const statusEl = goalSection.querySelector(".goal-text > div:last-child");
      if (statusEl) {
        const phaseText = activity.phase ? activity.phase : "Ongoing...";
        if (statusEl.innerText !== phaseText) {
          statusEl.innerText = phaseText;

          // Dynamic Color
          if (activity.phase === "SEARCHING")
            statusEl.style.color = "#fbbf24"; // Amber
          else if (activity.phase === "EXPLORING")
            statusEl.style.color = "#4ade80"; // Green
          else if (activity.phase === "RETURNING")
            statusEl.style.color = "#60a5fa"; // Blue
          else statusEl.style.color = "#94a3b8"; // Gray
        }
      }
    }
  }
}
