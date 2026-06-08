# Game Assets Management

This directory serves as the structure for static assets consumed by the Phaser 3 games (Neon Snake, Space Defender, Memory Matrix).

## Directory Tree

We structure assets as follows:
- `game/assets/audio/` - Sound effect (.mp3 / .wav) files and loops loaded via Phaser or Howler.
- `game/assets/sprites/` - Multi-frame spritesheets and texture atlases.
- `game/assets/fonts/` - Monospace / retro-styled font files loaded via WebFont loader or CSS face.

---

## Retro Font Styling Guidelines

For all classic pixel/remaster styles, use retro fonts like **Press Start 2P** or **Orbitron** from Google Fonts:
- Set up WebFont loader configuration inside Phaser games.
- Alternative: Declare custom CSS `@font-face` inside `globals.css` and use native Canvas text styling once loaded.

---

## Sprite Sheet Generation Guidelines

* **Grid Sizing**: Standard grid spacing is 32x32px or 64x64px.
* **Format**: Transparency via PNG-8 or PNG-24 with alpha channel.
* **Tooling**: Generate sheets using TexturePacker or spritesheet generator CLI, outputting to a JSON hash atlas for dynamic frames matching:
  ```json
  {
    "frames": {
      "player_idle_0": { "frame": { "x": 0, "y": 0, "w": 32, "h": 32 } }
    }
  }
  ```

---

## Sound Guidelines (Howler / Phaser Audio)

For sound effects (FX) and background music (BGM):
* Keep audio assets under 500KB to reduce initial payload overhead.
* Load audio files dynamically on pointer interactions to avoid browser autoplay blocks:
  ```typescript
  this.sound.add('laser_sfx');
  ```
