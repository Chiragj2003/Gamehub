import * as Phaser from "phaser";
import { AudioManager } from "@/lib/audioManager";


interface Position {
  x: number;
  y: number;
}

export default class SnakeScene extends Phaser.Scene {
  private snake: Position[] = [];
  private snakeSegments: Phaser.GameObjects.Graphics[] = [];
  private direction: Position = { x: 1, y: 0 };
  private nextDirection: Position = { x: 1, y: 0 };
  private gridSize = 20;
  private widthCells = 40;
  private heightCells = 30;

  private food!: Position;
  private foodGraphic!: Phaser.GameObjects.Graphics;
  private powerup!: Position | null;
  private powerupType: "slow" | "double" | null = null;
  private powerupGraphic!: Phaser.GameObjects.Graphics;

  private score = 0;
  private highScore = 0;
  private isGameOver = false;

  private moveTimer = 0;
  private moveSpeed = 150; // ms per grid move (starts at 150ms)
  private timeScale = 1.0; // modified by slow power-up
  private doublePoints = false;
  private doublePointsTimer = 0;
  private slowTimer = 0;

  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Swipe gesture tracking
  private swipeStart!: Phaser.Input.Pointer;

  constructor() {
    super("SnakeScene");
  }

  public init() {
    this.score = 0;
    this.moveSpeed = 150;
    this.timeScale = 1.0;
    this.doublePoints = false;
    this.isGameOver = false;
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.snake = [
      { x: 10, y: 15 },
      { x: 9, y: 15 },
      { x: 8, y: 15 }
    ];
    this.powerup = null;
    this.powerupType = null;
    this.doublePointsTimer = 0;
    this.slowTimer = 0;

    try {
      const saved = localStorage.getItem("game_hub_hs_neon-snake");
      this.highScore = saved ? parseInt(saved, 10) : 0;
    } catch {
      this.highScore = 0;
    }
  }

  public preload() {
    // Generate simple particle texture dynamically
    const circle = this.make.graphics();
    circle.fillStyle(0xffffff);
    circle.fillCircle(4, 4, 4);
    circle.generateTexture("spark", 8, 8);
  }

  public create() {
    // Play BGM
    AudioManager.playBGM("snake_theme");

    // Listen to scene shutdown to clean up BGM
    this.events.on("shutdown", () => {
      AudioManager.stopBGM();
    });

    // Background Grid lines
    this.drawBackgroundGrid();

    // Snake Graphics Pool
    this.snakeSegments = [];
    this.updateSnakeGraphics();

    // Spawn Food
    this.foodGraphic = this.add.graphics();
    this.spawnFood();

    // Powerup Graphic
    this.powerupGraphic = this.add.graphics();

    // Controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,P") as Record<string, Phaser.Input.Keyboard.Key>;

    // Prevent default browser scrolling behavior for standard game keys
    this.input.keyboard!.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);

    // Neon Spark Particles
    this.particles = this.add.particles(0, 0, "spark", {
      speed: { min: 50, max: 150 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1.0, end: 0 },
      lifespan: 600,
      blendMode: "ADD",
      emitting: false
    });

    // Mobile Swipe detection
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.swipeStart = pointer;
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = pointer.upX - this.swipeStart.downX;
      const dy = pointer.upY - this.swipeStart.downY;
      const threshold = 40; // minimum pixels to count as swipe

