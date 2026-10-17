'use client';

import { Button, Group, Text } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import classes from './Toast.module.css';

/**
 * Toast
 * A short line at the top right of the screen saying what just happened, with
 * one action at most (Undo, Open). Mantine's notifications show it (mounted
 * once, by the providers): read out, and gone by itself after a few seconds.
 * A new one takes the place of the one showing.
 */
export interface ToastMessage {
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

const TOAST_ID = 'wisepath-toast';

/** Where the toasts show; mounted once, inside MantineProvider */
export function ToastHost() {
  return <Notifications position="top-right" zIndex={500} limit={1} containerWidth={400} className={classes.notifications} />;
}

export function showToast({ text, action }: ToastMessage): void {
  notifications.hide(TOAST_ID);
  notifications.show({
    id: TOAST_ID,
    autoClose: action ? 6000 : 3500,
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
