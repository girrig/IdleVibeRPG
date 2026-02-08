import Phaser from "phaser";
import { gameState } from "../core/GameState";
import { uiManager } from "../ui/UIManager";

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // No images to preload!
  }

  create() {
    console.log("MainScene started");
    try {
      gameState.initialize();
      uiManager.initialize();
      console.log("Game initialized");

      this.cameras.main.centerOn(512, 384);
      this.cameras.main.setBackgroundColor(0x111111);

      this.scale.on("resize", this.handleResize, this);
      this.handleResize(this.scale.gameSize);
    } catch (e) {
      console.error("CRITICAL ERROR in MainScene.create:", e);
    }
  }

  handleResize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.centerOn(512, 384);
    this.cameras.main.setZoom(1);
  }

  update(time, delta) {
    gameState.tick();
  }
}
