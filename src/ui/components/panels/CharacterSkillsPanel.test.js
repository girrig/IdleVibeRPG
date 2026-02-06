// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterSkillsPanel } from "./CharacterSkillsPanel";

vi.mock("../../../core/SkillRegistry", () => ({
  SKILL_DEFINITIONS: {
    MINING: { color: "#c0a060" },
    FISHING: { color: "#4488cc" },
  },
}));

vi.mock("../../../core/Constants", () => ({
  UI_COLORS: { PURCHASED: "#22c55e" },
}));

describe("CharacterSkillsPanel", () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
  });

  it("should render skills sorted alphabetically", () => {
    const char = {
      skills: {
        mining: { level: 5, xp: 50 },
        fishing: { level: 3, xp: 100 },
      },
    };

    CharacterSkillsPanel.render(container, char);

    const rows = container.querySelectorAll(".skill-row-compact");
    expect(rows).toHaveLength(2);

    const names = Array.from(
      container.querySelectorAll(".skill-name-compact"),
    ).map((el) => el.textContent);
    expect(names).toEqual(["Fishing", "Mining"]);
  });

  it("should capitalize first letter of skill names", () => {
    const char = {
      skills: {
        woodcutting: { level: 1, xp: 0 },
      },
    };

    CharacterSkillsPanel.render(container, char);

    const name = container.querySelector(".skill-name-compact").textContent;
    expect(name).toBe("Woodcutting");
  });

  it("should calculate XP progress percentage correctly", () => {
    const char = {
      skills: {
        mining: { level: 10, xp: 500 }, // xpNeeded = 10*100 = 1000, percent = 50%
      },
    };

    CharacterSkillsPanel.render(container, char);

    const bar = container.querySelector(".skill-bar-fill-compact");
    expect(bar.style.width).toBe("50%");
  });

  it("should cap progress bar at 100%", () => {
    const char = {
      skills: {
        mining: { level: 1, xp: 200 }, // xpNeeded = 100, percent = 200% -> capped to 100%
      },
    };

    CharacterSkillsPanel.render(container, char);

    const bar = container.querySelector(".skill-bar-fill-compact");
    expect(bar.style.width).toBe("100%");
  });

  it("should display skill level", () => {
    const char = {
      skills: {
        mining: { level: 42, xp: 10 },
      },
    };

    CharacterSkillsPanel.render(container, char);

    const lvl = container.querySelector(".skill-lvl-compact");
    expect(lvl.textContent).toBe("Lv 42");
  });

  it("should use skill color from definition", () => {
    const char = {
      skills: {
        mining: { level: 1, xp: 0 },
      },
    };

    CharacterSkillsPanel.render(container, char);

    const bar = container.querySelector(".skill-bar-fill-compact");
    expect(bar.style.backgroundColor).toBe("rgb(192, 160, 96)");
  });

  it("should use fallback color for unknown skills", () => {
    const char = {
      skills: {
        cooking: { level: 1, xp: 0 }, // Not in SKILL_DEFINITIONS
      },
    };

    CharacterSkillsPanel.render(container, char);

    const bar = container.querySelector(".skill-bar-fill-compact");
    expect(bar.style.backgroundColor).toBe("rgb(34, 197, 94)");
  });

  it("should show XP tooltip on skill row", () => {
    const char = {
      skills: {
        mining: { level: 5, xp: 250 },
      },
    };

    CharacterSkillsPanel.render(container, char);

    const row = container.querySelector(".skill-row-compact");
    expect(row.getAttribute("title")).toBe("250 / 500 XP");
  });

  it("should update by re-rendering the skills section", () => {
    const char = {
      skills: {
        mining: { level: 5, xp: 50 },
      },
    };

    CharacterSkillsPanel.render(container, char);
    expect(container.querySelector(".char-skills-section")).not.toBeNull();

    // Update with new data
    char.skills.mining.level = 6;
    CharacterSkillsPanel.update(container, char);

    const lvl = container.querySelector(".skill-lvl-compact");
    expect(lvl.textContent).toBe("Lv 6");
  });
});
