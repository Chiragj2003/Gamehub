"use client";

import React, { useEffect } from "react";
import * as Phaser from "phaser";

export default function PhaserTestComponent() {
  useEffect(() => {
    class TestScene extends Phaser.Scene {
      constructor() {
        super("TestScene");
      }

      preload() {}

      create() {
        const rect = this.add.graphics();
        rect.fillStyle(0x22c55e, 1); // Green square color
        rect.fillRect(350, 250, 100, 100);
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: "phaser-test-container",
      backgroundColor: "#000000",
      scene: [TestScene],
    };

    const game = new Phaser.Game(config);

    // Clean up Phaser context on unmount
    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <div className="relative">
      <div id="phaser-test-container" className="w-[800px] h-[600px] bg-black" />
    </div>
  );
}
