// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationDisplay } from "./NotificationDisplay";

describe("NotificationDisplay", () => {
  let container;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("show", () => {
    it("should do nothing if container is null", () => {
      NotificationDisplay.show(null, "test");
      // No error thrown, no notification created
      expect(document.querySelector(".notification-container")).toBeNull();
    });

    it("should create notification container on document.body", () => {
      NotificationDisplay.show(container, "Hello");
      const notifContainer = document.querySelector(".notification-container");
      expect(notifContainer).not.toBeNull();
      expect(notifContainer.parentNode).toBe(document.body);
    });

    it("should reuse existing notification container", () => {
      NotificationDisplay.show(container, "First");
      NotificationDisplay.show(container, "Second");
      const containers = document.querySelectorAll(".notification-container");
      expect(containers).toHaveLength(1);
    });

    it("should create notification element with string type", () => {
      NotificationDisplay.show(container, "Test message", "success");
      const notif = document.querySelector(".game-notification");
      expect(notif).not.toBeNull();
      expect(notif.classList.contains("success")).toBe(true);
      expect(notif.innerText).toBe("Test message");
    });

    it("should handle object type with id and color", () => {
      NotificationDisplay.show(container, "Colored!", {
        id: "custom",
        color: "#ff5500",
      });
      const notif = document.querySelector(".game-notification");
      expect(notif.classList.contains("custom")).toBe(true);
      expect(notif.style.borderLeftColor).toBe("rgb(255, 85, 0)");
    });

    it("should remove notification after 3500ms", () => {
      NotificationDisplay.show(container, "Temporary");
      const notifContainer = document.querySelector(".notification-container");
      expect(notifContainer.children).toHaveLength(1);

      vi.advanceTimersByTime(3500);

      expect(notifContainer.children).toHaveLength(0);
    });
  });
});
