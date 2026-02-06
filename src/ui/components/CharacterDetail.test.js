// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterDetail } from "./CharacterDetail";

// Mock Dependencies
vi.mock("../../core/GameState", () => ({
  gameState: {
    characters: [],
    recruitCharacter: vi.fn(),
  },
}));

// Mock Sub-Panels to avoid deep rendering complexity
vi.mock("./panels/CharacterTasksPanel", () => ({
  CharacterTasksPanel: {
    render: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("./panels/CharacterAttributesPanel", () => ({
  CharacterAttributesPanel: { render: vi.fn(), update: vi.fn() },
}));
vi.mock("./panels/CharacterEquipmentPanel", () => ({
  CharacterEquipmentPanel: { render: vi.fn(), update: vi.fn() },
}));
vi.mock("./panels/CharacterSkillsPanel", () => ({
  CharacterSkillsPanel: { render: vi.fn(), update: vi.fn() },
}));

import { gameState } from "../../core/GameState";

describe("CharacterDetail UI", () => {
  let view;
  let container;
  let mockUiManager;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");

    mockUiManager = {
      selectedCharIndex: 0,
      renderMainWindow: vi.fn(),
    };

    // Setup Dummy Characters
    gameState.characters = [
      {
        name: "Hero1",
        type: "WARRIOR",
        stats: { level: 5, strength: 15, dexterity: 10, intelligence: 8 },
        currentActivity: null,
      },
      {
        name: "Ranger1",
        type: "RANGER",
        stats: { level: 3, strength: 8, dexterity: 15, intelligence: 8 },
        currentActivity: { type: "mining" },
      },
    ];

    view = new CharacterDetail(mockUiManager);
  });

  it("should render character sidebar list", () => {
    view.render(container);

    const items = container.querySelectorAll(".char-list-item:not(.recruit)");
    expect(items).toHaveLength(2);

    expect(items[0].textContent).toContain("Hero1");
    expect(items[0].classList.contains("active")).toBe(true); // Index 0 selected

    expect(items[1].textContent).toContain("Ranger1");
  });

  it("should render header stats correctly", () => {
    view.render(container);

    const header = container.querySelector(".char-detail-header");
    expect(header.textContent).toContain("Hero1");
    expect(header.textContent).toContain("STR 15");
    expect(header.textContent).toContain("DEX 10");
    expect(header.textContent).toContain("INT 8");
  });

  it("should handle character selection", () => {
    view.render(container);

    const items = container.querySelectorAll(".char-list-item:not(.recruit)");
    // Click second character
    items[1].click();

    expect(mockUiManager.selectedCharIndex).toBe(1);
    expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
  });

  it("should handle recruit button click", () => {
    gameState.recruitCharacter.mockReturnValue(true);
    view.render(container);

    const recruitBtn = container.querySelector(".recruit");
    expect(recruitBtn).not.toBeNull();

    recruitBtn.click();

    expect(gameState.recruitCharacter).toHaveBeenCalled();
    expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
  });

  it("should not show recruit button when at max characters", () => {
    gameState.characters = Array(8).fill(null).map((_, i) => ({
      name: `Char${i}`,
      type: "WARRIOR",
      stats: { level: 1, strength: 10, dexterity: 10, intelligence: 10 },
      currentActivity: null,
    }));

    view.render(container);

    const recruitBtn = container.querySelector(".recruit");
    expect(recruitBtn).toBeNull();
  });

  it("should show activity badge for active characters", () => {
    view.render(container);

    const badges = container.querySelectorAll(".char-list-badge");
    expect(badges[0].textContent).toBe("Idle");
    expect(badges[1].textContent).toBe("mining");
  });

  describe("updateContent", () => {
    it("should update sidebar status and badges", () => {
      view.render(container);

      // Change character data
      gameState.characters[0].stats.level = 10;
      gameState.characters[0].currentActivity = { type: "fishing" };

      CharacterDetail.updateContent(container, mockUiManager);

      const status = container.querySelector("#char-list-item-0 .char-list-status");
      expect(status.innerText).toBe("Lv 10 WARRIOR");

      const badge = container.querySelector("#char-list-item-0 .char-list-badge");
      expect(badge.innerText).toBe("fishing");
    });

    it("should update header stats", () => {
      view.render(container);

      gameState.characters[0].stats.strength = 25;
      gameState.characters[0].stats.dexterity = 20;
      gameState.characters[0].stats.intelligence = 15;

      CharacterDetail.updateContent(container, mockUiManager);

      expect(container.querySelector(".char-header-stat-str").innerText).toBe("STR 25");
      expect(container.querySelector(".char-header-stat-dex").innerText).toBe("DEX 20");
      expect(container.querySelector(".char-header-stat-int").innerText).toBe("INT 15");
    });

    it("should update level in detail title", () => {
      view.render(container);

      gameState.characters[0].stats.level = 99;

      CharacterDetail.updateContent(container, mockUiManager);

      const lvlSpan = container.querySelector(".char-detail-title span");
      expect(lvlSpan.innerText).toBe("Level 99 WARRIOR");
    });

    it("should handle missing character gracefully", () => {
      view.render(container);
      mockUiManager.selectedCharIndex = 5; // Out of range

      // Should not throw
      CharacterDetail.updateContent(container, mockUiManager);
    });

    it("should update active class on character switch", () => {
      view.render(container);

      mockUiManager.selectedCharIndex = 1;
      CharacterDetail.updateContent(container, mockUiManager);

      const item0 = container.querySelector("#char-list-item-0");
      const item1 = container.querySelector("#char-list-item-1");
      expect(item0.classList.contains("active")).toBe(false);
      expect(item1.classList.contains("active")).toBe(true);
    });
  });
});
