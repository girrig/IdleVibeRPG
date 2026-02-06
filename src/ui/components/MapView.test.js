// @vitest-environment browser
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapView } from "./MapView";
import { mapManager } from "../../core/MapManager";
import { gameState } from "../../core/GameState";

// Mock GameState
vi.mock("../../core/GameState", () => ({
  gameState: {
    availableResources: {},
    getAvailableResourceCount: vi.fn((resourceId) => {
      const prefix = resourceId + ":";
      let sum = 0;
      Object.keys(gameState.availableResources).forEach((key) => {
        if (key === resourceId || key.startsWith(prefix)) {
          sum += gameState.availableResources[key];
        }
      });
      return sum;
    }),
  },
}));

// Mock MapManager
vi.mock("../../core/MapManager", () => {
  // Generate dummy tiles
  const rows = [];
  for (let y = 0; y < 500; y++) {
    const row = [];
    for (let x = 0; x < 500; x++) {
      row.push({ x, y, type: "OCEAN" });
    }
    rows.push(row);
  }

  return {
    mapManager: {
      width: 500,
      height: 500,
      generated: true,
      generateMap: vi.fn(),
      getMapData: vi.fn(() => ({ tiles: rows })),
      getTile: vi.fn((x, y) => rows[y] && rows[y][x]),
    },
    TERRAIN_TYPES: {
      OCEAN: { id: "OCEAN", name: "Ocean", color: "#0000FF", symbol: "~" },
      HOME: { id: "HOME", name: "Home", color: "#FFD700", symbol: "H" },
      FOREST: { id: "FOREST", name: "Forest", color: "#008000", symbol: "T" }
    },
  };
});

