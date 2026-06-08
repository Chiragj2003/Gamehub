"use client";

import React from "react";
import { useAudioStore } from "@/lib/audioManager";
import { Volume2, VolumeX, Music, Gamepad2 } from "lucide-react";

interface AudioSettingsProps {
  onClose?: () => void;
}

export default function AudioSettings({ onClose }: AudioSettingsProps) {
  const {
    masterVolume,
    musicVolume,
    sfxVolume,
    isMuted,
    setMasterVolume,
    setMusicVolume,
    setSFXVolume,
    setIsMuted,
  } = useAudioStore();

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/5 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-3">
        <h4 className="text-sm font-bold uppercase tracking-widest text-white">
          Audio Settings
        </h4>
        <button
          onClick={handleMuteToggle}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border ${
            isMuted
              ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          {isMuted ? (
            <>
              <VolumeX className="h-3.5 w-3.5" />
              Muted
            </>
          ) : (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              Mute All
            </>
          )}
        </button>
      </div>

      {/* Sliders Stack */}
      <div className="space-y-5">
        {/* Master Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-zinc-400">
              <Volume2 className="h-4 w-4 text-neon-cyan" />
              Master Volume
            </span>
            <span className="font-mono text-neon-cyan font-bold">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              disabled={isMuted}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-900 outline-none accent-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, var(--color-neon-cyan) 0%, var(--color-neon-cyan) ${
                  masterVolume * 100
                }%, oklch(0.20 0 0) ${masterVolume * 100}%, oklch(0.20 0 0) 100%)`,
              }}
            />
          </div>
        </div>

        {/* Music Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-zinc-400">
              <Music className="h-4 w-4 text-neon-violet" />
              Music Volume
            </span>
            <span className="font-mono text-neon-violet font-bold">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              disabled={isMuted}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-900 outline-none accent-neon-violet disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, var(--color-neon-violet) 0%, var(--color-neon-violet) ${
                  musicVolume * 100
                }%, oklch(0.20 0 0) ${musicVolume * 100}%, oklch(0.20 0 0) 100%)`,
              }}
            />
          </div>
        </div>

        {/* SFX Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold text-zinc-400">
              <Gamepad2 className="h-4 w-4 text-neon-green" />
              SFX Volume
            </span>
            <span className="font-mono text-neon-green font-bold">
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => setSFXVolume(parseFloat(e.target.value))}
              disabled={isMuted}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-900 outline-none accent-neon-green disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, var(--color-neon-green) 0%, var(--color-neon-green) ${
                  sfxVolume * 100
                }%, oklch(0.20 0 0) ${sfxVolume * 100}%, oklch(0.20 0 0) 100%)`,
              }}
            />
          </div>
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-zinc-900 border border-white/5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          Close Settings
        </button>
      )}
    </div>
  );
}
