'use client';

import { PathsStep } from './PathsStep/PathsStep';
import { PagesStep } from './PagesStep/PagesStep';
import { usePickerSteps } from './usePickerSteps';
import type { PickedPage } from './PagePicker.helpers';

/** The picker's two steps, a path and then one of its pages; mounted afresh on each opening, so it starts at the paths */
export function PickerSteps({ onPick }: { onPick: (page: PickedPage) => void }) {
  const { state, operations } = usePickerSteps({ onPick });
  return state.path ? (
    <PagesStep path={state.path} onBack={operations.back} onPick={operations.pick} />
  ) : (
    <PathsStep onPick={operations.openPath} marked={state.cameFrom} />
  );
}
