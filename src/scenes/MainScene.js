import Phaser from "phaser";
import { gameState } from "../core/GameState";
import { uiManager } from "../ui/UIManager";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.currentSceneType = null;
    this.sceneObjects = []; // Track objects to destroy on switch
  }

  preload() {
    // No images to preload!
  }

  create() {
    console.log("MainScene started");
    gameState.initialize();
    uiManager.initialize();

    // Generate programmatic background texture
    const bgGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    bgGraphics.fillStyle(0x4ade80); // Light green
    bgGraphics.fillRect(0, 0, 32, 32);
    bgGraphics.generateTexture("grass", 32, 32);

    // Centered on the "World Origin" of our scene objects (512, 384)
    this.cameras.main.centerOn(512, 384);

    // Initial listeners
    this.scale.on("resize", this.handleResize, this);
    this.handleResize(this.scale.gameSize);
  }

  handleResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    // Standard Full Screen Viewport
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.centerOn(512, 384);
    this.cameras.main.setZoom(1);

    // Ensure background covers the new visible area
    if (this.bg) {
      this.bg.setSize(width, height);
    }
  }

  update(time, delta) {
    gameState.tick();
    this.updateSceneContext();
  }

  updateSceneContext() {
    const char = gameState.characters[uiManager.selectedCharIndex];

    let targetType = "IDLE";
    if (char && char.currentActivity) {
      targetType = char.currentActivity.type;
    }

    if (this.currentSceneType !== targetType) {
      this.switchScene(targetType);
    }
  }

  switchScene(type) {
    console.log(`Switching Scene to: ${type}`);
    this.currentSceneType = type;
    this.clearScene();

    // Common Background
    let bgTint = 0xffffff;
    if (type === "MINING") bgTint = 0x888888; // Grey for mines

    this.bg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, "grass")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(bgTint);
    this.sceneObjects.push(this.bg);

    // Render Specifics
    switch (type) {
      case "IDLE":
        this.renderIdleScene();
        break;
      case "MINING":
        this.renderMiningScene();
        break;
      case "WOODCUTTING":
        this.renderWoodcuttingScene();
        break;
      case "FISHING":
        this.renderFishingScene();
        break;
      case "FIGHTING":
        this.renderFightingScene();
        break;
      default:
        this.renderIdleScene();
        break;
    }
  }

  clearScene() {
    this.sceneObjects.forEach((obj) => obj.destroy());
    this.sceneObjects = [];
  }

  addEmoji(x, y, emoji, size = 48) {
    const text = this.add
      .text(x, y, emoji, { fontSize: `${size}px` })
      .setOrigin(0.5);
    this.sceneObjects.push(text);
    return text;
  }

  renderIdleScene() {
    this.addEmoji(512, 384, "⛺", 64);
    this.addEmoji(550, 420, "🔥", 32);
  }

  renderMiningScene() {
    this.addEmoji(512, 384, "🪨", 96); // Big Rock
    this.addEmoji(400, 300, "🪨", 48);
    this.addEmoji(600, 450, "🪨", 32);
  }

  renderFightingScene() {
    const char = gameState.characters[uiManager.selectedCharIndex];
    let enemyEmoji = "🐀";
    if (char && char.currentActivity && char.currentActivity.target) {
      if (char.currentActivity.target === "goblin") enemyEmoji = "👺";
      if (char.currentActivity.target === "wolf") enemyEmoji = "🐺";
    }

    this.addEmoji(512, 384, enemyEmoji, 96);
    this.addEmoji(400, 420, "💀", 32); // Decor
  }

  renderWoodcuttingScene() {
    this.addEmoji(512, 384, "🌲", 96); // Main Tree

    // Forest
    for (let i = 0; i < 8; i++) {
      const x = 512 + Math.cos(i) * 150;
      const y = 384 + Math.sin(i) * 100;
      this.addEmoji(x, y, "🌲", 48 + Math.random() * 24);
    }
  }

  renderFishingScene() {
    this.addEmoji(512, 384, "💧", 128); // Pond representation
    this.addEmoji(450, 300, "🌲", 64);
    this.addEmoji(550, 400, "🐟", 32); // Fish jumping?
  }
}
