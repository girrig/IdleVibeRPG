// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterAttributesPanel } from "./CharacterAttributesPanel";

vi.mock("../../../core/Constants", () => ({
  UI_COLORS: {
    STAT_STR: "#f87171",
    STAT_DEX: "#4ade80",
    STAT_INT: "#60a5fa",
  },
}));

describe("CharacterAttributesPanel", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
  });

  describe("render", () => {
    it("should append a stats section to the container", () => {
      const char = { stats: { strength: 5, dexterity: 3, intelligence: 7 } };

      CharacterAttributesPanel.render(container, char);

      expect(container.querySelector(".char-stats-section")).not.toBeNull();
    });

    it("should display section title", () => {
      const char = { stats: { strength: 1, dexterity: 1, intelligence: 1 } };

      CharacterAttributesPanel.render(container, char);

      expect(container.querySelector(".section-title").textContent).toBe(
        "Attributes",
      );
    });

    it("should render STR, DEX, INT labels", () => {
      const char = { stats: { strength: 1, dexterity: 1, intelligence: 1 } };

      CharacterAttributesPanel.render(container, char);

      const labels = Array.from(
        container.querySelectorAll(".stat-label"),
      ).map((el) => el.textContent);
      expect(labels).toEqual(["STR", "DEX", "INT"]);
    });

    it("should display correct stat values", () => {
      const char = { stats: { strength: 10, dexterity: 8, intelligence: 15 } };

      CharacterAttributesPanel.render(container, char);

      const values = Array.from(
        container.querySelectorAll(".stat-value"),
      ).map((el) => el.textContent);
      expect(values).toEqual(["10", "8", "15"]);
    });

    it("should apply correct colors to stat labels", () => {
      const char = { stats: { strength: 1, dexterity: 1, intelligence: 1 } };

      CharacterAttributesPanel.render(container, char);

      const labels = container.querySelectorAll(".stat-label");
      expect(labels[0].style.color).toBe("rgb(248, 113, 113)"); // #f87171
      expect(labels[1].style.color).toBe("rgb(74, 222, 128)"); // #4ade80
      expect(labels[2].style.color).toBe("rgb(96, 165, 250)"); // #60a5fa
    });
  });

  describe("update", () => {
    it("should update stat values in the DOM", () => {
      const char = { stats: { strength: 5, dexterity: 3, intelligence: 7 } };

      CharacterAttributesPanel.render(container, char);

      char.stats.strength = 12;
      char.stats.dexterity = 9;
      char.stats.intelligence = 20;

      CharacterAttributesPanel.update(container, char);

      const values = Array.from(
        container.querySelectorAll(".stat-value.stat-pill"),
      ).map((el) => el.innerText);
      expect(values).toEqual([12, 9, 20]);
    });

    it("should not throw when container has no stat pills", () => {
      const emptyContainer = document.createElement("div");
      const char = { stats: { strength: 1, dexterity: 1, intelligence: 1 } };

      // Should not throw
      CharacterAttributesPanel.update(emptyContainer, char);
    });
  });
});
