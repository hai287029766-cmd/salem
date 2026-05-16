import { useRef, useCallback, useState } from "react";
import { Howl } from "howler";
import type { SoundType } from "@salem/shared";

const SOUND_FILES: Record<SoundType, string> = {
  card_flip: "/assets/sounds/card-flip.wav",
  card_play: "/assets/sounds/card-play.wav",
  card_draw: "/assets/sounds/card-draw.wav",
  night_begin: "/assets/sounds/night-begin.wav",
  dawn: "/assets/sounds/dawn.wav",
  gavel: "/assets/sounds/gavel.wav",
  death: "/assets/sounds/death.wav",
  tick: "/assets/sounds/tick.wav",
  victory: "/assets/sounds/victory.wav",
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
