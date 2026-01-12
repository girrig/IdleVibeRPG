# Idle RPG Implementation Plan

## Goal Description

Create a web-based idle/progression RPG using Phaser 3. The game will support multiple characters, shared inventory, and distinct activities (Mining, Fighting, etc.). The focus is on a scalable architecture that allows independent character progression.

## User Review Required

> [!NOTE]
> I will be using **Vite** with **Phaser 3**.
> I will use **Local Storage** for simple data persistence.
> **Visual Style**: High Fantasy Pixel Art. We will use generated assets for all visuals.

## Proposed Changes

### Project Structure

- Use `npm create vite@latest` for scaffolding.
- `src/`
  - `assets/`: Images/Audio
  - `core/`: Game logic independent of Phaser (GameState, Character, Inventory)
  - `scenes/`: Phaser Scenes (Boot, Preloader, MainGame, UI)
  - `ui/`: UI specific code (likely DOM-based overlay or Phaser GameObjects)
  - `utils/`: Helpers

### Core Components ([src/core])

#### [NEW] `GameState.js`

- Singleton or globally accessible state.
- Manages list of `Character` instances.
- Manages shared `Inventory`.
- Handles main "tick" loop for logic updates.

#### [NEW] `Character.js`

- Properties: `name`, `stats` (str, agi, etc.), `skills` (mining, fighting), `gear` (slots).
- Methods: `startActivity(type)`, `update(delta)`, `gainXp(skill, amount)`.

#### [NEW] `Inventory.js`

- Dictionary or list of items.
- Methods: `add(itemId, qty)`, `remove(itemId, qty)`, `has(itemId, qty)`.

### Phaser Integration ([src/scenes])

### Phaser Integration ([src/scenes])

#### [MODIFY] `MainScene.js`

- Remove existing Phaser text UI.
- Emit events to the DOM/window for UI updates.
- Focus purely on the game world (sprites, animations).

### UI Overlay ([src/ui])

#### [NEW] `UIManager.js`

- Manages the DOM elements.
- Subscribes to `GameState` to update HTML values.
- Implements "Glassmorphism" style:
  - Dark semi-transparent backgrounds (`backdrop-filter: blur`).
  - Clean typography (system fonts or Google Fonts).
  - Smooth transitions for hover states.

#### [MODIFY] `style.css`

- Add CSS classes for:
  - `.hud-panel`: Main container for UI bits.
  - `.resource-display`: Top right float.
  - `.character-card`: Bottom/Left panel for hero controls.

## Verification Plan

### Automated Tests

- None planned specifically, will rely on manual verification.

### Manual Verification

- **Project Boot**: Verify the Phaser canvas loads.
- **Character Creation**: Verify a default character exists on start.
- **Activity Loop**: specific test -> Assign "Mining" to character, watch Resource count in Inventory increase over time.
- **Save/Load**: Refresh page, verify progress remains.