      if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > threshold) {
          if (dx > 0 && this.direction.x !== -1) {
            this.nextDirection = { x: 1, y: 0 }; // Right
          } else if (dx < 0 && this.direction.x !== 1) {
            this.nextDirection = { x: -1, y: 0 }; // Left
          }
        }
      } else {
        if (Math.abs(dy) > threshold) {
          if (dy > 0 && this.direction.y !== -1) {
            this.nextDirection = { x: 0, y: 1 }; // Down
          } else if (dy < 0 && this.direction.y !== 1) {
            this.nextDirection = { x: 0, y: -1 }; // Up
          }
        }
      }
    });

    // Broadcast starting state
    this.game.events.emit("score-changed", 0);
  }

  public update(time: number, delta: number) {
    if (this.isGameOver) return;

    // Handle Keyboard input
    this.handleKeyboard();

    // Powerup Timer decrementers
    if (this.doublePoints) {
      this.doublePointsTimer -= delta;
      if (this.doublePointsTimer <= 0) {
        this.doublePoints = false;
        this.game.events.emit("hud-message", "");
      }
    }

    if (this.timeScale < 1.0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.timeScale = 1.0;
        this.game.events.emit("hud-message", "");
      }
    }

    // Grid move throttle
    this.moveTimer += delta;
    const currentTickRate = this.moveSpeed * this.timeScale;
    if (this.moveTimer >= currentTickRate) {
      this.moveTimer = 0;
      this.moveSnake();
    }
  }

  private handleKeyboard() {
    // Horizontal check to prevent running back into self
    if (this.direction.x === 0) {
      if (this.cursors.left.isDown || this.keys.A.isDown) {
        this.nextDirection = { x: -1, y: 0 };
      } else if (this.cursors.right.isDown || this.keys.D.isDown) {
        this.nextDirection = { x: 1, y: 0 };
      }
    }

    // Vertical check
    if (this.direction.y === 0) {
      if (this.cursors.up.isDown || this.keys.W.isDown) {
        this.nextDirection = { x: 0, y: -1 };
      } else if (this.cursors.down.isDown || this.keys.S.isDown) {
        this.nextDirection = { x: 0, y: 1 };
      }
    }
  }

  private moveSnake() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    const newHead: Position = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y
    };

    // Boundary Wall Collision
    if (
      newHead.x < 0 ||
      newHead.x >= this.widthCells ||
      newHead.y < 0 ||
      newHead.y >= this.heightCells
    ) {
      this.triggerGameOver();
      return;
    }

    // Body Self Collision
    for (const segment of this.snake) {
      if (segment.x === newHead.x && segment.y === newHead.y) {
        this.triggerGameOver();
        return;
      }
    }

    // Prepend new head
    this.snake.unshift(newHead);

    // Food Collision Check
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      AudioManager.playSFX("eat");
      const addedPoints = this.doublePoints ? 20 : 10;
      this.score += addedPoints;
      this.game.events.emit("score-changed", this.score);

      // Particle burst
      this.particles.emitParticleAt(
        newHead.x * this.gridSize + 10,
        newHead.y * this.gridSize + 10,
        15
      );

      this.spawnFood();

      // Dynamic difficulty speedup
      this.moveSpeed = Math.max(70, 150 - Math.floor(this.score / 5));

      // 20% Chance to spawn a Powerup
      if (Math.random() < 0.20 && !this.powerup) {
        this.spawnPowerup();
      }
    } else if (this.powerup && newHead.x === this.powerup.x && newHead.y === this.powerup.y) {
      AudioManager.playSFX("powerup");
      // Collect Powerup
      if (this.powerupType === "slow") {
        this.timeScale = 0.6;
        this.slowTimer = 8000; // 8 seconds of slow motion
        this.game.events.emit("hud-message", "SLOW TIME ACTIVATED! (8s)");
      } else if (this.powerupType === "double") {
        this.doublePoints = true;
        this.doublePointsTimer = 8000; // 8 seconds of double points
        this.game.events.emit("hud-message", "DOUBLE POINTS CHARGED! (8s)");
      }

      this.particles.emitParticleAt(
        this.powerup.x * this.gridSize + 10,
        this.powerup.y * this.gridSize + 10,
        25
      );

      this.powerup = null;
      this.powerupType = null;
      this.powerupGraphic.clear();
    } else {
      // Pop tail to maintain same length
      this.snake.pop();
    }

    this.updateSnakeGraphics();
  }

  private spawnFood() {
    let valid = false;
    let rx = 0;
    let ry = 0;

    while (!valid) {
      rx = Phaser.Math.Between(0, this.widthCells - 1);
      ry = Phaser.Math.Between(0, this.heightCells - 1);
      valid = true;

      // Check if coordinates overlap with snake body
      for (const segment of this.snake) {
        if (segment.x === rx && segment.y === ry) {
          valid = false;
          break;
        }
      }
    }

    this.food = { x: rx, y: ry };

    // Render Neon Food (Green glow)
    this.foodGraphic.clear();
    this.foodGraphic.lineStyle(2, 0x10b981, 1);
    this.foodGraphic.fillStyle(0x059669, 0.8);
    this.foodGraphic.fillCircle(
      this.food.x * this.gridSize + 10,
      this.food.y * this.gridSize + 10,
      6
    );
    this.foodGraphic.strokeCircle(
      this.food.x * this.gridSize + 10,
      this.food.y * this.gridSize + 10,
      7
    );
  }

  private spawnPowerup() {
    let valid = false;
    let rx = 0;
    let ry = 0;

    while (!valid) {
      rx = Phaser.Math.Between(0, this.widthCells - 1);
      ry = Phaser.Math.Between(0, this.heightCells - 1);
      valid = true;

      // Don't overlap food or snake
      if (rx === this.food.x && ry === this.food.y) {
        valid = false;
        continue;
      }

      for (const segment of this.snake) {
        if (segment.x === rx && segment.y === ry) {
          valid = false;
          break;
        }
      }
    }

    this.powerup = { x: rx, y: ry };
    this.powerupType = Math.random() < 0.5 ? "slow" : "double";

    // Draw Powerup Capsule
    this.powerupGraphic.clear();
    if (this.powerupType === "slow") {
      // Purple slow core
      this.powerupGraphic.lineStyle(2, 0xc084fc, 1);
      this.powerupGraphic.fillStyle(0x8b5cf6, 0.8);
    } else {
      // Yellow double core
      this.powerupGraphic.lineStyle(2, 0xfde047, 1);
      this.powerupGraphic.fillStyle(0xeab308, 0.8);
    }

    const px = this.powerup.x * this.gridSize + 10;
    const py = this.powerup.y * this.gridSize + 10;
    this.powerupGraphic.fillRect(px - 6, py - 6, 12, 12);
    this.powerupGraphic.strokeRect(px - 7, py - 7, 14, 14);
  }

  private updateSnakeGraphics() {
    // Clear old segment meshes
    this.snakeSegments.forEach(s => s.destroy());
    this.snakeSegments = [];

    // Draw snake body
    this.snake.forEach((segment, index) => {
      const g = this.add.graphics();
      const px = segment.x * this.gridSize;
      const py = segment.y * this.gridSize;

      if (index === 0) {
        // Head: Neon Cyan base
        g.lineStyle(2, 0x22d3ee, 1);
        g.fillStyle(0x06b6d4, 0.9);
        g.fillRect(px + 1, py + 1, 18, 18);
        g.strokeRect(px, py, 20, 20);

        // Add small pupils based on direction
        g.fillStyle(0xffffff, 1);
        if (this.direction.x !== 0) {
          g.fillRect(px + (this.direction.x > 0 ? 12 : 4), py + 4, 3, 3);
          g.fillRect(px + (this.direction.x > 0 ? 12 : 4), py + 12, 3, 3);
        } else {
          g.fillRect(px + 4, py + (this.direction.y > 0 ? 12 : 4), 3, 3);
          g.fillRect(px + 12, py + (this.direction.y > 0 ? 12 : 4), 3, 3);
        }
      } else {
        // Tail Segment: Neon Violet fade
        const alpha = Math.max(0.3, 1 - index / this.snake.length);
        g.lineStyle(1.5, 0xc084fc, alpha);
        g.fillStyle(0x8b5cf6, alpha * 0.7);
        g.fillRect(px + 2, py + 2, 16, 16);
        g.strokeRect(px + 1, py + 1, 18, 18);
      }

      this.snakeSegments.push(g);
    });
  }

  private drawBackgroundGrid() {
    const bg = this.add.graphics();
    bg.lineStyle(1, 0xffffff, 0.03);

    for (let c = 0; c <= this.widthCells; c++) {
      bg.lineBetween(c * this.gridSize, 0, c * this.gridSize, this.game.scale.height);
    }

    for (let r = 0; r <= this.heightCells; r++) {
      bg.lineBetween(0, r * this.gridSize, this.game.scale.width, r * this.gridSize);
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    
    // Stop BGM and play Game Over crash SFX
    AudioManager.stopBGM();
    AudioManager.playSFX("gameover");
    
    // Flash background red
    this.cameras.main.flash(400, 150, 0, 0);

    // Save high score locally
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem("game_hub_hs_neon-snake", this.score.toString());
      } catch {}
    }

    // Broadcast Game Over event to React with Score Submit prompt
    this.time.delayedCall(800, () => {
      this.game.events.emit("game-over", this.score);
    });
  }
}
