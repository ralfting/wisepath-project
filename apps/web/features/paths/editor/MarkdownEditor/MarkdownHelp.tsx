'use client';

import { ActionIcon, Code, Popover, ScrollArea, Table, Text, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import type { editor as messages } from '@/i18n/messages/en/editor';
import classes from './MarkdownEditor.module.css';

/**
 * MarkdownHelp
 * The "?" at the end of the editor toolbar: every piece of markdown the editor
 * understands, what to type and what it does. Most of it converts as you
 * type; website links and tables come from the toolbar or from a paste.
 */

type HelpKey = keyof typeof messages.help.does;

/** What to type, by group; what it does is in the messages (editor.help.does) */
const SYNTAX: { group: keyof typeof messages.help.groups; rows: { type: string; does: HelpKey }[] }[] = [
  {
    group: 'text',
    rows: [
      { type: '**bold**', does: 'bold' },
      { type: '*italic*', does: 'italic' },
      { type: '~~struck~~', does: 'struck' },
      { type: '`code`', does: 'code' },
    ],
  },
  {
    group: 'structure',
    rows: [
      { type: '## Heading', does: 'heading' },
      { type: '- item', does: 'bullets' },
      { type: '1. item', does: 'numbers' },
      { type: '- [ ] task', does: 'task' },
      { type: '> quote', does: 'quote' },
      { type: '> [!warning]', does: 'callout' },
      { type: '> [!activity]', does: 'activity' },
      { type: '```', does: 'codeBlock' },
    ],
  },
  {
    group: 'links',
    rows: [
      { type: '[[Page]]', does: 'pageLink' },
      { type: '/', does: 'slash' },
      { type: 'https://…', does: 'webLink' },
      { type: 'https://youtu.be/…', does: 'youtube' },
      { type: '[01:25]', does: 'timestamp' },
    ],
  },
  {
    group: 'tables',
    rows: [
      { type: '| A | B |', does: 'tableRow' },
      { type: '| A | B |\n| --- | --- |', does: 'tablePaste' },
    ],
  },
];

export function MarkdownHelp() {
  const t = useT();
  return (
    <Popover position="bottom-end" width={460} shadow="md" withinPortal>
      <Popover.Target>
        <Tooltip label={t('editor.help.title')}>
          <ActionIcon variant="subtle" color="gray" size="md" aria-label={t('editor.help.title')} className={classes.help}>
            <IconHelp size={17} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="md">
        <Text fw={700} size="sm">
          {t('editor.help.title')}
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          {t('editor.help.intro')}
        </Text>
        <ScrollArea.Autosize mah={420}>
          {SYNTAX.map(({ group, rows }) => (
            <div key={group}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5} mt="sm" mb={4}>
                {t(`editor.help.groups.${group}`)}
              </Text>
              <Table verticalSpacing={6} horizontalSpacing="xs" withRowBorders={false}>
                <Table.Tbody>
                  {rows.map((r) => (
                    <Table.Tr key={r.type}>
                      <Table.Td w={170} style={{ verticalAlign: 'top' }}>
                        <Code block={r.type.includes('\n')}>{r.type}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{t(`editor.help.does.${r.does}`)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          ))}
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
}
