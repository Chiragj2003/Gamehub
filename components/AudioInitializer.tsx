"use client";

import { useEffect } from "react";
import { AudioManager } from "@/lib/audioManager";

export default function AudioInitializer() {
  useEffect(() => {
    AudioManager.init();
    AudioManager.preloadAll();
  }, []);

  return null;
}
