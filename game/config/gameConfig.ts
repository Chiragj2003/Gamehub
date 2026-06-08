import * as Phaser from "phaser";

export function getPhaserConfig(
  scene: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[],
  parentElId: string
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentElId,
    backgroundColor: "#09090b", // syncs with Tailwind zinc-950
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      max: {
        width: 1280,
        height: 720
      }
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: scene
  };
}
