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
      skills: {
        fighting: { talentPoints: 2 },
        exploring: { talentPoints: 1 }
      },
      talents: {}, // Empty start
      unlockTalent: vi.fn(() => true),
      refundTalent: vi.fn(() => true),
    };

    gameState.characters = [mockChar];

    view = new TalentsView(mockUiManager);
    // Stub drawConnectors to avoid SVG layout errors in JSDOM (getBoundingClientRect returns 0s)
    vi.spyOn(view, "drawConnectors").mockImplementation(() => { });
  });

  it("should render categories and active points", () => {
    view.render(container);

    // Sidebar categories
    const sidebar = container.querySelector(".talents-sidebar");
    expect(sidebar.textContent).toContain("Fighting");
    expect(sidebar.textContent).toContain("Mining");

    // Points Display
    const points = container.querySelector(".main-points-display");
    expect(points.textContent).toContain("Exploring Points");
    expect(points.textContent).toContain("1");
  });

  it("should render active category nodes (default: Exploring)", () => {
    // Default category is Exploring (col 9). Our mocks need to support this or we expect empty if no exploring talents mocked.
    // The previous test expected Fighting (cols 6,7).
    // Let's update the mock to include an Exploring talent or verify we switch to Fighting to test the nodes.

    // For this test, let's verify it starts at Exploring.
    view.render(container);
    const sidebar = container.querySelector(".talents-sidebar");

    // Check Exploring is active
    const activeTab = sidebar.querySelector(".talent-sidebar-item.active");
    expect(activeTab.textContent).toContain("Exploring");
  });

  it("should handle unlocking a talent", () => {
    view.render(container);

    // Switch to Fighting to access mock talents
    const fightingTab = container.querySelector('[data-category="Fighting"]');
    fightingTab.click();

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

    // Switch to Fighting to access mock talents
    const fightingTab = container.querySelector('[data-category="Fighting"]');
    fightingTab.click();

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
