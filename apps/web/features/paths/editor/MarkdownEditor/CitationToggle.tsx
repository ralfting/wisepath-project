'use client';

import { Button, Group, Kbd } from '@mantine/core';
import { IconLink, IconQuote } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { useHasKeyboard, useIsMac } from '@/ui/platform';

/** The link card's switch between linking a page and citing it, with the keys that do the same from the text */
export function CitationToggle({ citation, onToggle }: { citation: boolean; onToggle: () => void }) {
  const t = useT();
  const isMac = useIsMac();
  const hasKeyboard = useHasKeyboard();
  const Icon = citation ? IconLink : IconQuote;
  return (
    <Group gap={6} justify="space-between" wrap="nowrap" mt="xs">
      <Button size="compact-xs" variant="subtle" color="gray" leftSection={<Icon size={14} aria-hidden />} onClick={onToggle}>
        {t(citation ? 'editor.card.makeLink' : 'editor.card.makeCitation')}
      </Button>
      {hasKeyboard && (
        <Group gap={2} wrap="nowrap" aria-hidden>
          <Kbd size="xs">{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd size="xs">{isMac ? '⇧' : 'Shift'}</Kbd>
          <Kbd size="xs">L</Kbd>
        </Group>
      )}
    </Group>
  );
}
