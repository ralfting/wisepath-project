'use client';

import { Group, Kbd, Text } from '@mantine/core';

/** A key hint at the foot of the palette: the keys, then what they do */
export function Hint({ keys, label }: { keys: ReadonlyArray<string>; label: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      {keys.map((key) => (
        <Kbd key={key} size="xs">
          {key}
        </Kbd>
      ))}
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}
