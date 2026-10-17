'use client';

import { QuickCapture } from '../QuickCapture/QuickCapture';
import { showToast } from '../Toast/Toast';
import { useCaptureLauncher } from './useCaptureLauncher';

/**
 * Opens quick capture from ⌘⇧Space (Ctrl+Shift+Space) anywhere in the app, even
 * while typing in a page, and says what happened to what was captured. It also
 * remembers the path last opened, which the Inbox's pickers offer first.
 */
export function CaptureLauncher() {
  const { state, operations } = useCaptureLauncher();
  return <QuickCapture opened={state.opened} onClose={operations.close} page={state.page} onDone={(text) => showToast({ text })} />;
}
