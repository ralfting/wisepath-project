import { describe, expect, it } from 'vitest';
import { isVideo, pastedAddress, startOf } from './pasted';

describe('a pasted address', () => {
  it('is one web address and nothing else', () => {
    expect(pastedAddress('  https://docs.nestjs.com/guards \n')).toBe('https://docs.nestjs.com/guards');
    expect(pastedAddress('see https://x.org')).toBeNull();
    expect(pastedAddress('ftp://x.org')).toBeNull();
  });

  it("keeps a video's moment, however YouTube writes it", () => {
    expect(startOf('https://www.youtube.com/watch?v=a&t=85')).toBe(85);
    expect(startOf('https://youtu.be/a?t=85s')).toBe(85);
    expect(startOf('https://www.youtube.com/watch?v=a&t=1h2m3s')).toBe(3723);
    expect(startOf('https://www.youtube.com/embed/a?start=30')).toBe(30);
    expect(startOf('https://www.youtube.com/watch?v=a')).toBeUndefined();
    expect(isVideo('https://m.youtube.com/watch?v=a')).toBe(true);
    expect(isVideo('https://vimeo.com/1')).toBe(false);
  });
});
