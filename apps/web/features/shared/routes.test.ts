import { describe, expect, it } from 'vitest';
import { afterLogin, loginHref } from './routes';

describe('after logging in', () => {
  it('goes back to where the learner was going', () => {
    const capture = '/capture?url=https%3A%2F%2Fa.org&t=12';
    expect(afterLogin(new URL(loginHref(capture), 'https://w.dev').searchParams.get('next'))).toBe(capture);
  });

  it("goes home when there is nowhere to go back to, or it isn't the app", () => {
    expect(afterLogin(null)).toBe('/projects');
    expect(afterLogin('https://evil.example')).toBe('/projects');
    expect(afterLogin('//evil.example')).toBe('/projects');
    expect(afterLogin('/\\evil.example')).toBe('/projects');
  });
});
