'use client';

import { useId, useMemo, useState } from 'react';
import type { Project } from '../types/project.types';
import { displayTitle, pagesInOrder, relatedPages } from '../entities/project.entity';
import { CloseIcon, PlusIcon } from './icons';

/**
 * ConnectionsEditor
 * Lists the pages related to one page, with remove buttons and a search to connect another.
 */

interface ConnectionsEditorProps {
  project: Project;
  pageId: string;
  onOpenPage: (pageId: string) => void;
  onConnect: (pageA: string, pageB: string) => void;
  onDisconnect: (pageA: string, pageB: string) => void;
}

const MAX_SUGGESTIONS = 6;

export function ConnectionsEditor({ project, pageId, onOpenPage, onConnect, onDisconnect }: ConnectionsEditorProps) {
  const related = relatedPages(project, pageId);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const inputId = useId();

  const candidates = useMemo(() => {
    const taken = new Set([pageId, ...related.map((p) => p.id)]);
    const q = query.trim().toLowerCase();
    return pagesInOrder(project)
      .filter((p) => !taken.has(p.id) && displayTitle(p).toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [project, pageId, related, query]);

  const close = () => {
    setAdding(false);
    setQuery('');
  };

  return (
    <section className="space-y-2" aria-labelledby={`${inputId}-heading`}>
      <h3 id={`${inputId}-heading`} className="text-[15px] font-bold">
        Connected pages <span className="font-normal text-muted-foreground">({related.length})</span>
      </h3>

      {related.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not connected yet.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {related.map((p) => (
            <li key={p.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => onOpenPage(p.id)}
                className="min-w-0 flex-1 truncate text-left font-star text-[15px] italic hover:underline hover:underline-offset-4"
              >
                {displayTitle(p)}
              </button>
              <button
                type="button"
                onClick={() => onDisconnect(pageId, p.id)}
                aria-label={`Remove connection to ${displayTitle(p)}`}
                title="Remove connection"
                className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="sr-only">
            Find a page to connect
          </label>
          <input
            id={inputId}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              if (e.key === 'Enter' && candidates[0]) {
                onConnect(pageId, candidates[0].id);
                close();
              }
            }}
            placeholder="Find a page to connect"
            className="h-9 w-full rounded border border-input bg-card px-3 text-sm placeholder:text-muted-foreground"
          />
          {candidates.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              {query ? 'No other page matches.' : 'Every page is already connected.'}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded border border-border bg-card">
              {candidates.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onConnect(pageId, p.id);
                      close();
                    }}
                    className="w-full px-3 py-2 text-left font-star text-[15px] italic hover:bg-accent"
                  >
                    {displayTitle(p)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={close} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded px-1 py-1 text-sm font-bold text-primary hover:underline hover:underline-offset-4"
        >
          <PlusIcon />
          Connect a page
        </button>
      )}
    </section>
  );
}
