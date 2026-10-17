/** The video most recently used, which N reaches when the focus is on the page itself */
let lastUsed: object | null = null;

/** Marks this block's video as the one most recently used */
export const markUsed = (video: object) => {
  lastUsed = video;
};
export const isLastUsed = (video: object) => lastUsed === video;

/** A corner of the area the text is in, where the floating video sits: top or bottom, left or right */
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

const CORNER_KEY = 'wp-video-corner';

/** Where the floating video went last time, for this viewer */
export function savedCorner(): Corner {
  try {
    const c = localStorage.getItem(CORNER_KEY);
    return c === 'tl' || c === 'tr' || c === 'bl' || c === 'br' ? c : 'br';
  } catch {
    return 'br';
  }
}

export function saveCorner(corner: Corner) {
  try {
    localStorage.setItem(CORNER_KEY, corner);
  } catch {
    // Private mode: the corner holds for this page only
  }
}

/** The corner nearest to where a box was dropped, in a window `width` × `height` */
export function nearestCorner(box: { top: number; left: number; width: number; height: number }, width: number, height: number): Corner {
  return `${box.top + box.height / 2 < height / 2 ? 't' : 'b'}${box.left + box.width / 2 < width / 2 ? 'l' : 'r'}`;
}

/**
 * Whether a message from YouTube's frame says one of its controls has done its part: the volume, the captions or
 * the speed changed. Captions turned on may load its captions module, which it reports. The speed also rides along
 * with the time in every report while playing, which isn't a change.
 */
export function isControlDone(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  let data: { event?: string; info?: Record<string, unknown> };
  try {
    data = JSON.parse(message);
  } catch {
    return false;
  }
  if (data.event === 'apiInfoDelivery') return true;
  if (data.event !== 'infoDelivery' || !data.info) return false;
  const { info } = data;
  return 'volume' in info || 'muted' in info || ('playbackRate' in info && !('currentTime' in info));
}
