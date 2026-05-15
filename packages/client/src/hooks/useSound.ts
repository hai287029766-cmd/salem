import { useRef, useCallback, useState } from "react";
import { Howl } from "howler";
import type { SoundType } from "@salem/shared";

const SOUND_FILES: Record<SoundType, string> = {
  card_flip: "/assets/sounds/card-flip.mp3",
  card_play: "/assets/sounds/card-play.mp3",
  card_draw: "/assets/sounds/card-draw.mp3",
  night_begin: "/assets/sounds/night-begin.mp3",
  dawn: "/assets/sounds/dawn.mp3",
  gavel: "/assets/sounds/gavel.mp3",
  death: "/assets/sounds/death.mp3",
  tick: "/assets/sounds/tick.mp3",
  victory: "/assets/sounds/victory.mp3",
};

export interface UseSoundReturn {
  play: (sound: SoundType) => void;
  muted: boolean;
  toggleMute: () => void;
}

export function useSound(): UseSoundReturn {
  const cache = useRef<Map<SoundType, Howl>>(new Map());
  const [muted, setMuted] = useState(false);

  const getHowl = useCallback((sound: SoundType): Howl => {
    let howl = cache.current.get(sound);
    if (!howl) {
      howl = new Howl({
        src: [SOUND_FILES[sound]],
        volume: 0.5,
        preload: true,
      });
      cache.current.set(sound, howl);
    }
    return howl;
  }, []);

  const play = useCallback(
    (sound: SoundType) => {
      if (muted) return;
      const howl = getHowl(sound);
      howl.play();
    },
    [muted, getHowl],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  return { play, muted, toggleMute };
}
