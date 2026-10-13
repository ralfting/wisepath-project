import { assert, describe, it } from '@effect/vitest';
import { jwtSecret } from '../src/auth/infrastructure/jwtSecret';

describe('jwtSecret', () => {
  it('falls back to a development key outside production', () => {
    assert.strictEqual(jwtSecret({ NODE_ENV: 'development' }), 'local-dev-only-change-me');
    assert.strictEqual(jwtSecret({ JWT_SECRET: 'mine', NODE_ENV: 'test' }), 'mine');
  });

  it('refuses to run production without a strong key of its own', () => {
    assert.throws(() => jwtSecret({ NODE_ENV: 'production' }), /must be set/);
    assert.throws(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: '  ' }), /must be set/);
    assert.throws(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'local-dev-only-change-me' }), /must be set/);
    assert.throws(() => jwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'short' }), /too short/);
    const strong = 'x'.repeat(48);
    assert.strictEqual(jwtSecret({ NODE_ENV: 'production', JWT_SECRET: strong }), strong);
  });
});
