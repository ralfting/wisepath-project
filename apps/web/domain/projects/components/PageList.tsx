'use client';

import type { ReactNode } from 'react';
import type { Page, Project } from '../types/project.types';
import { displayTitle, wordCount } from '../entities/project.entity';
import { computeLevels, references } from '../entities/levels';

/**
 * PageList
 * The same pages as a table, in chart order. Columns stay fixed; only the cells change.
 */

interface PageListProps {
  project: Project;
  selectedId: string | null;
  matchIds: Set<string> | null;
  onOpen: (pageId: string) => void;
}

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

export function PageList({ project, selectedId, matchIds, onOpen }: PageListProps) {
  // Top-down order: level by level, pages not linked yet last
  const { levels, apart, levelOf } = computeLevels(project);
  const refs = references(project);
  const byId = new Map(project.pages.map((p) => [p.id, p]));
  const ordered = [...levels.flat(), ...apart].map((id) => byId.get(id) as Page);
  const rows = matchIds ? ordered.filter((p) => matchIds.has(p.id)) : ordered;

  if (project.pages.length === 0) {
    return <EmptyMessage>This project has no pages yet. Use New page to add one.</EmptyMessage>;
  }
  if (rows.length === 0) {
    return <EmptyMessage>No page matches your search. Clear it to see every page.</EmptyMessage>;
  }

  return (
    <div className="h-full overflow-auto rounded border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Pages of {project.title}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-[13px] text-muted-foreground">
            <th scope="col" className="w-20 px-4 py-2.5 font-normal">Level</th>
            <th scope="col" className="px-4 py-2.5 font-normal">Page</th>
            <th scope="col" className="w-32 px-4 py-2.5 font-normal">Studied</th>
            <th scope="col" className="w-28 px-4 py-2.5 text-right font-normal">Words</th>
            <th scope="col" className="px-4 py-2.5 font-normal">Comes from</th>
            <th scope="col" className="w-24 px-4 py-2.5 text-right font-normal">Edited</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((page) => (
            <tr
              key={page.id}
              className={`border-b border-border/70 last:border-b-0 ${page.id === selectedId ? 'bg-accent' : 'hover:bg-muted'}`}
            >
              <td className="px-4 py-2.5 text-muted-foreground">{levelOf.get(page.id) ?? 'Not linked'}</td>
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpen(page.id)}
                  aria-current={page.id === selectedId ? 'true' : undefined}
                  className="text-left font-star text-base italic hover:underline hover:underline-offset-4"
                >
                  {displayTitle(page)}
                </button>
              </td>
              <td className="px-4 py-2.5">
                <StudiedCell page={page} />
              </td>
              <td className="px-4 py-2.5 text-right">{wordCount(page.content)}</td>
              <td className="max-w-[28ch] truncate px-4 py-2.5 text-muted-foreground">
                {refs
                  .filter((r) => r.to === page.id)
                  .map((r) => displayTitle(byId.get(r.from) as Page))
                  .join(', ') || (page.id === project.startPageId ? 'Start' : 'Nothing yet')}
              </td>
              <td className="px-4 py-2.5 text-right text-muted-foreground">{dateFormat.format(new Date(page.updatedAt))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudiedCell({ page }: { page: Page }) {
  return (
    <span className={`inline-flex items-center gap-2 ${page.studied ? '' : 'text-muted-foreground'}`}>
      <svg width="12" height="12" aria-hidden="true">
        {page.studied ? (
          <circle cx="6" cy="6" r="5" className="fill-primary" />
        ) : (
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        )}
      </svg>
      {page.studied ? 'Studied' : 'Not yet'}
    </span>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-full place-items-center rounded border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
