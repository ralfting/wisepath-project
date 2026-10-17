import { describe, expect, it } from 'vitest';
import { isControlDone, nearestCorner } from './VideoBlock.helpers';

describe('the video block', () => {
  it("hears when one of YouTube's controls has done its part, and not the reports while playing", () => {
    expect(isControlDone(JSON.stringify({ event: 'infoDelivery', info: { volume: 40 } }))).toBe(true);
    expect(isControlDone(JSON.stringify({ event: 'infoDelivery', info: { muted: true } }))).toBe(true);
    expect(isControlDone(JSON.stringify({ event: 'infoDelivery', info: { playbackRate: 1.5 } }))).toBe(true);
    expect(isControlDone(JSON.stringify({ event: 'apiInfoDelivery' }))).toBe(true);
    expect(isControlDone(JSON.stringify({ event: 'infoDelivery', info: { playbackRate: 1, currentTime: 12 } }))).toBe(false);
    expect(isControlDone('not json')).toBe(false);
    expect(isControlDone({ event: 'apiInfoDelivery' })).toBe(false);
  });

  it('settles a dropped video in the nearest corner', () => {
    expect(nearestCorner({ top: 10, left: 10, width: 300, height: 170 }, 1280, 720)).toBe('tl');
    expect(nearestCorner({ top: 500, left: 900, width: 300, height: 170 }, 1280, 720)).toBe('br');
    expect(nearestCorner({ top: 500, left: 10, width: 300, height: 170 }, 1280, 720)).toBe('bl');
  });
});
