// Mock GameState
global.window = {};
import { mapManager } from "./src/core/MapManager.js";
import { Character } from "./src/core/Character.js";
import { SKILL_DEFINITIONS } from "./src/core/SkillRegistry.js";

// Mock GameState object for the action
const mockGameState = {
  triggerNotification: (msg, type) => console.log(`[NOTIF] ${msg} (${type})`),
  inventory: {
    addItem: () => {},
    getCount: () => 100, // Infinite resources for testing
    removeItem: () => {},
  },
  saveGame: () => {},
};
window.gameState = mockGameState;

async function testExploring() {
  console.log("Starting Exploring Skill Test...");

  // 1. Check Map Initialization
  console.log("1. Checking Map Initialization...");
  mapManager.initialize();
  const centerTile = mapManager.getTile(250, 250);
  if (centerTile.explored !== false) {
    console.error(
      "FAILED: Center tile should be unexplored initially (unless we forced it, but code says false)",
    );
  } else {
    console.log("PASSED: Center tile is unexplored.");
  }

  // 2. Check Character Initialization
  console.log("2. Checking Character Initialization...");
  const char = new Character("test_char", "Explorer");
  if (!char.skills.exploring) {
    console.error("FAILED: Character missing exploring skill.");
    return;
  }
  if (!char.position || char.position.x !== 250 || char.position.y !== 250) {
    console.error("FAILED: Character incorrect start position.");
    return;
  }
  console.log("PASSED: Character initialized correctly.");

  // 3. Test Exploration Action
  console.log("3. Testing Exploration Action (Wander)...");
  const skillDef = SKILL_DEFINITIONS.EXPLORING;
  char.currentActivity = { target: "wander" }; // Mock activity

  // Manually trigger action once
  const startPos = { ...char.position };
  skillDef.action(mockGameState, char);

  const newPos = char.position;
  console.log(
    `Moved from (${startPos.x}, ${startPos.y}) to (${newPos.x}, ${newPos.y})`,
  );

  if (startPos.x === newPos.x && startPos.y === newPos.y) {
    console.error("FAILED: Character did not move.");
  } else {
    console.log("PASSED: Character moved.");
  }

  // Check Map Update
  // Note: The action calls mapManager.exploreTile BEFORE checking revealed,
  // but the mapManager.exploreTile logic is: if (!explored) { explored = true; return true; }
  // So if it was unexplored, it should now be explored.

  const tile = mapManager.getTile(newPos.x, newPos.y);
  if (!tile.explored) {
    console.error(
      `FAILED: Tile at (${newPos.x}, ${newPos.y}) was not marked explored.`,
    );
  } else {
    console.log(`PASSED: Tile at (${newPos.x}, ${newPos.y}) is explored.`);
  }

  // Check XP
  if (char.skills.exploring.xp <= 0) {
    console.error("FAILED: No XP gained.");
  } else {
    console.log(`PASSED: XP Gained: ${char.skills.exploring.xp}`);
  }

  console.log("Exploring Skill Test Complete.");
}

testExploring();
