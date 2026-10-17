'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Modal, Text, UnstyledButton } from '@mantine/core';
import classes from './CaptureBox.module.css';

/**
 * CaptureBox
 * The command palette shell: a small card in the middle of the screen, over
 * everything, with focus held inside it until it closes; Esc closes it. What
 * it holds is up to its user: quick capture puts a text field in it, the
 * Inbox a path and page picker, and search (⌘P) its results.
 *
 * For a field with a list of choices under it, usePaletteKeys and
 * PaletteOptions give the list its keys (↑ ↓ Enter, with the field keeping
 * focus) and its roles, so every palette reads and behaves the same.
 */
export function CaptureBox({
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

/**
 * The keys of a palette's list, for the field above it: ↑ ↓ move through the
 * choices (wrapping around), Enter picks the one highlighted. The highlight
 * goes back to the first choice whenever the choices change.
 */
export function usePaletteKeys<T>(items: ReadonlyArray<T>, onPick: (item: T) => void, initial = 0) {
  const [active, setActive] = useState(initial);
  // Back to the first whenever the list changes after it shows (a search typed), not as it first shows
  const [shown, setShown] = useState(items);
  if (shown !== items) {
    setShown(items);
    setActive(0);
  }
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (items.length === 0) return;
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActive((current) => (current + step + items.length) % items.length);
      } else if (event.key === 'Enter' && !event.shiftKey) {
        const item = items[Math.min(active, items.length - 1)];
        if (item === undefined) return;
        event.preventDefault();
        onPick(item);
      }
    },
    [items, active, onPick],
  );
  return { active: Math.min(active, Math.max(items.length - 1, 0)), setActive, onKeyDown };
}

/** The props a palette's field needs to announce its list: spread them on the input */
export function paletteFieldProps(listId: string, active: number, count: number) {
  return {
    role: 'combobox',
    // With nothing to choose the list isn't there, so the field points at nothing
    'aria-expanded': count > 0,
    'aria-controls': count > 0 ? listId : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant': count > 0 ? `${listId}-${active}` : undefined,
  };
}

/** The choices under a palette's field; the field keeps focus, so a click picks without moving it */
export function PaletteOptions<T>({
  id,
  label,
  items,
  active,
  onActive,
  onPick,
  getKey,
  empty,
  children,
}: {
  id: string;
  label: string;
  items: ReadonlyArray<T>;
  active: number;
  onActive: (index: number) => void;
  onPick: (item: T) => void;
  getKey: (item: T) => string;
  /** Shown when there is nothing to choose */
  empty?: ReactNode;
  children: (item: T, active: boolean) => ReactNode;
}) {
  // Keeps the highlighted choice in view as the keys move it
  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, active]);

  if (items.length === 0) {
    return empty ? (
      <Text size="sm" c="dimmed" className={classes.empty} role="status">
        {empty}
      </Text>
    ) : null;
  }
  return (
    <div id={id} role="listbox" aria-label={label} className={classes.options}>
      {items.map((item, index) => (
        <UnstyledButton
          key={getKey(item)}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === active}
          data-active={index === active || undefined}
          tabIndex={-1}
          className={classes.option}
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => index !== active && onActive(index)}
          onClick={() => onPick(item)}
        >
          {children(item, index === active)}
        </UnstyledButton>
      ))}
    </div>
  );
}

/** A stable id for a palette's list */
export const usePaletteId = () => `palette-${useId().replace(/:/g, '')}`;
