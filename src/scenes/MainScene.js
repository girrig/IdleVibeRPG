import Phaser from "phaser";
import { gameState } from "../core/GameState";
import { uiManager } from "../ui/UIManager";
import CHARACTER_IMG from "../assets/character.png";
import CHARACTER_FEMALE_IMG from "../assets/character_female.png";
import COPPER_ORE_IMG from "../assets/copper_ore.png";
import GRASS_IMG from "../assets/grass.png";
import TREE_IMG from "../assets/tree.png";
import CAMPFIRE_IMG from "../assets/campfire.png";
import TENT_IMG from "../assets/tent.png";
import POND_IMG from "../assets/pond.png";
import ENEMY_RAT_IMG from "../assets/enemy_rat.png";
import ENEMY_GOBLIN_IMG from "../assets/enemy_goblin.png";
import ENEMY_WOLF_IMG from "../assets/enemy_wolf.png";
import HAT_IMG from "../assets/hat.png";
import SHIRT_IMG from "../assets/shirt.png";
import PANTS_IMG from "../assets/pants.png";
import SHOES_IMG from "../assets/shoes.png";
import ICON_HEROES_IMG from "../assets/icon_heroes.png";
import ICON_EQUIP_IMG from "../assets/icon_equip.png";
import ICON_SKILLS_IMG from "../assets/icon_skills.png";
import ICON_INV_IMG from "../assets/icon_inv.png";
import ICON_SETTINGS_IMG from "../assets/icon_settings.png";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.currentSceneType = null;
    this.sceneObjects = []; // Track objects to destroy on switch
  }

  preload() {
    this.load.image("character", CHARACTER_IMG);
    this.load.image("character_female", CHARACTER_FEMALE_IMG);
    this.load.image("copper_ore", COPPER_ORE_IMG);
    this.load.image("grass", GRASS_IMG);
    this.load.image("tree", TREE_IMG);
    this.load.image("campfire", CAMPFIRE_IMG);
    this.load.image("tent", TENT_IMG);
    this.load.image("tent", TENT_IMG);
    this.load.image("pond", POND_IMG);
    this.load.image("enemy_rat", ENEMY_RAT_IMG);
    this.load.image("enemy_goblin", ENEMY_GOBLIN_IMG);
    this.load.image("enemy_wolf", ENEMY_WOLF_IMG);
    this.load.image("hat", HAT_IMG);
    this.load.image("shirt", SHIRT_IMG);
    this.load.image("pants", PANTS_IMG);
    this.load.image("shoes", SHOES_IMG);
    this.load.image("icon_heroes", ICON_HEROES_IMG);
    this.load.image("icon_equip", ICON_EQUIP_IMG);
    this.load.image("icon_skills", ICON_SKILLS_IMG);
    this.load.image("icon_inv", ICON_INV_IMG);
    this.load.image("icon_settings", ICON_SETTINGS_IMG);
  }

  create() {
    console.log("MainScene started");
    gameState.initialize();
    uiManager.initialize();

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

    const ASSET_SCALE = 1;

    // Common Background (could be different per type)
    // For now, Green Grass for outdoors, maybe Grey for Mine?
    // Let's us tint the grass for Mining to look like Cave floor.

    let bgTint = 0xffffff;
    if (type === "MINING") bgTint = 0x888888; // Darker/Grey

    this.bg = this.add
      .tileSprite(0, 0, this.scale.width, this.scale.height, "grass")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setTint(bgTint);
    this.bg.setTileScale(ASSET_SCALE, ASSET_SCALE);
    this.sceneObjects.push(this.bg);

    // Render Specifics
    switch (type) {
      case "IDLE":
        this.renderIdleScene(ASSET_SCALE);
        break;
      case "MINING":
        this.renderMiningScene(ASSET_SCALE);
        break;
      case "WOODCUTTING":
        this.renderWoodcuttingScene(ASSET_SCALE);
        break;
      case "FISHING":
        this.renderFishingScene(ASSET_SCALE);
        break;
      case "FIGHTING":
        this.renderFightingScene(ASSET_SCALE);
        break;
      default:
        this.renderIdleScene(ASSET_SCALE);
        break;
    }
  }

  clearScene() {
    this.sceneObjects.forEach((obj) => obj.destroy());
    this.sceneObjects = [];
  }

  renderIdleScene(scale) {
    // Campfire & Tent
    const tent = this.add
      .image(512, 360, "tent")
      .setScale(scale)
      .setOrigin(0.5, 1);
    const camp = this.add.image(512, 400, "campfire").setScale(scale);

    this.sceneObjects.push(tent, camp);
  }

  renderMiningScene(scale) {
    // Big Ore Rock in center
    // Maybe some scattered small rocks (ores)
    const ore = this.add.image(512, 384, "copper_ore").setScale(scale * 1.5); // Slightly larger as focus

    // Props
    const rock1 = this.add
      .image(400, 300, "copper_ore")
      .setScale(scale * 0.8)
      .setTint(0x666666);
    const rock2 = this.add
      .image(600, 450, "copper_ore")
      .setScale(scale * 0.7)
      .setTint(0x555555);

    this.sceneObjects.push(ore, rock1, rock2);
  }

  renderFightingScene(scale) {
    const char = gameState.characters[uiManager.selectedCharIndex];
    let enemyKey = "enemy_rat"; // Default
    if (char && char.currentActivity && char.currentActivity.target) {
      if (char.currentActivity.target === "goblin") enemyKey = "enemy_goblin";
      if (char.currentActivity.target === "wolf") enemyKey = "enemy_wolf";
    }

    // Render Enemy in Center
    const enemy = this.add.image(512, 384, enemyKey).setScale(scale);

    // Add some "terrain" based on enemy?
    // For now, duplicate grass or add rocks
    const rock = this.add
      .image(400, 420, "copper_ore")
      .setScale(0.5)
      .setTint(0x555555);

    this.sceneObjects.push(rock, enemy);
  }

  renderWoodcuttingScene(scale) {
    // Forest loop
    // Center tree
    const centerTree = this.add
      .image(512, 384, "tree")
      .setScale(scale * 1.2)
      .setOrigin(0.5, 1);
    this.sceneObjects.push(centerTree);

    // Surrounding trees
    for (let i = 0; i < 8; i++) {
      const x = 512 + Math.cos(i) * 100;
      const y = 384 + Math.sin(i) * 80; // Ellipse
      // Offset Y because origin is bottom
      const tree = this.add
        .image(x, y + 50, "tree") // shift down
        .setScale(scale * 0.9 + Math.random() * 0.2 * scale)
        .setOrigin(0.5, 1)
        .setDepth(y); // simple depth sorting
      this.sceneObjects.push(tree);
    }
  }

  renderFishingScene(scale) {
    // Pond
    const pond = this.add.image(512, 384, "pond").setScale(scale * 1.5);
    this.sceneObjects.push(pond);

    // Maybe a tree on the bank
    const tree = this.add
      .image(450, 300, "tree")
      .setScale(scale)
      .setOrigin(0.5, 1);
    this.sceneObjects.push(tree);
  }
}
