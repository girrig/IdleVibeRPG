import Phaser from "phaser";
import { gameState } from "../core/GameState";
import CHARACTER_IMG from "../assets/character.png";
import COPPER_ORE_IMG from "../assets/copper_ore.png";
import GRASS_IMG from "../assets/grass.png";
import TREE_IMG from "../assets/tree.png";
import CAMPFIRE_IMG from "../assets/campfire.png"; // Static image
import TENT_IMG from "../assets/tent.png";
import { uiManager } from "../ui/UIManager";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.charVisuals = new Map();
  }

  preload() {
    this.load.image("character", CHARACTER_IMG);
    this.load.image("copper_ore", COPPER_ORE_IMG);
    this.load.image("grass", GRASS_IMG);
    this.load.image("tree", TREE_IMG);
    this.load.image("campfire", CAMPFIRE_IMG);
    this.load.image("tent", TENT_IMG);
  }

  create() {
    console.log("MainScene started");
    gameState.initialize();

    uiManager.initialize();

    // 1. Tiled Background
    this.add.tileSprite(0, 0, 2048, 1536, "grass").setOrigin(0, 0);

    // 2. Base Camp
    this.add
      .image(512, 350, "tent")
      .setScale(2)
      .setOrigin(0.5, 1)
      .setDepth(350);
    this.add.image(512, 400, "campfire").setScale(2).setDepth(400);

    // 3. Decorate World
    // Using a group for trees to ensure they don't duplicate on HMR if Logic was outside
    // But create() clears scene, so simplistic approach is fine.
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(50, 974);
      const y = Phaser.Math.Between(50, 718);
      if (Phaser.Math.Distance.Between(x, y, 512, 400) > 150) {
        this.add
          .image(x, y, "tree")
          .setScale(1.5)
          .setOrigin(0.5, 1)
          .setDepth(y);
      }
    }

    // Ore
    this.add.image(200, 600, "copper_ore").setScale(2).setDepth(600);

    // Listeners
    gameState.addListener(() => this.updateVisuals());
    this.updateVisuals();
  }

  update(time, delta) {
    gameState.tick();
  }

  updateVisuals() {
    gameState.characters.forEach((char) => {
      let visual = this.charVisuals.get(char.id);

      if (!visual) {
        // Create Visual
        const container = this.add.container(512, 420);
        const sprite = this.add.sprite(0, 0, "character").setScale(2);
        container.add([sprite]);
        this.charVisuals.set(char.id, { container });
        visual = { container };
      }

      // Update State
      if (char.currentActivity && char.currentActivity.type === "MINING") {
        visual.container.x = 200;
        visual.container.y = 600;
        visual.container.setDepth(601); // In front of ore
      } else {
        visual.container.x = 560;
        visual.container.y = 420;
        visual.container.setDepth(420);
      }
    });
  }
}
