import { useEffect, useRef } from "react";

/**
 * Plays the given audio URL whenever `trigger` changes (and url is set).
 * Returns the audio ref so callers can attach manual controls if needed.
 */
export function useAutoPlay(url: string | undefined, trigger: unknown) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!url) return;
    // Recreate to reliably restart playback even on the same URL.
    const audio = new Audio(url);
    ref.current = audio;
    // Some browsers block autoplay without user gesture — fail silently.
    audio.play().catch(() => { /* ignore */ });
    return () => {
      audio.pause();
      audio.src = "";
      if (ref.current === audio) ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, trigger]);

  return ref;
}
