import { describe, expect, it } from 'vitest';
import { screenOf } from './screen';

describe('help', () => {
  it('knows the screen from the route', () => {
    expect(screenOf('/paths/p1/pages/a')).toBe('page');
    expect(screenOf('/paths/p1')).toBe('map');
    expect(screenOf('/paths')).toBe('home');
    expect(screenOf('/inbox')).toBe('home');
  });
});
