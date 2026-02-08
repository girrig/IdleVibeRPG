// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ItemSelectionModal } from "./ItemSelectionModal";

// Mock dependencies
vi.mock("../../core/ItemRegistry", () => ({
    ITEM_DEFINITIONS: {
        "wood": { name: "Wood", icon: "🪵" },
        "stone": { name: "Stone", icon: "🪨" }
    }
}));

vi.mock("../../core/SourceRegistry", () => ({
    sourceRegistry: {
        getSource: (id) => {
            if (id === "wood") return { type: "SKILL", skillId: "woodcutting", reqLevel: 1 };
            return null; // stone has no reqs
        }
    }
}));

vi.mock("../../core/SkillRegistry", () => ({
    SKILL_DEFINITIONS: {
        EXPLORING: {
            options: {
                "wander_safe": { name: "Wander Safe", level: 1, icon: "🚶" },
                "find_forest": { name: "Find Forest", level: 5, icon: "🌲" }
            }
        }
    },
    ITEM_TO_NODE_MAP: {
        "wood": [{ nodeType: "tree_node", biome: "TEMPERATE_DECIDUOUS_FOREST" }],
    }
}));

describe("ItemSelectionModal", () => {
    let modal;
    let character;
    let onSelect;

    beforeEach(() => {
        // Mock Character
        character = {
            skills: {
                woodcutting: { level: 1 },
                exploring: { level: 10 }
            }
        };
        onSelect = vi.fn();

        // DOM Setup (JSDOM is mostly implied but we need to cleanup)
        document.body.innerHTML = "";
    });

    it("should create modal elements when show() is called", () => {
        modal = new ItemSelectionModal(character, onSelect);
        modal.show();

        const modalEl = document.querySelector(".game-modal");
        expect(modalEl).toBeDefined();
        expect(modalEl.querySelector("h2").textContent).toBe("Select Activity");
    });

    it("should render item grid by default", () => {
        modal = new ItemSelectionModal(character, onSelect);
        modal.show();

        const items = document.querySelectorAll(".goal-item-card");
        // Should show Wood and Stone
        expect(items.length).toBeGreaterThan(0);

        const names = Array.from(items).map(el => el.querySelector(".goal-item-name").textContent);
        expect(names).toContain("Wood");
        expect(names).toContain("Stone");
    });

    it("should switch to Exploration tab", () => {
        modal = new ItemSelectionModal(character, onSelect);
        modal.show();

        const tabExpl = document.querySelector("#tab-exploration");
        tabExpl.click();

        // Should see wander options
        const wanderCards = document.querySelectorAll(".wander-card");
        expect(wanderCards.length).toBeGreaterThan(0);
    });

    it("should call onSelect when item is clicked", () => {
        modal = new ItemSelectionModal(character, onSelect);
        modal.show();

        // Find Wood card
        const card = document.querySelector(".goal-item-card[data-id='wood']");
        card.click();

        expect(onSelect).toHaveBeenCalledWith({ type: "ITEM", id: "wood", qty: 1 });
    });

    it("should hide resource items when no nodes are available", () => {
        const mockGameState = {
            availableResources: {}
        };
        modal = new ItemSelectionModal(character, onSelect, mockGameState);
        modal.show();

        const items = document.querySelectorAll(".goal-item-card");
        const names = Array.from(items).map(el => el.querySelector(".goal-item-name").textContent);
        // Wood requires tree_node:TEMPERATE_DECIDUOUS_FOREST but none available
        expect(names).not.toContain("Wood");
        // Stone has no node sources, so it should still show
        expect(names).toContain("Stone");
    });

    it("should show resource items when nodes are available", () => {
        const mockGameState = {
            availableResources: { "tree_node:TEMPERATE_DECIDUOUS_FOREST": 5 }
        };
        modal = new ItemSelectionModal(character, onSelect, mockGameState);
        modal.show();

        const items = document.querySelectorAll(".goal-item-card");
        const names = Array.from(items).map(el => el.querySelector(".goal-item-name").textContent);
        expect(names).toContain("Wood");
        expect(names).toContain("Stone");
    });

    // Cleanup
    afterEach(() => {
        if (modal) modal.close();
    });
});
