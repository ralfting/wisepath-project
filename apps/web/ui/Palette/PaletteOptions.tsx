'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Text, UnstyledButton } from '@mantine/core';
import classes from './Palette.module.css';

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
