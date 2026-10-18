import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithLayers } from '@/test/render';
import { ReadingLoader } from './ReadingLoader';

describe('ReadingLoader', () => {
  // The delay is the behaviour under test, so the clock is ours
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing for a quick load, and the reader with what is loading once it takes longer', () => {
    renderWithLayers(<ReadingLoader label="Opening the path…" />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('Opening the path…')).toBeNull();

    // Advancing the clock fires a state update outside an event, which Testing Library can't wrap for us
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByText('Opening the path…')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Opening the path…')).toBeTruthy();
  });
});
