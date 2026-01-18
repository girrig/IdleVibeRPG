# Asset Generation Pipeline (SNES Style)

This document outlines the standard workflow for creating enemy and item sprites for _IdleVibeRPG_.
The goal is to maintain a consistent **16-bit Dragon Quest SNES** aesthetic with a fixed 32-color palette.

## 1. Concept Phase (3x3 Grid)

**Goal:** Explore poses and silhouettes. find the "vibe".

- **Tool:** AI Image Generator (Text-to-Image)
- **Prompt:**
  ```text
  3x3 grid of [Entity] sprites.
  Pixel art style of Dragon Quest SNES. 16-bit retro graphics.
  Limited color palette. Front-facing battle sprite. Black outline.
  Simple and clean. Solid colors. Variety of poses.
  Pure magenta #FF00FF background.
  No grid lines. No borders. No frames. Separated by empty space.
  Subtle design variations.
  ```
- **Action:**
  1.  Generate the grid.
  2.  **STOP and WAIT** for the User to select 1 sprite (e.g., "Row 2, Column 3").
  3.  **Crop** that single sprite to use as input for the next phase.

## 2. Refinement Phase (2x2 Grid)

**Goal:** Polish the selected design and generate high-res details without losing the pose.

- **Tool:** AI Image Generator (Image-to-Image / Reference)
- **Input Image:** The cropped sprite from Phase 1.
- **Prompt:**
  ```text
  2x2 grid of [Entity] sprites.
  Pixel art style of Dragon Quest SNES. 16-bit retro graphics.
  Limited color palette. Front-facing battle sprite. Black outline.
  Simple and clean. Solid colors.
  Pure magenta #FF00FF background.
  No grid lines. No borders. No frames. Separated by empty space.
  Subtle design variations. Distinct details.
  Maintain exact pose and silhouette.
  ```
- **Action:**
  1.  Generate the grid.
  2.  **STOP and WAIT** for the User to select the **Final Winner** (TL, TR, BL, or BR).

## 3. Processing Phase (Automated)

**Goal:** Convert the raw AI output (which might have noise or wrong colors) into a game-ready asset.

- **Tool:** `process_selection.py` script.
- **Command:**
  ```bash
  python process_selection.py "path/to/grid_2x2.png" "TL|TR|BL|BR" "src/assets/enemy_[name].png"
  ```
- **What it does:**
  1.  **Crops** the selected quadrant.
  2.  **Quantizes** colors to the Fixed Palette (`src/assets/palette_32.png`).
  3.  **Removes Background** (replaces Magenta #FF00FF with transparent).
  4.  **Centers** the sprite in a square canvas.
  5.  **Resizes** to 64x64 using Nearest Neighbor scaling.

---

## Technical Notes

- **Palette:** `src/assets/palette_32.png` (Retro RPG colors).
- **Target Size:** 64x64 pixels.
- **Magenta Constraint:** Always use `#FF00FF` for backgrounds in prompts to ensure easy removal.
- **Grid Lines:** Always include negative prompts (`No grid lines`, `No borders`) to prevent post-processing issues.

## Review Process

- **Artifact Embedding:** When creating review artifacts (markdown), **ALWAYS use the ABSOLUTE PATH** for images.
  - Invalid: `![Label](image.png)`
  - Valid: `![Label](C:/Users/name/.../image.png)`
  - _Reasoning:_ VS Code markdown preview require absolute paths or strict workspace relative paths that are often unreliable in this workflow. Absolute paths are the only 100% reliable method.
