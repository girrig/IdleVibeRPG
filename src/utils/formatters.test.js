import { describe, it, expect } from "vitest";
import { formatNumber } from "./formatters";

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
