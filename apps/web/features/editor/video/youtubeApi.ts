/**
 * YouTube IFrame API
 * Loaded once, the first time a video needs it, then attached to the video's
 * own iframe (embedded with enablejsapi=1): it reads the current time, plays,
 * pauses and seeks.
 */

export interface YouTubePlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
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

let loading: Promise<YouTubeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
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
