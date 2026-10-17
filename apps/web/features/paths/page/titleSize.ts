/**
 * The page title's font size for its length: a short title shows at the
 * size its place asks for; a long one shrinks (down to about two thirds, and
 * never under 18px) so it wraps in two or three lines instead of taking the
 * space of the text below.
 */
const SHORT = 28;
const LONG = 90;
const SMALLEST = 0.62;

export function titleSizeFor(base: number, title: string): number {
  const length = title.trim().length;
  if (length <= SHORT) return base;
  const shrink = Math.min(1, (length - SHORT) / (LONG - SHORT));
  return Math.max(18, Math.round(base * (1 - (1 - SMALLEST) * shrink)));
}
