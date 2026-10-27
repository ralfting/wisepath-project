'use client';

import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import classes from './Toast.module.css';

/**
 * Toast
 * A short line at the bottom of the screen, centred, saying what just happened,
 * with one action at most (Undo, Open), as a snackbar is. Mantine's
 * notifications show it (mounted once, by the providers): read out, and gone
 * by itself after a few seconds, held while the pointer is on it. A new one
 * takes the place of the one showing.
 */
export interface ToastMessage {
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

const TOAST_ID = 'wisepath-toast';

/** Long enough to read a line; one with an action gets longer, to reach it (snackbar guidance: 5 s and more) */
const SHOWN_MS = 5000;
const SHOWN_WITH_ACTION_MS = 7000;

export function showToast({ text, action }: ToastMessage): void {
  notifications.hide(TOAST_ID);
  notifications.show({
    id: TOAST_ID,
    autoClose: action ? SHOWN_WITH_ACTION_MS : SHOWN_MS,
    withCloseButton: false,
    radius: 'md',
    classNames: { root: classes.toast },
    message: (
      <Group gap="md" wrap="nowrap" justify="space-between">
        <Text size="sm" c="var(--mantine-color-text)">
          {text}
        </Text>
        {action && (
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => {
              action.onClick();
              notifications.hide(TOAST_ID);
            }}
          >
            {action.label}
          </Button>
        )}
      </Group>
    ),
  });
}
