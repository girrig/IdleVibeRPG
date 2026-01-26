// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaveManager } from "./SaveManager";

describe("SaveManager", () => {
  const TEST_KEY = "test_game_v1";
  const TEST_DATA = { level: 5, items: { wood: 100 } };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should save data to localStorage", () => {
    const success = SaveManager.save(TEST_KEY, TEST_DATA, true); // silent=true

    expect(success).toBe(true);
    const stored = localStorage.getItem(TEST_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored)).toEqual(TEST_DATA);
  });

  it("should load data from localStorage", () => {
    localStorage.setItem(TEST_KEY, JSON.stringify(TEST_DATA));

    const loaded = SaveManager.load(TEST_KEY);
    expect(loaded).toEqual(TEST_DATA);
  });

  it("should return null if save does not exist", () => {
    const loaded = SaveManager.load("non_existent_key");
    expect(loaded).toBeNull();
  });

  it("should check if save exists", () => {
    expect(SaveManager.hasSave(TEST_KEY)).toBe(false);

    localStorage.setItem(TEST_KEY, "{}");
    expect(SaveManager.hasSave(TEST_KEY)).toBe(true);
  });

  it("should clear save data", () => {
    localStorage.setItem(TEST_KEY, "{}");
    SaveManager.clear(TEST_KEY);
    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it("should handle invalid JSON gracefully during load", () => {
    // Manually set bad data
    localStorage.setItem(TEST_KEY, "{ bad json");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loaded = SaveManager.load(TEST_KEY);

    expect(loaded).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
