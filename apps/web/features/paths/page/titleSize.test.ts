import { describe, expect, it } from 'vitest';
import { titleSizeFor } from './titleSize';

describe('page title size', () => {
  it('keeps a short title at its size', () => {
    expect(titleSizeFor(34, 'Rust')).toBe(34);
    expect(titleSizeFor(34, 'Ownership and borrowing in Rust')).toBeLessThan(34);
  });

  it('shrinks a long title, down to about two thirds and never under 18px', () => {
    const long = 'Gerenciamento de memória em Rust: ownership, borrowing e lifetimes na prática do dia a dia';
    expect(titleSizeFor(34, long)).toBe(21);
    expect(titleSizeFor(26, long)).toBe(18);
    expect(titleSizeFor(34, long + long)).toBe(21);
  });
});
