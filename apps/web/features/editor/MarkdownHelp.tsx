'use client';

import { ActionIcon, Code, Popover, ScrollArea, Table, Text, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import classes from './MarkdownEditor.module.css';

/**
 * MarkdownHelp
 * The "?" at the end of the editor toolbar: every piece of markdown the editor
 * understands, what to type and what it does. Most of it converts as you
 * type; website links and tables come from the toolbar or from a paste.
 */

const SYNTAX: { group: string; rows: { type: string; does: string }[] }[] = [
  {
    group: 'Text',
    rows: [
      { type: '**bold**', does: 'Bold, for the words that matter most' },
      { type: '*italic*', does: 'Italic, for terms and emphasis' },
      { type: '~~struck~~', does: 'Struck through, for something no longer true' },
      { type: '`code`', does: 'Inline code: names of functions, commands, files' },
    ],
  },
  {
    group: 'Structure',
    rows: [
      { type: '## Heading', does: 'A section title; ### for a smaller one' },
      { type: '- item', does: 'A bullet list; Tab nests an item' },
      { type: '1. item', does: 'A numbered list, for steps in order' },
      { type: '- [ ] task', does: 'A checklist item; - [x] is a done one' },
      { type: '> quote', does: 'A quote, for something you read or were told' },
      { type: '```', does: 'A code block: type it, then the code; ``` again closes it' },
    ],
  },
  {
    group: 'Links and media',
    rows: [
      { type: '[[Page]]', does: "Links another page of this path; picking a new name from the list creates that page. Cmd/Ctrl+Enter opens the cursor's line's link" },
      { type: '/', does: 'Lists commands. Page asks for a name, then Enter links that page and goes to it, creating it if needed; Cmd/Ctrl+Enter stays here' },
      { type: 'https://…', does: 'A website address links itself; to link words, select them and use the link button (or paste [text](https://…)). Cmd/Ctrl+click or Cmd/Ctrl+Enter opens it' },
      { type: 'https://youtu.be/…', does: 'A YouTube address alone on its line becomes an embedded video' },
      {
        type: '[01:25]',
        does: "A moment of the video above: a click plays it from there, and Cmd/Ctrl+Enter plays the time on the cursor's line; with Shift, either plays it in fullscreen. Note at, under a video, pauses it to add one (or N with the video focused)",
      },
    ],
  },
  {
    group: 'Tables',
    rows: [
      { type: '| A | B |', does: 'Then Enter: a table with those headers and a row to fill. /table works too' },
      { type: '| A | B |\n| --- | --- |', does: 'Paste a markdown table like this one: the row above the --- line is the header' },
    ],
  },
];

export function MarkdownHelp() {
  return (
    <Popover position="bottom-end" width={460} shadow="md" withinPortal>
      <Popover.Target>
        <Tooltip label="Markdown you can use">
          <ActionIcon variant="subtle" color="gray" size="md" aria-label="Markdown you can use" className={classes.help}>
            <IconHelp size={17} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="md">
        <Text fw={700} size="sm">
          Markdown you can use
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          Most of it turns into formatting as you type. Website links and tables come from the toolbar or a paste.
        </Text>
        <ScrollArea.Autosize mah={420}>
          {SYNTAX.map(({ group, rows }) => (
            <div key={group}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts={0.5} mt="sm" mb={4}>
                {group}
              </Text>
              <Table verticalSpacing={6} horizontalSpacing="xs" withRowBorders={false}>
                <Table.Tbody>
                  {rows.map((r) => (
                    <Table.Tr key={r.type}>
                      <Table.Td w={170} style={{ verticalAlign: 'top' }}>
                        <Code block={r.type.includes('\n')}>{r.type}</Code>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{r.does}</Text>
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
