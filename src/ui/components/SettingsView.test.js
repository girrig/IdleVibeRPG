// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SettingsView } from "./SettingsView";

vi.mock("../../core/GameState", () => ({
  gameState: {
    settings: {
      autoSave: true,
      notifications: {
        master: true,
        levelUp: true,
        activity: true,
        autoSave: false,
        item: true,
      },
    },
    nextAutoSaveTime: Date.now() + 30000,
    toggleAutoSave: vi.fn(),
    toggleNotifications: vi.fn(),
    resetGame: vi.fn(),
  },
}));

vi.mock("./ConfirmationModal", () => ({
  ConfirmationModal: {
    show: vi.fn(),
  },
}));

import { gameState } from "../../core/GameState";
import { ConfirmationModal } from "./ConfirmationModal";

describe("SettingsView", () => {
  let container;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");

    // Reset settings
    gameState.settings.autoSave = true;
    gameState.settings.notifications = {
      master: true,
      levelUp: true,
      activity: true,
      autoSave: false,
      item: true,
    };
    gameState.nextAutoSaveTime = Date.now() + 30000;
  });

  afterEach(() => {
    if (container._settingsInterval) {
      clearInterval(container._settingsInterval);
    }
    vi.useRealTimers();
  });

  it("should render settings panel with categories", () => {
    SettingsView.render(container);
    vi.advanceTimersByTime(0); // flush setTimeout for bindEvents

    expect(container.querySelector("#setting-autosave")).not.toBeNull();
    expect(
      container.querySelector("#setting-notifications-master"),
    ).not.toBeNull();
    expect(container.querySelector("#btn-reset-game")).not.toBeNull();
  });

  it("should initialize autosave checkbox from game state", () => {
    gameState.settings.autoSave = false;
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    expect(container.querySelector("#setting-autosave").checked).toBe(false);
  });

  it("should toggle autosave when checkbox changes", () => {
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const chk = container.querySelector("#setting-autosave");
    chk.checked = false;
    chk.dispatchEvent(new Event("change"));

    expect(gameState.toggleAutoSave).toHaveBeenCalledWith(false);
  });

  it("should display autosave timer countdown", () => {
    gameState.nextAutoSaveTime = Date.now() + 30000;
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const timer = container.querySelector("#autosave-timer");
    expect(timer.innerText).toContain("30s");
  });

  it("should show paused when autosave is disabled", () => {
    gameState.settings.autoSave = false;
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const timer = container.querySelector("#autosave-timer");
    expect(timer.innerText).toBe("(Paused)");
  });

  it("should initialize notification checkboxes from game state", () => {
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    expect(
      container.querySelector("#setting-notifications-master").checked,
    ).toBe(true);
    expect(
      container.querySelector("#setting-notifications-levelup").checked,
    ).toBe(true);
    expect(
      container.querySelector("#setting-notifications-autosave").checked,
    ).toBe(false);
  });

  it("should disable sub-settings when master notifications is off", () => {
    gameState.settings.notifications.master = false;
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const subDiv = container.querySelector("#notif-sub-settings");
    expect(subDiv.style.opacity).toBe("0.5");
    expect(subDiv.style.pointerEvents).toBe("none");
  });

  it("should enable sub-settings when master notifications is on", () => {
    gameState.settings.notifications.master = true;
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const subDiv = container.querySelector("#notif-sub-settings");
    expect(subDiv.style.opacity).toBe("1");
    expect(subDiv.style.pointerEvents).toBe("auto");
  });

  it("should toggle master notification and update sub-settings", () => {
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    const master = container.querySelector("#setting-notifications-master");
    master.checked = false;
    master.dispatchEvent(new Event("change"));

    expect(gameState.toggleNotifications).toHaveBeenCalledWith(false, "master");

    const subDiv = container.querySelector("#notif-sub-settings");
    expect(subDiv.style.opacity).toBe("0.5");
  });

  it("should show confirmation modal on reset", () => {
    SettingsView.render(container);
    vi.advanceTimersByTime(0);

    container.querySelector("#btn-reset-game").click();

    expect(ConfirmationModal.show).toHaveBeenCalledWith(
      "Reset Progress",
      expect.any(String),
      expect.any(Function),
    );
  });
});
