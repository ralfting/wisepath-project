'use client';

import type { ReactNode } from 'react';
import { Modal, Text } from '@mantine/core';
import classes from './Palette.module.css';

/**
 * Palette
 * The command palette shell: a small card in the middle of the screen, over
 * everything, with focus held inside it until it closes; Esc closes it. What
 * it holds is up to its user: quick capture puts a text field in it, the
 * Inbox a path and page picker, and search (⌘P) its results.
 *
 * For a field with a list of choices under it, usePaletteKeys and
 * PaletteOptions give the list its keys (↑ ↓ Enter, with the field keeping
 * focus) and its roles, so every palette reads and behaves the same.
 */
export function Palette({
  opened,
  onClose,
  label,
  children,
  footer,
}: {
  opened: boolean;
  onClose: () => void;
  /** What the box is, for assistive tech (it has no visible title) */
  label: string;
  children: ReactNode;
  /** A line under the content, usually its keys */
  footer?: ReactNode;
}) {
  return (
    <Modal.Root opened={opened} onClose={onClose} size={600} yOffset="14vh" radius="lg" zIndex={400} trapFocus returnFocus>
      <Modal.Overlay backgroundOpacity={0.35} blur={2} />
      <Modal.Content aria-label={label} className={classes.card}>
        <Modal.Body p={0}>
          {children}
          {footer && (
            <Text component="div" size="xs" c="dimmed" className={classes.footer}>
              {footer}
            </Text>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
