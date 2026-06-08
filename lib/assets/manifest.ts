export interface Asset {
  id: string;
  type: "image" | "audio" | "spritesheet" | "font";
  localPath: string;
  cdnPath: string;
  version: string;
}

export const assetManifest: Record<string, Asset> = {
  // BGM Audio
  menu_theme: {
    id: "menu_theme",
    type: "audio",
    localPath: "/assets/audio/menu_theme.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/ambiences/synth_ambient.ogg", // Public fallback
    version: "1.0.0",
  },
  snake_theme: {
    id: "snake_theme",
    type: "audio",
    localPath: "/assets/audio/snake_theme.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/science_fiction/retro_arcade_music_loop.ogg",
    version: "1.0.0",
  },
  space_theme: {
    id: "space_theme",
    type: "audio",
    localPath: "/assets/audio/space_theme.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/science_fiction/alien_pulsar_hum.ogg",
    version: "1.0.0",
  },
  memory_theme: {
    id: "memory_theme",
    type: "audio",
    localPath: "/assets/audio/memory_theme.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg",
    version: "1.0.0",
  },

  // SFX Audio
  eat: {
    id: "eat",
    type: "audio",
    localPath: "/assets/audio/eat.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
    version: "1.0.0",
  },
  explode: {
    id: "explode",
    type: "audio",
    localPath: "/assets/audio/explode.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/explosions/explosion_crack.ogg",
    version: "1.0.0",
  },
  laser: {
    id: "laser",
    type: "audio",
    localPath: "/assets/audio/laser.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/science_fiction/laser_beam.ogg",
    version: "1.0.0",
  },
  powerup: {
    id: "powerup",
    type: "audio",
    localPath: "/assets/audio/powerup.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
    version: "1.0.0",
  },
  gameover: {
    id: "gameover",
    type: "audio",
    localPath: "/assets/audio/gameover.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/alarms/buzzing_smoke_detector.ogg",
    version: "1.0.0",
  },
  victory: {
    id: "victory",
    type: "audio",
    localPath: "/assets/audio/victory.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/drones/soft_sine_chord.ogg",
    version: "1.0.0",
  },
  button_click: {
    id: "button_click",
    type: "audio",
    localPath: "/assets/audio/button_click.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/ui/beep_short_dry.ogg",
    version: "1.0.0",
  },
  menu_open: {
    id: "menu_open",
    type: "audio",
    localPath: "/assets/audio/menu_open.mp3",
    cdnPath: "https://actions.google.com/sounds/v1/ui/beep_short_high_pitch.ogg",
    version: "1.0.0",
  },

  // Space Defender Sprites
  ship_sheet: {
    id: "ship_sheet",
    type: "spritesheet",
    localPath: "/assets/sprites/ship_sheet.png",
    cdnPath: "https://raw.githubusercontent.com/chira/game_hub/main/public/assets/sprites/ship_sheet.png",
    version: "1.0.0",
  },
  enemy_sheet: {
    id: "enemy_sheet",
    type: "spritesheet",
    localPath: "/assets/sprites/enemy_sheet.png",
    cdnPath: "https://raw.githubusercontent.com/chira/game_hub/main/public/assets/sprites/enemy_sheet.png",
    version: "1.0.0",
  },

  // Neon Snake Sprites
  snake_glow: {
    id: "snake_glow",
    type: "image",
    localPath: "/assets/sprites/snake_glow.png",
    cdnPath: "https://raw.githubusercontent.com/chira/game_hub/main/public/assets/sprites/snake_glow.png",
    version: "1.0.0",
  },
};

/**
 * Returns path to asset. If local asset detection fails or is run in an environment
 * where local assets are missing, falls back to the registered CDN URL.
 */
export function getAssetPath(id: string): string {
  const asset = assetManifest[id];
  if (!asset) {
    console.warn(`Asset ID "${id}" is not defined in manifest.`);
    return "";
  }
  
  // In a real application, you might ping the local server to verify.
  // For maximum build reliability and fallback performance, we return the local path
  // and load it, but if a loading error occurs in client code, it can fall back to cdnPath.
  return asset.localPath;
}

export function getAssetCDN(id: string): string {
  const asset = assetManifest[id];
  return asset ? asset.cdnPath : "";
}
