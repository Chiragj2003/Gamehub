export interface SoundDefinition {
  id: string;
  path: string;
  volume: number;
  loop?: boolean;
  rate?: number;
}

export const soundRegistry: Record<string, SoundDefinition> = {
  // Background Music (BGM)
  menu_theme: {
    id: "menu_theme",
    path: "/assets/audio/menu_theme.mp3",
    volume: 0.4,
    loop: true,
  },
  snake_theme: {
    id: "snake_theme",
    path: "/assets/audio/snake_theme.mp3",
    volume: 0.35,
    loop: true,
  },
  space_theme: {
    id: "space_theme",
    path: "/assets/audio/space_theme.mp3",
    volume: 0.3,
    loop: true,
  },
  memory_theme: {
    id: "memory_theme",
    path: "/assets/audio/memory_theme.mp3",
    volume: 0.4,
    loop: true,
  },

  // Sound Effects (SFX)
  eat: {
    id: "eat",
    path: "/assets/audio/eat.mp3",
    volume: 0.6,
    loop: false,
  },
  explode: {
    id: "explode",
    path: "/assets/audio/explode.mp3",
    volume: 0.5,
    loop: false,
  },
  laser: {
    id: "laser",
    path: "/assets/audio/laser.mp3",
    volume: 0.35,
    loop: false,
  },
  powerup: {
    id: "powerup",
    path: "/assets/audio/powerup.mp3",
    volume: 0.6,
    loop: false,
  },
  gameover: {
    id: "gameover",
    path: "/assets/audio/gameover.mp3",
    volume: 0.7,
    loop: false,
  },
  victory: {
    id: "victory",
    path: "/assets/audio/victory.mp3",
    volume: 0.6,
    loop: false,
  },
  button_click: {
    id: "button_click",
    path: "/assets/audio/button_click.mp3",
    volume: 0.4,
    loop: false,
  },
  menu_open: {
    id: "menu_open",
    path: "/assets/audio/menu_open.mp3",
    volume: 0.4,
    loop: false,
  },
};
