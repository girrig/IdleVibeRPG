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

  describe("hexToRgb", () => {
    it("should convert full hex to rgb string", () => {
      expect(NotificationDisplay.hexToRgb("#ff0000")).toBe("255, 0, 0");
      expect(NotificationDisplay.hexToRgb("#00ff00")).toBe("0, 255, 0");
      expect(NotificationDisplay.hexToRgb("#0000ff")).toBe("0, 0, 255");
    });

    it("should convert shorthand hex to rgb string", () => {
      expect(NotificationDisplay.hexToRgb("#f00")).toBe("255, 0, 0");
      expect(NotificationDisplay.hexToRgb("#0f0")).toBe("0, 255, 0");
    });

    it("should handle hex without # prefix", () => {
      expect(NotificationDisplay.hexToRgb("ff0000")).toBe("255, 0, 0");
    });

    it("should return white fallback for null/undefined", () => {
      expect(NotificationDisplay.hexToRgb(null)).toBe("255, 255, 255");
      expect(NotificationDisplay.hexToRgb(undefined)).toBe("255, 255, 255");
      expect(NotificationDisplay.hexToRgb("")).toBe("255, 255, 255");
    });

    it("should return white fallback for invalid hex", () => {
      expect(NotificationDisplay.hexToRgb("xyz")).toBe("255, 255, 255");
    });
  });

  describe("show", () => {
    it("should do nothing if container is null", () => {
      NotificationDisplay.show(null, "test");
      // No error thrown
    });

    it("should create notification container if not present", () => {
      NotificationDisplay.show(container, "Hello");
      expect(container.querySelector(".notification-container")).not.toBeNull();
    });

    it("should reuse existing notification container", () => {
      NotificationDisplay.show(container, "First");
      NotificationDisplay.show(container, "Second");
      const containers = container.querySelectorAll(".notification-container");
      expect(containers).toHaveLength(1);
    });

    it("should create notification element with string type", () => {
      NotificationDisplay.show(container, "Test message", "success");
      const notif = container.querySelector(".game-notification");
      expect(notif).not.toBeNull();
      expect(notif.classList.contains("success")).toBe(true);
      expect(notif.innerText).toBe("Test message");
    });

    it("should handle object type with id and color", () => {
      NotificationDisplay.show(container, "Colored!", {
        id: "custom",
        color: "#ff5500",
      });
      const notif = container.querySelector(".game-notification");
      expect(notif.classList.contains("custom")).toBe(true);
      expect(notif.style.borderLeftColor).toBe("rgb(255, 85, 0)");
    });

    it("should remove notification after 1500ms", () => {
      NotificationDisplay.show(container, "Temporary");
      expect(
        container.querySelector(".notification-container").children,
      ).toHaveLength(1);

      vi.advanceTimersByTime(1500);

      expect(
        container.querySelector(".notification-container").children,
      ).toHaveLength(0);
    });
  });
});
