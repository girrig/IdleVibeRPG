// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfirmationModal } from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create modal with title and message", () => {
    ConfirmationModal.show("Delete?", "Are you sure?", vi.fn());
    const modal = document.querySelector(".game-modal");
    expect(modal).not.toBeNull();
    expect(modal.innerHTML).toContain("Delete?");
    expect(modal.innerHTML).toContain("Are you sure?");
  });

  it("should call onConfirm and remove modal when confirm is clicked", () => {
    const onConfirm = vi.fn();
    ConfirmationModal.show("Test", "Message", onConfirm);

    document.querySelector(".btn-confirm").click();

    expect(onConfirm).toHaveBeenCalledOnce();

    // Modal should be removed after animation delay
    vi.advanceTimersByTime(200);
    expect(document.querySelector(".game-modal")).toBeNull();
  });

  it("should close without calling onConfirm when cancel is clicked", () => {
    const onConfirm = vi.fn();
    ConfirmationModal.show("Test", "Message", onConfirm);

    document.querySelector(".btn-cancel").click();

    expect(onConfirm).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(document.querySelector(".game-modal")).toBeNull();
  });

  it("should close when close button is clicked", () => {
    ConfirmationModal.show("Test", "Message", vi.fn());

    document.querySelector(".btn-close").click();

    vi.advanceTimersByTime(200);
    expect(document.querySelector(".game-modal")).toBeNull();
  });

  it("should close when clicking modal backdrop", () => {
    ConfirmationModal.show("Test", "Message", vi.fn());

    const modal = document.querySelector(".game-modal");
    modal.click(); // Click on backdrop (target === modal)

    vi.advanceTimersByTime(200);
    expect(document.querySelector(".game-modal")).toBeNull();
  });
});
