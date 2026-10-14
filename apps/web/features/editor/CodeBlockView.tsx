'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Select } from '@mantine/core';
import classes from './CodeBlockView.module.css';

/**
 * CodeBlockView
 * A code block with its language in the top corner: it names what the colours
 * follow, and picking another one recolours the block and goes into the
 * markdown fence (```typescript). "Auto" leaves the fence bare and the
 * language guessed.
 */

/** The languages offered, by name, with the fence words that mean the same one */
const LANGUAGES: ReadonlyArray<{ value: string; label: string; aliases?: ReadonlyArray<string> }> = [
  { value: 'typescript', label: 'TypeScript', aliases: ['ts', 'tsx', 'mts', 'cts'] },
  { value: 'javascript', label: 'JavaScript', aliases: ['js', 'jsx', 'mjs', 'cjs'] },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'HTML / XML', aliases: ['html', 'svg'] },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'bash', label: 'Bash', aliases: ['sh', 'zsh'] },
  { value: 'shell', label: 'Shell session', aliases: ['console'] },
  { value: 'sql', label: 'SQL' },
  { value: 'graphql', label: 'GraphQL', aliases: ['gql'] },
  { value: 'yaml', label: 'YAML', aliases: ['yml'] },
  { value: 'markdown', label: 'Markdown', aliases: ['md'] },
  { value: 'diff', label: 'Diff', aliases: ['patch'] },
  { value: 'python', label: 'Python', aliases: ['py'] },
  { value: 'go', label: 'Go', aliases: ['golang'] },
  { value: 'rust', label: 'Rust', aliases: ['rs'] },
  { value: 'java', label: 'Java' },
  { value: 'kotlin', label: 'Kotlin', aliases: ['kt'] },
  { value: 'csharp', label: 'C#', aliases: ['cs'] },
  { value: 'c', label: 'C', aliases: ['h'] },
  { value: 'cpp', label: 'C++', aliases: ['cc', 'hpp'] },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby', aliases: ['rb'] },
  { value: 'swift', label: 'Swift' },
  { value: 'ini', label: 'INI / TOML', aliases: ['toml'] },
  { value: 'plaintext', label: 'Plain text', aliases: ['text', 'txt'] },
];

const AUTO = 'auto';
const OPTIONS = [{ value: AUTO, label: 'Auto' }, ...LANGUAGES.map(({ value, label }) => ({ value, label }))];

/** The option a fence word stands for: "ts" is TypeScript. A word not offered keeps its own entry */
function optionFor(language: string | null): string {
  if (!language) return AUTO;
  const word = language.toLowerCase();
  return LANGUAGES.find((l) => l.value === word || l.aliases?.includes(word))?.value ?? language;
}

export function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language: string | null = node.attrs.language ?? null;
  const value = optionFor(language);
  // A fence word the list doesn't know still shows, so it isn't lost by looking at it
  const data = OPTIONS.some((o) => o.value === value) ? OPTIONS : [...OPTIONS, { value, label: value }];

  return (
    <NodeViewWrapper className={classes.block}>
      <div className={classes.language} contentEditable={false}>
        <Select
          aria-label="Code language"
          data={data}
          value={value}
          onChange={(next) => {
            // The same language under its own fence word stays as written
            if (!next || next === value) return;
            updateAttributes({ language: next === AUTO ? null : next });
          }}
          allowDeselect={false}
          searchable
          // Typing replaces the name shown, to search from scratch
          onFocus={(event) => event.currentTarget.select()}
          disabled={!editor.isEditable}
          size="xs"
          variant="unstyled"
          withCheckIcon={false}
          rightSectionWidth={0}
          rightSection={null}
          comboboxProps={{ width: 180, position: 'bottom-end', shadow: 'md' }}
          maxDropdownHeight={280}
          classNames={{ input: classes.input }}
        />
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