describe("MapView Zoom Logic", () => {
  let mapView;

  beforeEach(() => {
    document.body.innerHTML = "";

    // In browser, canvas is real. We spy on the prototype to track calls.
    // We need to spy on the Context returned by getContext.
    // Since getContext returns a new object or existing one, we can spy on the method call.

    mapView = new MapView();

    // We need to inject a spy into the existing context or mock getContext to return a spied object
    // But verify the context IS real first.
    // Actually, easier to let it create the context, then spy on its methods.

    // Force specific dimensions
    Object.defineProperty(mapView.mapContainer, "clientWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(mapView.mapContainer, "clientHeight", {
      configurable: true,
      value: 600,
    });

    // Set up spies on the context methods we check
    vi.spyOn(mapView.ctx, 'fillText');
    vi.spyOn(mapView.ctx, 'fillRect');

    // Reset MapManager dimensions
    mapManager.width = 500;
    mapManager.height = 500;

    // Mock GameState for Character Rendering
    window.gameState = {
      characters: [],
    };
  });

  it("should maintain spacer at full map size and canvas at viewport size", () => {
    const width = 500;
    const height = 500;

    // Zoom levels to test
    const zooms = [2, 12, 64];

    zooms.forEach((zoom) => {
      mapView.zoomLevel = zoom;
      mapView.update();

      const expectedFullWidth = width * zoom;
      const expectedFullHeight = height * zoom;

      // Spacer check (Virtual Size)
      const spacerStyleWidth = mapView.spacer.style.width;
      const spacerStyleHeight = mapView.spacer.style.height;

      expect(spacerStyleWidth, `Spacer Width at Zoom ${zoom}`).toBe(
        expectedFullWidth + "px",
      );
      expect(spacerStyleHeight, `Spacer Height at Zoom ${zoom}`).toBe(
        expectedFullHeight + "px",
      );

      // Canvas check (Viewport Size)
      // Canvas should equal viewport (800x600)
      expect(mapView.canvas.width, `Canvas Width at Zoom ${zoom}`).toBe(800);
      expect(mapView.canvas.height, `Canvas Height at Zoom ${zoom}`).toBe(600);

      // Canvas CSS check
      expect(mapView.canvas.style.width).toBe("800px");
      expect(mapView.canvas.style.height).toBe("600px");
    });
  });

  describe("Rendering Logic", () => {
    it("should draw symbols ONLY for resources and HOME", () => {
      // Setup tiles
      const tiles = [
        [
          { x: 0, y: 0, type: "FOREST", explored: true }, // Standard Forest -> No Symbol
          { x: 1, y: 0, type: "FOREST", explored: true, resource: { type: "oak_log", amount: 10 } }, // Resource -> Symbol
          { x: 2, y: 0, type: "HOME", explored: true }, // Home -> Symbol
        ],
      ];

      // Mock MapManager data
      mapManager.getMapData = vi.fn(() => ({ tiles }));
      mapManager.width = 3;
      mapManager.height = 1;

      // Force zoom high enough to trigger symbol rendering (>10)
      mapView.zoomLevel = 20;
      mapView.canvas.width = 800;
      mapView.canvas.height = 600;

      // Reset render mocks
      mapView.ctx.fillText.mockClear();

      mapView.renderMainCanvas();

      // Expectation:
      // 1. Standard Forest: 0 calls
      // 2. Resource: 1 call
      // 3. Home: 1 call
      // Total: 2 calls
      expect(mapView.ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it("should draw characters on the map", () => {
      window.gameState.characters = [
        { name: "P1", position: { x: 10, y: 10 } },
        { name: "P2", position: { x: 12, y: 12 } },
      ];

      // Setup view
      mapView.zoomLevel = 10;
      mapView.canvas.width = 800;
      mapView.canvas.height = 600;

      // We don't care about map data for this test, characters are independent layer
      mapView.renderMainCanvas();

      // Check fillText calls
      // 2 characters = 2 calls. (Assuming no symbols drawn due to zoom/mock tiles)
      const calls = mapView.ctx.fillText.mock.calls;
      const charCalls = calls.filter((call) => call[0] === "🧙‍♂️");

      expect(charCalls.length).toBe(2);
    });
  });

  describe("UI Elements", () => {
    it("should handle missing tiles/rows gracefully (Regression Test)", () => {
      // Mock sparse/broken map data where a row is undefined
      const brokenTiles = [];
      brokenTiles[0] = [{ x: 0, y: 0, type: "OCEAN", explored: true }];
      // Row 1 is undefined
      brokenTiles[2] = [{ x: 0, y: 2, type: "OCEAN", explored: true }];

      mapManager.getMapData.mockReturnValue({ tiles: brokenTiles });
      mapManager.width = 3;
      mapManager.height = 3;

      mapView.zoomLevel = 10;

      // Should NOT throw error
      expect(() => {
        mapView.renderMainCanvas();
      }).not.toThrow();
    });
  });

  describe("Interactions", () => {
    it("should handle zoom in/out via wheel", () => {
      mapView.zoomLevel = 10;
      // Zoom In
      mapView.mapContainer.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
      expect(mapView.zoomLevel).toBeGreaterThan(10);

      const zoomedIn = mapView.zoomLevel;

      // Zoom Out
      mapView.mapContainer.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
      expect(mapView.zoomLevel).toBeLessThan(zoomedIn);
    });

    it("should handle drag to pan", () => {
      // Mousedown
      mapView.mapContainer.dispatchEvent(new MouseEvent("mousedown", { button: 0, clientX: 100, clientY: 100 }));
      expect(mapView.isMouseDown).toBe(true);

      // Mousemove
      mapView.mapContainer.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 50 }));
      expect(mapView.isDragging).toBe(true);
      // Scroll should have changed (initial 0, dragging moves it)
      // Note: scrollLeft/Top are properties of the element.
      // In a real browser, this updates. We might need to mock or ensure content overflow.
      // MapView.update sets spacer size, so overflow SHOULD exist.

      // Mouseup
      mapView.mapContainer.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
      expect(mapView.isMouseDown).toBe(false);

      // Wait for drag flag reset
      return new Promise(resolve => setTimeout(() => {
        expect(mapView.isDragging).toBe(false);
        resolve();
      }, 10));
    });

    it("should ignore right-click drag or middle click", () => {
      // Middle click (button 1)
      const preventDefault = vi.fn();
      mapView.mapContainer.dispatchEvent(new MouseEvent("mousedown", { button: 1, preventDefault }));
      expect(mapView.isMouseDown).toBe(false);

      // Right click (button 2)
      mapView.mapContainer.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));
      expect(mapView.isMouseDown).toBe(false);
    });
  });

  describe("Sidebar & UI", () => {
    it("should render actions menu with Regen and Home", () => {
      mapView.renderActionsMenu();

      // Check Regen button
      const regenBtn = mapView.actionsMenu.querySelector("button.map-sidebar-btn");
      expect(regenBtn).toBeDefined();
      expect(regenBtn.innerText).toContain("Regenerate");

      // Check Home item
      const homeItem = mapView.actionsMenu.querySelector(".sidebar-item-row");
      expect(homeItem).toBeDefined();
      expect(homeItem.innerText).toContain("Home");

      // Check click on Home
      const centerSpy = vi.spyOn(mapView, 'centerOnHome');
      homeItem.click();
      expect(centerSpy).toHaveBeenCalled();
    });

    it("should render terrain menu with header", () => {
      mapView.renderMapMenu();

      const header = mapView.mapMenu.querySelector(".map-menu-header");
      expect(header.innerText).toContain("Terrain");

      const body = mapView.mapMenu.querySelector(".map-menu-body");
      expect(body).not.toBeNull();
      expect(body.querySelectorAll(".sidebar-item-row").length).toBeGreaterThan(0);
    });

    it("should hide symbols for Biomes in terrain menu", () => {
      mapView.renderMapMenu();

      const items = Array.from(mapView.mapMenu.querySelectorAll(".sidebar-item-row"));

      // Check Biome (Mocked as FOREST with symbol 'T') — symbol should NOT appear
      const forestItem = items.find(el => el.innerText.includes("Forest") && !el.innerText.includes("Patch"));

      expect(forestItem).toBeDefined();
      expect(forestItem.innerText).not.toContain("T");
      expect(forestItem.innerText.trim()).toBe("Forest");
    });

    it("should show resource node counts in overlay sorted by count descending", () => {
      gameState.availableResources = {
        "mineral_node:DESERT": 5,
        "mineral_node:ALPINE": 3,
        "tree_node:FOREST": 10,
      };

      mapView.updateResourceOverlay();

      const rows = mapView.resourceOverlay.querySelectorAll(".resource-overlay-row");
      // Only nodes with count > 0 should appear
      expect(rows.length).toBe(2); // mineral_node and tree_node

      // Sorted descending: tree (10) first, mineral (8) second
      expect(rows[0].textContent).toContain("Forest Patch");
      expect(rows[0].querySelector(".resource-overlay-count").textContent).toBe("10");
      expect(rows[1].textContent).toContain("Mineral Vein");
      expect(rows[1].querySelector(".resource-overlay-count").textContent).toBe("8");

      // Nodes with 0 count should not appear
      const coalRow = Array.from(rows).find(r => r.textContent.includes("Coal Deposit"));
      expect(coalRow).toBeUndefined();
    });

    it("should toggle resource overlay open/closed", () => {
      gameState.availableResources = {};
      mapView.resourceOverlayOpen = true;
      mapView.updateResourceOverlay();

      // Should have a list when open
      expect(mapView.resourceOverlay.querySelector(".resource-overlay-list")).not.toBeNull();

      // Click header to close
      mapView.resourceOverlay.querySelector(".resource-overlay-header").click();
      expect(mapView.resourceOverlayOpen).toBe(false);
      expect(mapView.resourceOverlay.querySelector(".resource-overlay-list")).toBeNull();

      // Click header to reopen
      mapView.resourceOverlay.querySelector(".resource-overlay-header").click();
      expect(mapView.resourceOverlayOpen).toBe(true);
      expect(mapView.resourceOverlay.querySelector(".resource-overlay-list")).not.toBeNull();
    });

    it("should toggle actions menu open/closed", () => {
      mapView.renderActionsMenu();

      // Should have body when open
      expect(mapView.actionsMenu.querySelector(".map-menu-body")).not.toBeNull();
      expect(mapView.actionsMenu.querySelector("button.map-sidebar-btn")).not.toBeNull();

      // Click header to close
      mapView.actionsMenu.querySelector(".map-menu-header").click();
      expect(mapView.actionsMenuOpen).toBe(false);
      expect(mapView.actionsMenu.querySelector(".map-menu-body")).toBeNull();

      // Click header to reopen
      mapView.actionsMenu.querySelector(".map-menu-header").click();
      expect(mapView.actionsMenuOpen).toBe(true);
      expect(mapView.actionsMenu.querySelector(".map-menu-body")).not.toBeNull();
    });

    it("should toggle terrain menu open/closed", () => {
      mapView.renderMapMenu();

      // Should have body when open
      expect(mapView.mapMenu.querySelector(".map-menu-body")).not.toBeNull();

      // Click header to close
      mapView.mapMenu.querySelector(".map-menu-header").click();
      expect(mapView.mapMenuOpen).toBe(false);
      expect(mapView.mapMenu.querySelector(".map-menu-body")).toBeNull();

      // Click header to reopen
      mapView.mapMenu.querySelector(".map-menu-header").click();
      expect(mapView.mapMenuOpen).toBe(true);
      expect(mapView.mapMenu.querySelector(".map-menu-body")).not.toBeNull();
    });
  });
});
