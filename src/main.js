import "./style.css";
import Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: "app",
  pixelArt: true,
  // Fallback background color if tiles fail
  backgroundColor: "#2d5e2e",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
};

const game = new Phaser.Game(config);
