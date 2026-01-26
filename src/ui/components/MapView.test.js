// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapView } from "./MapView";
import { mapManager } from "../../core/MapManager";

// Mock MapManager
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
    TERRAIN_TYPES: { OCEAN: { id: "OCEAN", color: "#0000FF", symbol: "~" } },
  };
});

describe("MapView Zoom Logic", () => {
  let mapView;

  beforeEach(() => {
    // Reset mocks if needed
    document.body.innerHTML = "";

    // Mock ResizeObserver globally BEFORE instantiation
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock canvas context
    const mockContext = {
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      createImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      font: "",
      textAlign: "",
      textBaseline: "",
      imageSmoothingEnabled: true,
    };

    // Override HTMLCanvasElement.prototype.getContext to return our mock
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);

    mapView = new MapView();

    // Mock clientWidth/Height for mapContainer (JSDOM defaults to 0)
    // We simulate a 800x600 viewport
    Object.defineProperty(mapView.mapContainer, "clientWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(mapView.mapContainer, "clientHeight", {
      configurable: true,
      value: 600,
    });

    // Set properties that might be read
    mapView.canvas.width = 0; // Force update to trigger resize
    mapView.canvas.height = 0;
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
});
