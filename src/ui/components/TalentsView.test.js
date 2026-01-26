// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TalentsView } from "./TalentsView";

// Mock Dependencies
vi.mock("../../core/GameState", () => ({
  gameState: {
    characters: [],
    saveGame: vi.fn(),
  },
}));

vi.mock("../../core/TalentRegistry", () => ({
  TALENT_DEFINITIONS: {
    root_talent: {
      id: "root_talent",
      name: "Root Power",
      description: "Start here",
      cost: 1,
      icon: "ROOT",
      prerequisites: [],
      position: { col: 6, row: 0 }, // Fighting column
    },
    child_talent: {
      id: "child_talent",
      name: "Child Power",
      description: "Follow up",
      cost: 1,
      icon: "CHILD",
      prerequisites: ["root_talent"],
      position: { col: 6, row: 1 },
    },
  },
}));

vi.mock("../../core/SkillRegistry", () => ({
  SKILL_DEFINITIONS: {
    FIGHTING: { color: "#red" },
  },
}));

import { gameState } from "../../core/GameState";

describe("TalentsView UI", () => {
  let view;
  let container;
  let mockUiManager;
  let mockChar;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    container = document.createElement("div");

    mockUiManager = {
      selectedCharIndex: 0,
      renderMainWindow: vi.fn(),
    };

    mockChar = {
      talentPoints: 5,
      skills: { fighting: { talentPoints: 2 } },
      talents: {}, // Empty start
      unlockTalent: vi.fn(() => true),
      refundTalent: vi.fn(() => true),
    };

    gameState.characters = [mockChar];

    view = new TalentsView(mockUiManager);
    // Stub drawConnectors to avoid SVG layout errors in JSDOM (getBoundingClientRect returns 0s)
    vi.spyOn(view, "drawConnectors").mockImplementation(() => {});
  });

  it("should render categories and active points", () => {
    view.render(container);

    // Sidebar categories
    const sidebar = container.querySelector(".talents-sidebar");
    expect(sidebar.textContent).toContain("Fighting");
    expect(sidebar.textContent).toContain("Mining");

    // Points Display
    const points = container.querySelector(".main-points-display");
    expect(points.textContent).toContain("Fighting Points");
    // expect(points.textContent).toContain("2"); // Mocked char has 2 fighting points
  });

  it("should render talent nodes based on active category", () => {
    // Default category is Fighting (cols 6,7). Our mocks are in col 6.
    view.render(container);

    const nodes = container.querySelectorAll(".talent-node");
    expect(nodes).toHaveLength(2); // Root and Child

    expect(container.textContent).toContain("Root Power");
    expect(container.textContent).toContain("Child Power");
  });

  it("should handle unlocking a talent", () => {
    view.render(container);

    const rootNode = container.querySelector("#talent-node-root_talent");

    // Click to unlock
    rootNode.click();

    expect(mockChar.unlockTalent).toHaveBeenCalledWith("root_talent");
    expect(gameState.saveGame).toHaveBeenCalled();
    expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
  });

  it("should handle refunding a talent", () => {
    // Setup: Talent already unlocked
    mockChar.talents["root_talent"] = true;
    view.render(container);

    const rootNode = container.querySelector("#talent-node-root_talent");

    // Expect 'purchased' class or checkmark
    expect(rootNode.classList.contains("purchased")).toBe(true);

    // Click to refund
    rootNode.click();

    expect(mockChar.refundTalent).toHaveBeenCalledWith("root_talent");
    expect(mockUiManager.renderMainWindow).toHaveBeenCalled();
  });

  it("should switch categories", () => {
    view.render(container);

    // Find Mining tab (dataset-category="Mining")
    const miningTab = container.querySelector('[data-category="Mining"]');
    miningTab.click();

    expect(view.activeCategory).toBe("Mining");
    // Re-render happens internally.
    // Mining category has no nodes in our mock, so grid should be empty/different.
    // Our mock map only has Fighting nodes (col 6). Mining is col 3.
    const nodes = container.querySelectorAll(".talent-node");
    expect(nodes).toHaveLength(0);
  });
});
