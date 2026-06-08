import * as Phaser from "phaser";
import { getPhaserConfig } from "../config/gameConfig";

export class GameEngine {
  private static instance: Phaser.Game | null = null;

  public static start(
    parentElId: string,
    scene: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[]
  ): Phaser.Game {
    // Clean up any existing instances first to prevent active canvas leaks
    GameEngine.destroy();

    const config = getPhaserConfig(scene, parentElId);
    const game = new Phaser.Game(config);
    GameEngine.instance = game;
    return game;
  }

  public static pause() {
    if (GameEngine.instance) {
      GameEngine.instance.scene.scenes.forEach(s => {
        if (s.scene.isActive()) {
          s.scene.pause();
          s.events.emit("game-paused");
        }
      });
    }
  }

  public static resume() {
    if (GameEngine.instance) {
      GameEngine.instance.scene.scenes.forEach(s => {
        if (s.scene.isPaused()) {
          s.scene.resume();
          s.events.emit("game-resumed");
        }
      });
    }
  }

  public static destroy() {
    if (GameEngine.instance) {
      try {
        GameEngine.instance.destroy(true);
      } catch (e) {
        console.warn("Error destroying Phaser game instance:", e);
      }
      GameEngine.instance = null;
    }
  }

  public static getInstance(): Phaser.Game | null {
    return GameEngine.instance;
  }
}
