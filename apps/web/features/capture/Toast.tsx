'use client';

import { useEffect } from 'react';
import { Button, Group, Paper, Text } from '@mantine/core';
import classes from './Toast.module.css';

/**
 * Toast
 * A short line at the top right of the screen saying what just happened, with
 * one action at most (Undo, Open). It is a live region, so it is read out
 * too, and it goes away by itself after a few seconds.
 */
export interface ToastMessage {
  readonly text: string;
  readonly action?: { readonly label: string; readonly onClick: () => void };
  /** Changes for every new message, so the same words twice still show again */
  readonly key: number;
}

export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, message.action ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div role="status" aria-live="polite" className={classes.region}>
      {message && (
        <Paper key={message.key} shadow="lg" radius="md" px="md" py={8} className={classes.toast}>
          <Group gap="md" wrap="nowrap">
            <Text size="sm">{message.text}</Text>
            {message.action && (
              <Button
                size="compact-sm"
                variant="subtle"
                onClick={() => {
                  message.action?.onClick();
                  onDismiss();
                }}
              >
                {message.action.label}
              </Button>
            )}
          </Group>
        </Paper>
      )}
    </div>
  );
}
