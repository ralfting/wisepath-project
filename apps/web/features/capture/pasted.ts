/**
 * Pasted
 * What quick capture reads from a pasted address. Kept free of React so it can be tested.
 */

/** A pasted text that is one web address and nothing else */
export const pastedAddress = (text: string): string | null => {
  const value = text.trim();
  return /^https?:\/\/\S+$/i.test(value) ? value : null;
};

/** The moment a video address starts at (t=85, t=1m25s, start=85), in seconds */
export function startOf(address: string): number | undefined {
  const value = address.match(/[?&#](?:t|start)=([^&#]+)/)?.[1];
  if (!value) return undefined;
  if (/^\d+s?$/.test(value)) return parseInt(value, 10);
  const parts = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!parts || !parts[0]) return undefined;
  return Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
}

export const isVideo = (address: string) => /^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i.test(address);
