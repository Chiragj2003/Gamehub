"use client";

import { create } from "zustand";
import { Howl, Howler } from "howler";
import { soundRegistry } from "./soundRegistry";

// Helper to check if we are in the browser
const isBrowser = typeof window !== "undefined";

interface AudioStoreState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
  setMasterVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  setSFXVolume: (val: number) => void;
  setIsMuted: (val: boolean) => void;
}

// Persist key
const LOCAL_STORAGE_KEY = "game_hub_audio_settings";

// Load initial state safely
const getInitialState = () => {
  const defaults = {
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 0.8,
    isMuted: false,
  };

  if (!isBrowser) return defaults;

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load audio settings from localStorage", e);
  }

  return defaults;
};

// Zustand store for React state tracking
export const useAudioStore = create<AudioStoreState>((set) => {
  const initial = getInitialState();
  return {
    ...initial,
    setMasterVolume: (val) => {
      const clamped = Math.max(0, Math.min(1, val));
      set({ masterVolume: clamped });
      AudioManager.updateMasterVolume(clamped);
      AudioManager.saveToLocalStorage();
    },
    setMusicVolume: (val) => {
      const clamped = Math.max(0, Math.min(1, val));
      set({ musicVolume: clamped });
      AudioManager.updateMusicVolume(clamped);
      AudioManager.saveToLocalStorage();
    },
    setSFXVolume: (val) => {
      const clamped = Math.max(0, Math.min(1, val));
      set({ sfxVolume: clamped });
      AudioManager.updateSFXVolume(clamped);
      AudioManager.saveToLocalStorage();
    },
    setIsMuted: (val) => {
      set({ isMuted: val });
      AudioManager.updateMuted(val);
      AudioManager.saveToLocalStorage();
    },
  };
});

// Sound instances cache
const loadedHowls: Record<string, Howl> = {};
let currentBGMId: string | null = null;
let currentBGMHowl: Howl | null = null;

export const AudioManager = {
  // Initialize and unlock audio context
  init() {
    if (!isBrowser) return;

    // Set initial configuration
    const state = useAudioStore.getState();
    this.updateMasterVolume(state.masterVolume);
    this.updateMuted(state.isMuted);

    // Setup document gesture unlock listeners
    const unlock = () => {
      if (Howler && Howler.ctx && Howler.ctx.state === "suspended") {
        Howler.ctx.resume().then(() => {
          cleanListeners();
        });
      } else {
        cleanListeners();
      }
    };

    const cleanListeners = () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock);
  },

  // Save current volumes to localStorage
  saveToLocalStorage() {
    if (!isBrowser) return;
    try {
      const { masterVolume, musicVolume, sfxVolume, isMuted } = useAudioStore.getState();
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ masterVolume, musicVolume, sfxVolume, isMuted })
      );
    } catch (e) {
      console.error("Failed to save audio settings", e);
    }
  },

  // Retrieve or create a Howl instance
  getOrCreateHowl(id: string): Howl | null {
    if (!isBrowser) return null;

    if (loadedHowls[id]) {
      return loadedHowls[id];
    }

    const soundDef = soundRegistry[id];
    if (!soundDef) {
      console.warn(`Sound ID "${id}" not found in registry.`);
      return null;
    }

    try {
      const howl = new Howl({
        src: [soundDef.path],
        volume: soundDef.volume,
        loop: soundDef.loop ?? false,
        rate: soundDef.rate ?? 1.0,
        preload: true,
        onloaderror: (_soundId: number, error: unknown) => {
          console.warn(`Audio load error for sound "${id}":`, error);
        },
        onplayerror: (_soundId: number, error: unknown) => {
          console.warn(`Audio play error for sound "${id}":`, error);
        }
      });

      loadedHowls[id] = howl;
      return howl;
    } catch (e) {
      console.error(`Failed to instantiate Howl for "${id}":`, e);
      return null;
    }
  },

  // Play a sound effect
  playSFX(id: string) {
    if (!isBrowser) return;

    const howl = this.getOrCreateHowl(id);
    if (!howl) return;

    const state = useAudioStore.getState();
    const soundDef = soundRegistry[id];
    
    // Set volume relative to SFX pool volume
    howl.volume(soundDef.volume * state.sfxVolume);
    howl.play();
  },

  // Play a background music track
  playBGM(id: string) {
    if (!isBrowser) return;

    // Check if BGM is already playing
    if (currentBGMId === id && currentBGMHowl && currentBGMHowl.playing()) {
      return;
    }

    const state = useAudioStore.getState();
    const soundDef = soundRegistry[id];
    if (!soundDef) return;

    // Stop current BGM if any
    this.stopBGM(300); // 300ms fadeout

    const howl = this.getOrCreateHowl(id);
    if (!howl) return;

    currentBGMId = id;
    currentBGMHowl = howl;

    const targetVol = soundDef.volume * state.musicVolume;
    howl.volume(0); // Start at 0 for fade in
    howl.play();
    
    // Fade BGM in
    howl.fade(0, targetVol, 500);
  },

  // Stop currently playing BGM
  stopBGM(fadeMs = 0) {
    if (!isBrowser || !currentBGMHowl) return;

    const howl = currentBGMHowl;
    currentBGMId = null;
    currentBGMHowl = null;

    if (fadeMs > 0 && howl.playing()) {
      howl.fade(howl.volume(), 0, fadeMs);
      setTimeout(() => {
        howl.stop();
      }, fadeMs);
    } else {
      howl.stop();
    }
  },

  // Update volumes in real-time
  updateMasterVolume(val: number) {
    if (isBrowser && Howler) {
      Howler.volume(val);
    }
  },

  updateMuted(muted: boolean) {
    if (isBrowser && Howler) {
      Howler.mute(muted);
    }
  },

  updateMusicVolume(musicVolume: number) {
    if (!isBrowser) return;

    // Update active BGM volume
    if (currentBGMId && currentBGMHowl) {
      const soundDef = soundRegistry[currentBGMId];
      if (soundDef) {
        currentBGMHowl.volume(soundDef.volume * musicVolume);
      }
    }
  },

  updateSFXVolume(sfxVolume: number) {
    if (!isBrowser) return;

    // Update loaded SFX volume bases
    Object.keys(loadedHowls).forEach((id) => {
      const soundDef = soundRegistry[id];
      // Do not update the current BGM via the general loop
      if (id !== currentBGMId && soundDef && !soundDef.loop) {
        loadedHowls[id].volume(soundDef.volume * sfxVolume);
      }
    });
  },

  // Preload all audio assets in the background
  preloadAll() {
    if (!isBrowser) return;
    Object.keys(soundRegistry).forEach((id) => {
      this.getOrCreateHowl(id);
    });
  },
};
