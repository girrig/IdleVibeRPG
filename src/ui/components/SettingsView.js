import { gameState } from "../../core/GameState";
import { mapManager } from "../../core/MapManager";
import { ConfirmationModal } from "./ConfirmationModal";

export class SettingsView {
  static render(container) {
    container.className = "mw-content settings-panel";
    container.innerHTML = `
        <div class="setting-category">
            <h3>Gameplay</h3>
            <div class="setting-row">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="setting-label">Auto-Save</span>
                    <span id="autosave-timer" class="setting-note" style="font-size: 0.8em; color: #888; min-width: 80px; display: inline-block;"></span>
                </div>
                <input type="checkbox" id="setting-autosave">
            </div>
             <div class="setting-row" style="align-items: flex-start; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span class="setting-label">Notifications</span>
                    <input type="checkbox" id="setting-notifications-master">
                </div>
                <!-- Sub settings -->
                <div id="notif-sub-settings" style="display: flex; flex-direction: column; gap: 2px; padding-left: 20px; width: 100%; box-sizing: border-box; border-left: 2px solid rgba(255,255,255,0.1);">
                    <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Level Up</span>
                        <input type="checkbox" id="setting-notifications-levelup">
                    </div>
                    <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Activities</span>
                        <input type="checkbox" id="setting-notifications-activity">
                    </div>
                     <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Auto-Save Log</span>
                        <input type="checkbox" id="setting-notifications-autosave">
                    </div>
                    <div class="setting-row" style="margin:0;">
                        <span class="setting-label" style="font-size: 0.9em; color: #aaa;">Item Drops</span>
                        <input type="checkbox" id="setting-notifications-item">
                    </div>
                </div>
            </div>
        </div>
        <div class="setting-category">
            <h3>Account</h3>
            <!-- Save Game button removed -->
            <div class="setting-row" style="justify-content: center;">
               <button class="btn-setting danger" id="btn-regen-world">Regenerate World</button>
            </div>
            <div class="setting-row" style="justify-content: center;">
               <button class="btn-setting danger" id="btn-reset-game">Reset Progress</button>
            </div>
        </div>
    `;

    setTimeout(() => {
      this.bindEvents(container);
    }, 0);
  }

  static bindEvents(container) {
    const btnSave = container.querySelector("#btn-save-game");
    const btnReset = container.querySelector("#btn-reset-game");
    const chkAutoSave = container.querySelector("#setting-autosave");
    const chkNotifMaster = container.querySelector(
      "#setting-notifications-master",
    );
    const chkNotifLevelUp = container.querySelector(
      "#setting-notifications-levelup",
    );
    const chkNotifActivity = container.querySelector(
      "#setting-notifications-activity",
    );
    const chkNotifAutoSave = container.querySelector(
      "#setting-notifications-autosave",
    );
    const chkNotifItem = container.querySelector("#setting-notifications-item");
    const timerSpan = container.querySelector("#autosave-timer");

    // Clear previous interval if any - handled by caller if needed, but here we can manage it if we had instance
    // Since this is static, we rely on UIManager cleaning up intervals on view switch,
    // OR we attach it to the container? No, UIManager has reference.
    // Ideally SettingsView should be instantiated.

    if (chkAutoSave) {
      chkAutoSave.checked = gameState.settings.autoSave;

      const updateTimer = () => {
        if (!gameState.settings.autoSave) {
          timerSpan.innerText = "(Paused)";
          return;
        }
        const left = Math.max(
          0,
          Math.ceil((gameState.nextAutoSaveTime - Date.now()) / 1000),
        );
        timerSpan.innerText = `(Next in ${left}s)`;
      };

      // Initial call
      updateTimer();

      // Start Interval - NOTE: UIManager creates this interval currently.
      // For refactoring without breaking, we might need to return this interval or handle it.
      // Let's assume UIManager handles "settingsInterval" property on itself.
      // We can attach it to window.settingsInterval for now? No, bad.
      // Let's make SettingsView returhn the interval?
      // Or better, make SettingsView instantiated in UIManager.

      // TEMPORARY HACK: Attach to container so UIManager can find it?
      // Or just let UIManager handle the interval creation if we expose logic?
      // Since I'm splitting, I should fix this.
      // I will make `render` return the interval ID.

      const intervalId = setInterval(updateTimer, 1000);
      // We need to pass this back.
      // Changing signature to return intervalId.

      chkAutoSave.addEventListener("change", (e) => {
        gameState.toggleAutoSave(e.target.checked);
        updateTimer(); // Update immediately
      });

      container._settingsInterval = intervalId;
    }

    // Notification Handlers
    if (chkNotifMaster) {
      // Safety: ensure notifications object exists (legacy migration handled in load, but just in case)
      if (!gameState.settings.notifications) {
        gameState.settings.notifications = {
          master: true,
          levelUp: true,
          activity: true,
          autoSave: true,
        };
      }

      chkNotifMaster.checked = gameState.settings.notifications.master;
      chkNotifLevelUp.checked = gameState.settings.notifications.levelUp;
      chkNotifActivity.checked = gameState.settings.notifications.activity;
      chkNotifAutoSave.checked = gameState.settings.notifications.autoSave;
      chkNotifItem.checked = gameState.settings.notifications.item;

      const toggleSub = (disabled) => {
        const subDiv = container.querySelector("#notif-sub-settings");
        if (disabled) {
          subDiv.style.opacity = 0.5;
          subDiv.style.pointerEvents = "none";
        } else {
          subDiv.style.opacity = 1;
          subDiv.style.pointerEvents = "auto";
        }
      };

      toggleSub(!chkNotifMaster.checked);

      chkNotifMaster.addEventListener("change", (e) => {
        gameState.toggleNotifications(e.target.checked, "master");
        toggleSub(!e.target.checked);
      });

      chkNotifLevelUp.addEventListener("change", (e) =>
        gameState.toggleNotifications(e.target.checked, "levelUp"),
      );
      chkNotifActivity.addEventListener("change", (e) =>
        gameState.toggleNotifications(e.target.checked, "activity"),
      );
      chkNotifAutoSave.addEventListener("change", (e) =>
        gameState.toggleNotifications(e.target.checked, "autoSave"),
      );
      chkNotifItem.addEventListener("change", (e) =>
        gameState.toggleNotifications(e.target.checked, "item"),
      );
    }

    // btnSave listener removed

    const btnRegen = container.querySelector("#btn-regen-world");
    if (btnRegen) {
      btnRegen.addEventListener("click", () => {
        ConfirmationModal.show(
          "Regenerate World",
          "Are you sure you want to regenerate the world? Your current map will be replaced with a new one.",
          () => {
            try {
              mapManager.generateMap({ newSeed: true });
              if (window.gameState) window.gameState.saveGame();
            } catch (err) {
              console.error("Failed to generate map:", err);
            }
          },
        );
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", () => {
        ConfirmationModal.show(
          "Reset Progress",
          "Are you sure you want to reset ALL progress? This action cannot be undone.",
          () => {
            gameState.resetGame();
          },
        );
      });
    }
  }
}
