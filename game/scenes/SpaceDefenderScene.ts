import * as Phaser from "phaser";
import { AudioManager } from "@/lib/audioManager";


export default class SpaceDefenderScene extends Phaser.Scene {
  // Game entities
  private player!: Phaser.Physics.Arcade.Image;
  private lasers!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;

  // Boss state
  private bossActive = false;
  private bossShip: Phaser.Physics.Arcade.Image | null = null;
  private bossHealth = 100;
  private bossMaxHealth = 100;
  private bossHealthBar!: Phaser.GameObjects.Graphics;

  // Game state
  private score = 0;
  private lives = 3;
  private wave = 1;
  private isGameOver = false;

  // Timers and settings
  private fireRate = 350; // ms cooldown
  private nextFire = 0;
  private enemySpawnRate = 2000; // ms between spawns
  private nextEnemySpawn = 0;
  private speedMultiplier = 1.0;

  // Powerup active states
  private hasShield = false;
  private shieldSprite: Phaser.GameObjects.Graphics | null = null;
  private isRapidFire = false;
  private rapidFireTimer = 0;

  // Particles
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("SpaceDefenderScene");
  }

  public init() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.isGameOver = false;
    this.bossActive = false;
    this.bossShip = null;
    this.hasShield = false;
    this.isRapidFire = false;
    this.fireRate = 350;
    this.enemySpawnRate = 2000;
    this.speedMultiplier = 1.0;
    this.nextEnemySpawn = 0;
    this.nextFire = 0;
  }

  public preload() {
    const gfx = this.make.graphics();

    // 1. Player Ship (Neon Cyan triangle style)
    gfx.clear();
    gfx.lineStyle(2, 0x22d3ee, 1);
    gfx.fillStyle(0x0891b2, 0.9);
    gfx.beginPath();
    gfx.moveTo(20, 0);
    gfx.lineTo(40, 36);
    gfx.lineTo(0, 36);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    gfx.generateTexture("player", 40, 40);

    // 2. Enemy Ship (Neon Red claw style)
    gfx.clear();
    gfx.lineStyle(2, 0xf87171, 1);
    gfx.fillStyle(0xdc2626, 0.9);
    gfx.beginPath();
    gfx.moveTo(0, 0);
    gfx.lineTo(32, 0);
    gfx.lineTo(24, 28);
    gfx.lineTo(16, 12);
    gfx.lineTo(8, 28);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    gfx.generateTexture("enemy", 32, 32);

    // 3. Boss Ship (Large Purple dreadnought style)
    gfx.clear();
    gfx.lineStyle(3, 0xc084fc, 1);
    gfx.fillStyle(0x7c3aed, 0.9);
    gfx.beginPath();
    gfx.moveTo(48, 0);
    gfx.lineTo(96, 32);
    gfx.lineTo(80, 80);
    gfx.lineTo(16, 80);
    gfx.lineTo(0, 32);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    gfx.generateTexture("boss", 96, 96);

    // 4. Laser (Player)
    gfx.clear();
    gfx.fillStyle(0x22d3ee, 1);
    gfx.fillRect(0, 0, 4, 16);
    gfx.generateTexture("laser", 4, 16);

    // 5. Enemy Bullet
    gfx.clear();
    gfx.fillStyle(0xf87171, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture("bullet", 8, 8);

    // 6. Rapid Fire Powerup (Yellow rectangle)
    gfx.clear();
    gfx.lineStyle(2, 0xfde047, 1);
    gfx.fillStyle(0xeab308, 0.8);
    gfx.fillRect(2, 2, 20, 20);
    gfx.strokeRect(0, 0, 24, 24);
    gfx.generateTexture("power_rapid", 24, 24);

    // 7. Shield Powerup (Blue circle)
    gfx.clear();
    gfx.lineStyle(2, 0x60a5fa, 1);
    gfx.fillStyle(0x2563eb, 0.8);
    gfx.fillCircle(12, 12, 9);
    gfx.strokeCircle(12, 12, 11);
    gfx.generateTexture("power_shield", 24, 24);

    // 8. Life Powerup (Green heart/plus cross)
    gfx.clear();
    gfx.lineStyle(2, 0x4ade80, 1);
    gfx.fillStyle(0x16a34a, 0.8);
    gfx.fillRect(8, 2, 8, 20);
    gfx.fillRect(2, 8, 20, 8);
    gfx.generateTexture("power_life", 24, 24);

    // 9. Explosion Spark Particle
    gfx.clear();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(3, 3, 3);
    gfx.generateTexture("sparkle", 6, 6);
  }

  public create() {
    // Play BGM
    AudioManager.playBGM("space_theme");

    // Listen to scene shutdown to clean up BGM
    this.events.on("shutdown", () => {
      AudioManager.stopBGM();
    });

    // Background Grid
    this.drawBackgroundGrid();

    // Create Groups
    this.lasers = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // Player Instantiation
    this.player = this.physics.add.image(400, 520, "player");
    this.player.setCollideWorldBounds(true);

    // Shield Sprite Overlay container
    this.shieldSprite = this.add.graphics();

    // Explosion Particle Emitter
    this.explosionEmitter = this.add.particles(0, 0, "sparkle", {
      speed: { min: 40, max: 200 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1.0, end: 0 },
      lifespan: 500,
      blendMode: "ADD",
      emitting: false
    });

    // Boss Health Bar graphics
    this.bossHealthBar = this.add.graphics();
    this.bossHealthBar.setVisible(false);

    // Mouse Pointer controls
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isGameOver) {
        this.player.x = pointer.worldX;
      }
    });

    // Tap or space to fire (autofire is also enabled)
    this.input.on("pointerdown", () => {
      this.firePlayerLaser();
    });

    this.input.keyboard!.on("keydown-SPACE", () => {
      this.firePlayerLaser();
    });

    // Collisions setup
    // 1. Player laser hitting enemies
    this.physics.add.collider(
      this.lasers,
      this.enemies,
      (laser, enemy) => {
        laser.destroy();
        this.damageEnemy(enemy as Phaser.Physics.Arcade.Image);
      },
      undefined,
      this
    );

    // 2. Enemies or bullets hitting Player
    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_, enemy) => {
        enemy.destroy();
        this.hitPlayer();
      },
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      (_, bullet) => {
        bullet.destroy();
        this.hitPlayer();
      },
      undefined,
      this
    );

    // 3. Player collecting Powerups
    this.physics.add.overlap(
      this.player,
      this.powerups,
      (_, powerup) => {
        this.collectPowerup(powerup as Phaser.Physics.Arcade.Image);
      },
      undefined,
      this
    );

    // Send starting stats
    this.game.events.emit("score-changed", 0);
    this.game.events.emit("hud-message", `WAVE ${this.wave}`);
  }

  public update(time: number, delta: number) {
    if (this.isGameOver) return;

    // Draw active bubble shield if applicable
    this.updateShieldGraphic();

    // Auto firing player lasers when mouse is down or simply continuously
    if (time > this.nextFire) {
      const actualCooldown = this.isRapidFire ? this.fireRate / 2 : this.fireRate;
      this.nextFire = time + actualCooldown;
      this.firePlayerLaser();
    }

    // Rapid Fire Timer update
    if (this.isRapidFire) {
      this.rapidFireTimer -= delta;
      if (this.rapidFireTimer <= 0) {
        this.isRapidFire = false;
        this.game.events.emit("hud-message", "");
      }
    }

    // Spawn waves logic
    if (time > this.nextEnemySpawn) {
      this.nextEnemySpawn = time + this.enemySpawnRate;
      this.spawnWaveUnit();
    }

    // Boss attack movements
    if (this.bossActive && this.bossShip && this.bossShip.active) {
      // Bounce boss left/right
      if (this.bossShip.x >= 730) {
        this.bossShip.setVelocityX(-120);
      } else if (this.bossShip.x <= 70) {
        this.bossShip.setVelocityX(120);
      }

      // Boss shoots bullets down
      if (Math.random() < 0.04) {
        this.fireBossBullet();
      }

      this.drawBossHealthBar();
    }

    // Cleanup offscreen objects to save memory
    this.cleanupOffscreen();
  }

  private firePlayerLaser() {
    if (this.isGameOver) return;
    AudioManager.playSFX("laser");
    const laser = this.lasers.create(this.player.x, this.player.y - 20, "laser") as Phaser.Physics.Arcade.Image;
    laser.setVelocityY(-450);
  }

  private spawnWaveUnit() {
    if (this.bossActive) return;

    // Boss Spawn triggers every 5 wave levels
    if (this.score > 0 && this.score % 150 === 0 && !this.bossActive) {
      this.spawnBoss();
      return;
    }

    // Regular waves
    const columns = 5;
    const spacing = 100;
    const startX = Phaser.Math.Between(50, 800 - (columns * spacing));

    for (let i = 0; i < columns; i++) {
      // 10% chance to skip a slot to make dynamic gaps
      if (Math.random() < 0.15) continue;

      const x = startX + i * spacing;
      const enemy = this.enemies.create(x, -30, "enemy") as Phaser.Physics.Arcade.Image;
      enemy.setVelocityY(80 * this.speedMultiplier);

      // Alien occasionally fires bullets back
      this.time.delayedCall(Phaser.Math.Between(500, 3000), () => {
        if (enemy && enemy.active) {
          this.fireEnemyBullet(enemy.x, enemy.y);
        }
      });
    }
  }

  private fireEnemyBullet(x: number, y: number) {
    if (this.isGameOver || !this.player.active) return;
    const bullet = this.enemyBullets.create(x, y + 15, "bullet") as Phaser.Physics.Arcade.Image;
    bullet.setVelocityY(200 * this.speedMultiplier);
  }

  private spawnBoss() {
    this.bossActive = true;
    this.bossMaxHealth = 100 + (this.wave * 50);
    this.bossHealth = this.bossMaxHealth;
    this.nextEnemySpawn = Number.MAX_SAFE_INTEGER; // freeze normal waves

    AudioManager.playSFX("boss_spawn");

    this.game.events.emit("hud-message", `BOSS APPEARED! (WAVE ${this.wave})`);

    // Create Boss Image
    this.bossShip = this.physics.add.image(400, -80, "boss") as Phaser.Physics.Arcade.Image;
    this.bossShip.setCollideWorldBounds(true);
    
    // Animate descent
    this.tweens.add({
      targets: this.bossShip,
      y: 120,
      duration: 2000,
      ease: "Power2",
      onComplete: () => {
        if (this.bossShip) {
          this.bossShip.setVelocityX(120);
          this.bossHealthBar.setVisible(true);
        }
      }
    });

    // Make boss collidable with player
    this.physics.add.overlap(this.player, this.bossShip, () => {
      this.hitPlayer();
    }, undefined, this);
  }

  private fireBossBullet() {
    if (!this.bossShip || !this.bossShip.active) return;
    const bx = this.bossShip.x;
    const by = this.bossShip.y + 40;

    // Triple bullets spread
    const velocities = [-80, 0, 80];
    velocities.forEach(vx => {
      const bullet = this.enemyBullets.create(bx, by, "bullet") as Phaser.Physics.Arcade.Image;
      bullet.setVelocity(vx, 240);
    });
  }

  private damageEnemy(enemy: Phaser.Physics.Arcade.Image) {
    AudioManager.playSFX("explode");
    if (enemy === this.bossShip) {
      this.bossHealth -= 10;
      this.explosionEmitter.emitParticleAt(enemy.x + Phaser.Math.Between(-30, 30), enemy.y + 20, 5);

      if (this.bossHealth <= 0) {
        // Boss Defeated!
        this.explosionEmitter.emitParticleAt(enemy.x, enemy.y, 45);
        this.bossShip.destroy();
        this.bossShip = null;
        this.bossActive = false;
        this.bossHealthBar.setVisible(false);
        this.bossHealthBar.clear();

        this.score += 150; // Big bonus
        this.wave += 1;
        this.speedMultiplier += 0.15;
        this.enemySpawnRate = Math.max(1000, 2000 - (this.wave * 100));

        this.game.events.emit("score-changed", this.score);
        this.game.events.emit("hud-message", `WAVE ${this.wave} COMPLETED!`);
        
        // Spawn guaranteed triple powerup shower
        this.spawnPowerupAt(300, 150, "power_rapid");
        this.spawnPowerupAt(400, 150, "power_shield");
        this.spawnPowerupAt(500, 150, "power_life");

        // Resume spawning waves in 3 seconds
        this.time.delayedCall(3000, () => {
          this.nextEnemySpawn = this.time.now;
        });
      }
    } else {
      // Normal alien hit
      this.explosionEmitter.emitParticleAt(enemy.x, enemy.y, 15);
      enemy.destroy();
      this.score += 10;
      this.game.events.emit("score-changed", this.score);

      // Random power-up drop check (12% drop rate)
      if (Math.random() < 0.12) {
        const rng = Math.random();
        const type = rng < 0.45 ? "power_rapid" : rng < 0.85 ? "power_shield" : "power_life";
        this.spawnPowerupAt(enemy.x, enemy.y, type);
      }
    }
  }

  private spawnPowerupAt(x: number, y: number, type: string) {
    const power = this.powerups.create(x, y, type) as Phaser.Physics.Arcade.Image;
    power.setVelocityY(100);
  }

  private collectPowerup(powerup: Phaser.Physics.Arcade.Image) {
    const type = powerup.texture.key;
    powerup.destroy();

    AudioManager.playSFX("powerup");

    // Trigger feedback particle flash
    this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 25);

    if (type === "power_rapid") {
      this.isRapidFire = true;
      this.rapidFireTimer = 8000; // 8 seconds of fast firing
      this.game.events.emit("hud-message", "RAPID FIRE ENERGIZED! (8s)");
    } else if (type === "power_shield") {
      this.hasShield = true;
      this.game.events.emit("hud-message", "SHIELD GRID ENFORCED!");
    } else if (type === "power_life") {
      if (this.lives < 5) {
        this.lives += 1;
        this.game.events.emit("lives-changed", this.lives);
        this.game.events.emit("hud-message", "LIVES EXPANDED!");
      }
    }
  }

  private hitPlayer() {
    if (this.isGameOver) return;

    // Screen Shake effect
    this.cameras.main.shake(200, 0.015);

    if (this.hasShield) {
      // Shield absorbs the blow
      this.hasShield = false;
      this.game.events.emit("hud-message", "SHIELD DEFLECTED!");
      this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 30);
      AudioManager.playSFX("button_click"); // Shield block chime
      return;
    }

    this.lives -= 1;
    this.game.events.emit("lives-changed", this.lives);

    // Player collision explosion sparks
    this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 35);
    AudioManager.playSFX("explode");

    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  private updateShieldGraphic() {
    if (!this.shieldSprite) return;
    this.shieldSprite.clear();

    if (this.hasShield) {
      // Cycle opacity with neon blue pulse
      const pulse = 0.5 + Math.sin(this.time.now / 150) * 0.25;
      this.shieldSprite.lineStyle(3, 0x60a5fa, pulse);
      this.shieldSprite.fillStyle(0x3b82f6, pulse * 0.2);
      this.shieldSprite.fillCircle(this.player.x, this.player.y, 30);
      this.shieldSprite.strokeCircle(this.player.x, this.player.y, 30);
    }
  }

  private drawBossHealthBar() {
    if (!this.bossShip || !this.bossShip.active) return;
    this.bossHealthBar.clear();

    // Red health bar above boss
    const bx = this.bossShip.x - 48;
    const by = this.bossShip.y - 60;
    const pct = this.bossHealth / this.bossMaxHealth;

    // Bar border
    this.bossHealthBar.lineStyle(1.5, 0xffffff, 0.6);
    this.bossHealthBar.strokeRect(bx, by, 96, 6);

    // Fill
    this.bossHealthBar.fillStyle(0xef4444, 0.85);
    this.bossHealthBar.fillRect(bx + 1, by + 1, 94 * pct, 4);
  }

  private cleanupOffscreen() {
    // 1. Clean player lasers
    this.lasers.getChildren().forEach(laser => {
      const l = laser as Phaser.Physics.Arcade.Image;
      if (l.y < -20) l.destroy();
    });

    // 2. Clean enemies passing bottom limit
    this.enemies.getChildren().forEach(enemy => {
      const e = enemy as Phaser.Physics.Arcade.Image;
      if (e.y > 620) {
        e.destroy();
        // Missing passing enemies penalizes lives
        this.hitPlayer();
      }
    });

    // 3. Clean enemy bullets
    this.enemyBullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (b.y > 620) b.destroy();
    });

    // 4. Clean dropped powerups
    this.powerups.getChildren().forEach(powerup => {
      const p = powerup as Phaser.Physics.Arcade.Image;
      if (p.y > 620) p.destroy();
    });
  }

  private drawBackgroundGrid() {
    const bg = this.add.graphics();
    bg.lineStyle(1, 0xffffff, 0.02);
    const cellSize = 40;

    for (let c = 0; c <= 800; c += cellSize) {
      bg.lineBetween(c, 0, c, 600);
    }

    for (let r = 0; r <= 600; r += cellSize) {
      bg.lineBetween(0, r, 800, r);
    }
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.player.setVisible(false);
    this.player.disableBody(true, true);
    
    AudioManager.stopBGM();
    AudioManager.playSFX("gameover");

    // Giant explosion particles
    this.explosionEmitter.emitParticleAt(this.player.x, this.player.y, 60);
    // Save high score locally
    try {
      const saved = localStorage.getItem("game_hub_hs_space-defender");
      const hs = saved ? parseInt(saved, 10) : 0;
      if (this.score > hs) {
        localStorage.setItem("game_hub_hs_space-defender", this.score.toString());
      }
    } catch {}

    // Broadcast completion state
    this.time.delayedCall(1200, () => {
      this.game.events.emit("game-over", this.score);
    });
  }
}
