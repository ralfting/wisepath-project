/**
 * YouTube IFrame API
 * Loaded once, the first time a video needs it, then attached to the video's
 * own iframe (embedded with enablejsapi=1): it reads the current time, plays,
 * pauses, seeks and mutes.
 */

export interface YouTubePlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
}

interface YouTubeApi {
  Player: new (
    element: HTMLIFrameElement,
    options: { events: { onReady?: () => void; onStateChange?: (event: { data: number }) => void } },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** YT.PlayerState.PLAYING */
export const PLAYING = 1;
/** YT.PlayerState.PAUSED */
export const PAUSED = 2;

let loading: Promise<YouTubeApi> | null = null;

/** How long YouTube gets to answer before the video's controls say they are unavailable */
export const LOAD_TIMEOUT_MS = 12_000;

/** Fails when the script can't load (offline, blocked) or takes too long; the next call tries again */
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = null;
      reject(new Error("YouTube's player didn't load"));
    };
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      previous?.();
      resolve(window.YT!);
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/** The embed address with the API on, YouTube's own fullscreen off (the block has its own, with the notes) */
export function embedUrl(videoId: string, start = 0): string {
  const params = new URLSearchParams({
    enablejsapi: '1',
    origin: window.location.origin,
    rel: '0',
    fs: '0',
    playsinline: '1',
    ...(start > 0 ? { start: String(start) } : {}),
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}
