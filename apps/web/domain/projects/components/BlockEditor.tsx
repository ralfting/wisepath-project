'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { replaceBlock, splitBlocks } from '../entities/markdown-blocks';
import { Markdown } from './Markdown';

/**
 * BlockEditor
 * Shows page markdown formatted. Clicking a block turns just that block into
 * its markdown source; leaving it (click outside, Esc, Cmd/Ctrl+Enter) saves it.
 * Clicking below the last block starts a new one.
 */

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  /** Increment to start writing a new block at the end (e.g. after naming a new page) */
  startSignal?: number;
}

/** Index of the block being edited; equal to the block count when writing a new one */
type Editing = number | null;

const NEW_BLOCK_HINT =
  'Write in markdown: ## headings, **bold**, - lists, [links](https://…). A YouTube link on its own line becomes a video.';

export function BlockEditor({ content, onChange, startSignal = 0 }: BlockEditorProps) {
  const blocks = splitBlocks(content);
  const [editing, setEditing] = useState<Editing>(null);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const start = (index: number) => {
    setDraft(index < blocks.length ? blocks[index] : '');
    setEditing(index);
  };

  const finish = () => {
    if (editing === null) return;
    const isNew = editing >= blocks.length;
    if (!(isNew && !draft.trim())) onChange(replaceBlock(content, editing, draft));
    setEditing(null);
  };

  useEffect(() => {
    if (startSignal > 0) start(splitBlocks(content).length);
    // Only react to the signal, not to content edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  // Grow the textarea with its content
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [draft, editing]);

  const onBlockClick = (event: MouseEvent, index: number) => {
    // Links and embeds keep their own behaviour
    if ((event.target as Element).closest('a, button, iframe')) return;
    if (window.getSelection()?.toString()) return;
    start(index);
  };

  const onBlockKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      start(index);
    }
  };

  const onDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      event.stopPropagation();
      finish();
    }
  };

  const draftField = (
    <div>
      <label className="sr-only" htmlFor="block-draft">
        Markdown
      </label>
      <textarea
        id="block-draft"
        ref={textareaRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finish}
        onKeyDown={onDraftKeyDown}
        placeholder={NEW_BLOCK_HINT}
        spellCheck
        rows={3}
        className="-mx-3 block w-[calc(100%+1.5rem)] resize-none overflow-hidden rounded border border-primary/40 bg-card px-3 py-2 font-mono text-[14px] leading-[1.7] text-foreground shadow-[0_1px_3px_hsl(var(--primary)/0.08)] placeholder:text-muted-foreground/70 focus-visible:outline-none"
      />
      <p className="mt-1 text-xs text-muted-foreground">Esc or click outside to finish. Blank lines start a new block.</p>
    </div>
  );

  return (
    <div className="space-y-1">
      {blocks.map((block, index) =>
        editing === index ? (
          <div key={index}>{draftField}</div>
        ) : (
          <div
            key={index}
            role="button"
            tabIndex={0}
            aria-label="Edit this block"
            onClick={(e) => onBlockClick(e, index)}
            onKeyDown={(e) => onBlockKeyDown(e, index)}
            className="-mx-3 cursor-text rounded px-3 py-1.5 transition-colors hover:bg-accent/70 focus-visible:bg-accent/70"
          >
            <Markdown content={block} />
          </div>
        ),
      )}

      {editing !== null && editing >= blocks.length ? (
        draftField
      ) : (
        <button
          type="button"
          onClick={() => start(blocks.length)}
          className="-mx-3 block w-[calc(100%+1.5rem)] rounded px-3 py-3 text-left text-[15px] text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
        >
          {blocks.length === 0 ? 'Click to start writing' : 'Click to add text'}
        </button>
      )}
    </div>
  );
}
