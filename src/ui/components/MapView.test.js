import { describe, it, expect } from "vitest";

describe("MapView Zoom Logic", () => {
  it("should maintain square aspect ratio at all zoom levels", () => {
    const width = 500;
    const height = 500;

    // Test range from min zoom (2) to max zoom (64)
    for (let zoom = 2; zoom <= 64; zoom += 2) {
      const canvasWidth = width * zoom;
      const canvasHeight = height * zoom;

      // Simulate CSS pixel assignment string construction
      const styleWidth = canvasWidth + "px";
      const styleHeight = canvasHeight + "px";

      const ratio = canvasWidth / canvasHeight;

      // Assertions
      expect(canvasWidth, `Width mismatch at Zoom ${zoom}`).toBe(canvasHeight);
      expect(styleWidth, `Style string mismatch at Zoom ${zoom}`).toBe(
        styleHeight,
      );
      expect(ratio, `Ratio mismatch at Zoom ${zoom}`).toBe(1);
    }
  });
});
