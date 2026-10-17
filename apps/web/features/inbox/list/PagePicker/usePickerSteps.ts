'use client';

import { useState } from 'react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { PickedPage } from './PagePicker.helpers';

/** The picker's steps: the path picked (its pages showing), and the path last entered, marked on the way back */
export function usePickerSteps({ onPick }: { onPick: (page: PickedPage) => void }) {
  const [path, setPath] = useState<PathSummary | null>(null);
  const [cameFrom, setCameFrom] = useState<string | null>(null);
  return {
    state: { path, cameFrom },
    operations: {
      openPath: setPath,
      back: () => {
        setCameFrom(path?.id ?? null);
        setPath(null);
      },
      pick: onPick,
    },
  };
}
