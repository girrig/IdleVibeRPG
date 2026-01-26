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
});
