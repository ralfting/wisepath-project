import type { ReactNode } from 'react';
import { Alert } from '@mantine/core';
import { IconAlertOctagon, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { CalloutKind } from '@/shared/callouts';
import classes from './Callout.module.css';

const LOOKS: Record<CalloutKind, { color: string; icon: Icon }> = {
  info: { color: 'blue', icon: IconInfoCircle },
  warning: { color: 'yellow', icon: IconAlertTriangle },
  danger: { color: 'red', icon: IconAlertOctagon },
};

/** A kind's colour and icon, for what draws one beside a callout (the editor's kind menu) */
export const calloutLook = (kind: CalloutKind) => LOOKS[kind];

/**
 * A boxed note in a page's text: info, warning or danger, each with its colour and icon. The icon can be swapped
 * for something that does more (the editor's kind menu); the label names the kind for assistive tech.
 */
export function Callout({ kind, label, marker, children }: { kind: CalloutKind; label: string; marker?: ReactNode; children: ReactNode }) {
  const { color, icon: Mark } = LOOKS[kind];
  return (
    // A note the reader comes to, not news: Mantine's default role="alert" would be read out as the page loads
    <Alert role="note" aria-label={label} variant="light" color={color} icon={marker ?? <Mark size={20} aria-hidden />} classNames={classes} data-callout={kind}>
      {children}
    </Alert>
  );
}
