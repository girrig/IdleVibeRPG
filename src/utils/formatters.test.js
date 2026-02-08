import { describe, it, expect } from "vitest";
import { formatNumber, hexToRgb, hexToRgbString } from "./formatters";

describe("formatNumber", () => {
  it("should return raw string for numbers under 1000", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1)).toBe("1");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(500)).toBe("500");
  });

  it("should format thousands with k suffix", () => {
    expect(formatNumber(1000)).toBe("1k");
    expect(formatNumber(1500)).toBe("1.5k");
    expect(formatNumber(42300)).toBe("42.3k");
    expect(formatNumber(999999)).toBe("1000k");
  });

  it("should format millions with m suffix", () => {
    expect(formatNumber(1000000)).toBe("1m");
    expect(formatNumber(1500000)).toBe("1.5m");
    expect(formatNumber(25700000)).toBe("25.7m");
  });

  it("should strip trailing .0", () => {
    expect(formatNumber(1000)).toBe("1k");
    expect(formatNumber(2000)).toBe("2k");
    expect(formatNumber(1000000)).toBe("1m");
    expect(formatNumber(5000000)).toBe("5m");
  });

  it("should keep non-zero decimals", () => {
    expect(formatNumber(1100)).toBe("1.1k");
    expect(formatNumber(2300000)).toBe("2.3m");
  });
});

describe("hexToRgb", () => {
  it("should convert full hex to rgb object", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("should convert shorthand hex", () => {
    expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("#0f0")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("should handle hex without # prefix", () => {
    expect(hexToRgb("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("should return white fallback for null/undefined/empty", () => {
    expect(hexToRgb(null)).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb(undefined)).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("should return white fallback for invalid hex", () => {
    expect(hexToRgb("xyz")).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe("hexToRgbString", () => {
  it("should convert full hex to rgb string", () => {
    expect(hexToRgbString("#ff0000")).toBe("255, 0, 0");
    expect(hexToRgbString("#00ff00")).toBe("0, 255, 0");
    expect(hexToRgbString("#0000ff")).toBe("0, 0, 255");
  });

  it("should convert shorthand hex to rgb string", () => {
    expect(hexToRgbString("#f00")).toBe("255, 0, 0");
    expect(hexToRgbString("#0f0")).toBe("0, 255, 0");
  });

  it("should handle hex without # prefix", () => {
    expect(hexToRgbString("ff0000")).toBe("255, 0, 0");
  });

  it("should return white fallback for null/undefined", () => {
    expect(hexToRgbString(null)).toBe("255, 255, 255");
    expect(hexToRgbString(undefined)).toBe("255, 255, 255");
    expect(hexToRgbString("")).toBe("255, 255, 255");
  });

  it("should return white fallback for invalid hex", () => {
    expect(hexToRgbString("xyz")).toBe("255, 255, 255");
  });
});
