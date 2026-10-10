'use client';

import type { ReactNode } from 'react';
import type { Page, Project } from '../types/project.types';
import { isStudied, pagesInOrder, prerequisitesOf } from '../entities/project.entity';

/**
 * PageList
 * The same pages in learning order. Columns stay fixed; only the state cell changes.
 */

interface PageListProps {
  project: Project;
  nextPageId: string | null;
  selectedId: string | null;
  matchIds: Set<string> | null;
  onSelect: (pageId: string) => void;
}

export function PageList({ project, nextPageId, selectedId, matchIds, onSelect }: PageListProps) {
  const ordered = pagesInOrder(project);
  const order = new Map(ordered.map((p, i) => [p.id, i + 1]));
  const rows = matchIds ? ordered.filter((p) => matchIds.has(p.id)) : ordered;

  if (project.pages.length === 0) {
    return <EmptyMessage>This project has no pages yet.</EmptyMessage>;
  }
  if (rows.length === 0) {
    return <EmptyMessage>No page matches your search. Clear it to see every page.</EmptyMessage>;
  }

  return (
    <div className="h-full overflow-auto rounded border border-border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">Pages of {project.title} in learning order</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-[13px] text-muted-foreground">
            <th scope="col" className="w-14 px-4 py-2.5 font-normal">Order</th>
            <th scope="col" className="px-4 py-2.5 font-normal">Page</th>
            <th scope="col" className="w-40 px-4 py-2.5 font-normal">State</th>
            <th scope="col" className="w-28 px-4 py-2.5 text-right font-normal">Resources</th>
            <th scope="col" className="px-4 py-2.5 font-normal">Comes after</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((page) => {
            const isSelected = page.id === selectedId;
            return (
              <tr
                key={page.id}
                className={`border-b border-border/70 last:border-b-0 ${isSelected ? 'bg-accent' : 'hover:bg-muted'}`}
              >
                <td className="px-4 py-2.5 text-muted-foreground">{order.get(page.id)}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelect(page.id)}
                    aria-current={isSelected ? 'true' : undefined}
                    className="font-star text-base italic hover:underline hover:underline-offset-4"
                  >
                    {page.title}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <StateCell page={page} isNext={page.id === nextPageId} />
                </td>
                <td className="px-4 py-2.5 text-right">{page.resources.length}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {prerequisitesOf(project, page.id)
                    .map((p) => p.title)
                    .join(', ') || 'Start'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StateCell({ page, isNext }: { page: Page; isNext: boolean }) {
  if (isStudied(page)) {
    return (
      <span className="inline-flex items-center gap-2">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" className="fill-primary" />
        </svg>
        Studied
      </span>
    );
  }
  if (isNext) {
    return (
      <span className="inline-flex items-center gap-2 font-bold text-finder">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Next up
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <svg width="12" height="12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      Not studied
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
