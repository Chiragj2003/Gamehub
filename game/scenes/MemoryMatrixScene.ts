import * as Phaser from "phaser";
import { AudioManager } from "@/lib/audioManager";


interface Tile {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  graphic: Phaser.GameObjects.Graphics;
  baseColor: number;
  glowColor: number;
}

export default class MemoryMatrixScene extends Phaser.Scene {
  // Matrix configurations
  private tiles: Tile[] = [];
  private gridSize = 4; // 4x4
  private tileSize = 80;
  private tileSpacing = 16;
  private startX = 216;
  private startY = 116;

  // Pattern state
  private sequence: number[] = [];
  private playerSequence: number[] = [];
  private sequenceIndex = 0;
  private sequenceLength = 3;
  private maxSequenceLength = 12;

  // Game state
  private score = 0;
  private combo = 0;
  private multiplier = 1;
  private isGameOver = false;
  private isPlaybackActive = false;
  private isPlayerTurn = false;

  // Timer pressure settings
  private timeLimit = 8000; // ms to complete sequence
  private timerRemaining = 8000;
  private timeBar!: Phaser.GameObjects.Graphics;

  // Interactive buttons and feedback
  private feedbackEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("MemoryMatrixScene");
  }

  public init() {
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.sequenceLength = 3;
    this.isGameOver = false;
    this.isPlaybackActive = false;
    this.isPlayerTurn = false;
    this.sequence = [];
    this.playerSequence = [];
  }

  public preload() {
    // Generate simple circle spark
    const circle = this.make.graphics();
    circle.fillStyle(0xffffff);
    circle.fillCircle(4, 4, 4);
    circle.generateTexture("matrix_spark", 8, 8);
  }

  public create() {
    // Play BGM
    AudioManager.playBGM("memory_theme");

    // Listen to scene shutdown to clean up BGM
    this.events.on("shutdown", () => {
      AudioManager.stopBGM();
    });

    // Background Grid
    this.drawBackgroundGrid();

    // Spawn 4x4 Grid Tiles
    this.tiles = [];
    this.createMatrixGrid();

    // Spawn Time Bar graphics
    this.timeBar = this.add.graphics();

    // Click sparkle emitter
    this.feedbackEmitter = this.add.particles(0, 0, "matrix_spark", {
      speed: { min: 60, max: 150 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1.0, end: 0 },
      lifespan: 450,
      blendMode: "ADD",
      emitting: false
    });

    // Start first level sequence in 1 second
    this.time.delayedCall(1000, () => {
      this.startLevel();
    });

    // Send starting stats
    this.game.events.emit("score-changed", 0);
    this.game.events.emit("hud-message", "PREPARE TO MEMORIZE");
  }

  public update(time: number, delta: number) {
    if (this.isGameOver) return;

    // Time pressure decrement during player's turn
    if (this.isPlayerTurn && !this.isPlaybackActive) {
      this.timerRemaining -= delta;
      this.drawTimeBar();

      if (this.timerRemaining <= 0) {
        this.triggerGameOver("TIME OUT");
      }
    } else {
      this.timeBar.clear();
    }
  }

  private createMatrixGrid() {
    // Neon colors for grid elements based on column index
    const colors = [
      { base: 0x06b6d4, glow: 0x22d3ee }, // Column 0: Cyan
      { base: 0x8b5cf6, glow: 0xc084fc }, // Column 1: Violet
      { base: 0xeab308, glow: 0xfde047 }, // Column 2: Yellow
      { base: 0xec4899, glow: 0xfbcfe8 }  // Column 3: Pink
    ];

    let id = 0;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const x = this.startX + c * (this.tileSize + this.tileSpacing);
        const y = this.startY + r * (this.tileSize + this.tileSpacing);

        const colorSet = colors[c];

        // Graphics tile container
        const g = this.add.graphics();
        const tile: Tile = {
          id,
          row: r,
          col: c,
          x,
          y,
          width: this.tileSize,
          height: this.tileSize,
          graphic: g,
          baseColor: colorSet.base,
          glowColor: colorSet.glow
        };

        this.drawTileIdle(tile);

        // Make tile interactive
        const hitArea = new Phaser.Geom.Rectangle(x, y, this.tileSize, this.tileSize);
        g.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // Click bindings
        g.on("pointerdown", () => {
          this.handleTileClick(tile);
        });

        this.tiles.push(tile);
        id++;
      }
    }
  }

  private drawTileIdle(tile: Tile) {
    tile.graphic.clear();
    // Glassmorphic translucent center with glowing stroke borders
    tile.graphic.lineStyle(1.5, tile.baseColor, 0.4);
    tile.graphic.fillStyle(0x18181b, 0.65);
    tile.graphic.fillRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);
    tile.graphic.strokeRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);
  }

  private flashTile(tile: Tile, duration = 400) {
    // Play column-based synth tone SFX
    const toneIds = ["tone_1", "tone_2", "tone_3", "tone_4"];
    const toneId = toneIds[tile.col % 4];
    AudioManager.playSFX(toneId);

    tile.graphic.clear();
    // Bright neon glow fill
    tile.graphic.lineStyle(3, tile.glowColor, 1.0);
    tile.graphic.fillStyle(tile.baseColor, 0.95);
    tile.graphic.fillRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);
    tile.graphic.strokeRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);

    // Sparkle particles
    this.feedbackEmitter.emitParticleAt(tile.x + 40, tile.y + 40, 8);

    this.time.delayedCall(duration, () => {
      if (!this.isGameOver) {
        this.drawTileIdle(tile);
      }
    });
  }

  private startLevel() {
    this.isPlaybackActive = true;
    this.isPlayerTurn = false;
    this.playerSequence = [];
    this.sequenceIndex = 0;

    this.game.events.emit("hud-message", `MEMORIZE PATH (LENGTH ${this.sequenceLength})`);

    // Generate new random sequence path (add one step, or recreate)
    this.sequence = [];
    for (let i = 0; i < this.sequenceLength; i++) {
      this.sequence.push(Phaser.Math.Between(0, 15));
    }

    // Playback sequence flashes
    this.playSequence();
  }

  private playSequence() {
    let index = 0;

    const playNext = () => {
      if (this.isGameOver) return;

      if (index >= this.sequence.length) {
        // End playback, pass turn to player
        this.isPlaybackActive = false;
        this.isPlayerTurn = true;
        this.timerRemaining = this.timeLimit + (this.sequenceLength * 800); // progressive time
        this.game.events.emit("hud-message", "YOUR TURN!");
        return;
      }

      const tileId = this.sequence[index];
      const tile = this.tiles.find(t => t.id === tileId);

      if (tile) {
        this.flashTile(tile, 500);
      }

      index++;
      this.time.delayedCall(750, playNext); // 500ms flash + 250ms gap
    };

    playNext();
  }

  private handleTileClick(tile: Tile) {
    if (this.isGameOver || this.isPlaybackActive || !this.isPlayerTurn) return;

    // Flash tile clicked
    this.flashTile(tile, 250);

    const expectedId = this.sequence[this.sequenceIndex];
    this.playerSequence.push(tile.id);

    if (tile.id === expectedId) {
      // Correct tile clicked!
      this.sequenceIndex++;

      if (this.sequenceIndex >= this.sequence.length) {
        // Level complete!
        this.isPlayerTurn = false;
        this.combo += 1;
        this.multiplier = 1 + Math.floor(this.combo / 3);

        AudioManager.playSFX("victory");

        const addedScore = this.sequenceLength * 10 * this.multiplier;
        this.score += addedScore;
        this.game.events.emit("score-changed", this.score);

        // Flash screen green on success
        this.cameras.main.flash(200, 16, 185, 129, false);

        this.sequenceLength = Math.min(this.maxSequenceLength, this.sequenceLength + 1);
        this.game.events.emit("hud-message", `PERFECT ROUND! (x${this.multiplier})`);

        this.time.delayedCall(1500, () => {
          this.startLevel();
        });
      }
    } else {
      // Incorrect tile clicked!
      this.triggerGameOver("SEQUENCE BROKEN");
    }
  }

  private drawTimeBar() {
    this.timeBar.clear();

    const maxProgressWidth = 800;
    const progressLimit = this.timeLimit + (this.sequenceLength * 800);
    const pct = Math.max(0, this.timerRemaining / progressLimit);

    // Glowing red neon bar
    this.timeBar.lineStyle(1.5, 0xef4444, 0.4);
    this.timeBar.fillStyle(0xdc2626, 0.85);
    this.timeBar.fillRect(0, 0, maxProgressWidth * pct, 6);
  }

  private drawBackgroundGrid() {
    const bg = this.add.graphics();
    bg.lineStyle(1, 0xffffff, 0.02);

    for (let c = 0; c <= 800; c += 40) {
      bg.lineBetween(c, 0, c, 600);
    }

    for (let r = 0; r <= 600; r += 40) {
      bg.lineBetween(0, r, 800, r);
    }
  }

  private triggerGameOver(reason: string) {
    this.isGameOver = true;
    this.isPlayerTurn = false;

    // Stop theme and play fail buzzer sound
    AudioManager.stopBGM();
    AudioManager.playSFX("fail");

    // Flash screen red
    this.cameras.main.flash(400, 239, 68, 68);

    // Red out all tiles
    this.tiles.forEach(tile => {
      tile.graphic.clear();
      tile.graphic.lineStyle(2, 0xef4444, 1.0);
      tile.graphic.fillStyle(0x991b1b, 0.85);
      tile.graphic.fillRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);
      tile.graphic.strokeRoundedRect(tile.x, tile.y, tile.width, tile.height, 8);
    });

    this.game.events.emit("hud-message", `GAME OVER: ${reason}`);
    // Save high score locally
    try {
      const saved = localStorage.getItem("game_hub_hs_memory-matrix");
      const hs = saved ? parseInt(saved, 10) : 0;
      if (this.score > hs) {
        localStorage.setItem("game_hub_hs_memory-matrix", this.score.toString());
      }
    } catch {}

    // Broadcast completion to React
    this.time.delayedCall(1200, () => {
      this.game.events.emit("game-over", this.score);
    });
  }
}
