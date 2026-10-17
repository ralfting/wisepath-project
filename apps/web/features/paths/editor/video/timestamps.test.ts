import { describe, expect, it } from 'vitest';
import { formatTime, noteAt, parseTime } from './timestamps';
import type { VideoNote } from './timestamps';

describe('video times', () => {
  it('writes minutes and seconds, and hours past the first', () => {
    expect(formatTime(85)).toBe('01:25');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(3735.9)).toBe('1:02:15');
  });

  it('reads what it writes, and times typed by hand', () => {
    expect(parseTime('01:25')).toBe(85);
    expect(parseTime('1:25')).toBe(85);
    expect(parseTime('1:02:15')).toBe(3735);
  });

  it('picks the note for the moment playing: the last one whose time has come', () => {
    const note = (seconds: number, pos: number): VideoNote => ({ pos, seconds, time: formatTime(seconds), text: '' });
    const notes = [note(5, 1), note(60, 2), note(20, 3)];
    expect(noteAt(notes, 2)).toBeUndefined();
    expect(noteAt(notes, 30)?.pos).toBe(3);
    expect(noteAt(notes, 59.8)?.pos).toBe(2);
    expect(noteAt(notes, 600)?.pos).toBe(2);
  });
});
