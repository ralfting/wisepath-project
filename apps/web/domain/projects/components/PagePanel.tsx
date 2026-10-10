'use client';

import type { ReactNode } from 'react';
import type { Page, Project, Resource } from '../types/project.types';
import { followUpsOf, isStudied, prerequisitesOf } from '../entities/project.entity';
import { ArticleIcon, BookIcon, ExternalIcon, NoteIcon, VideoIcon } from './icons';

/**
 * PagePanel
 * The selected page (or the next page) read beside the chart:
 * its notes, resources, connections and the study action.
 */

interface PagePanelProps {
  project: Project;
  page: Page | null;
  nextPage: Page | null;
  studiedCount: number;
  onSelect: (pageId: string) => void;
  onMarkStudied: (pageId: string, studied: boolean) => void;
}

const KIND_LABEL: Record<Resource['kind'], string> = {
  video: 'Video',
  article: 'Article',
  book: 'Book',
  note: 'Note',
};

const KIND_ICON: Record<Resource['kind'], () => JSX.Element> = {
  video: VideoIcon,
  article: ArticleIcon,
  book: BookIcon,
  note: NoteIcon,
};

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

function formatList(pages: Page[]) {
  const titles = pages.map((p) => p.title);
  if (titles.length <= 1) return titles.join('');
  return `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`;
}

export function PagePanel({ project, page, nextPage, studiedCount, onSelect, onMarkStudied }: PagePanelProps) {
  if (!page) {
    return (
      <aside aria-label="Page details" className="flex flex-col gap-4 px-6 py-6 lg:px-7">
        {project.pages.length === 0 ? (
          <>
            <h2 className="font-star text-[28px] italic leading-tight">Start your path</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Add the first page of {project.title} to put a star on the chart.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-star text-[28px] italic leading-tight">Every page studied</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              All {studiedCount} pages of {project.title} are lit. Pick any star to review its notes and resources.
            </p>
          </>
        )}
      </aside>
    );
  }

  const studied = isStudied(page);
  const isNext = nextPage?.id === page.id;
  const before = prerequisitesOf(project, page.id);
  const after = followUpsOf(project, page.id);
  const missing = before.filter((p) => !isStudied(p));

  let status: ReactNode;
  if (studied) {
    status = <>Studied on {dateFormat.format(new Date(page.studiedAt as string))}</>;
  } else if (isNext) {
    status = (
      <span className="inline-flex items-center gap-1.5 font-bold text-finder">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Next up
      </span>
    );
  } else if (missing.length > 0) {
    status = <>Not studied. Study {formatList(missing)} first.</>;
  } else {
    status = <>Not studied</>;
  }

  return (
    <aside aria-label="Page details" className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-6 lg:px-7">
      <header className="space-y-1.5">
        <h2 className="font-star text-[28px] font-medium italic leading-tight">{page.title}</h2>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {status}
        </p>
      </header>

      <p className="max-w-[62ch] text-[15px] leading-relaxed text-foreground/85">{page.description}</p>

      <section className="space-y-2.5">
        <h3 className="text-[15px] font-bold">
          Resources <span className="font-normal text-muted-foreground">({page.resources.length})</span>
        </h3>
        {page.resources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources on this page yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {page.resources.map((resource) => (
              <li key={resource.id}>
                <ResourceRow resource={resource} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(before.length > 0 || after.length > 0) && (
        <section className="space-y-2 text-sm">
          <h3 className="text-[15px] font-bold">Connections</h3>
          {before.length > 0 && <ConnectionLine label="Comes after" pages={before} onSelect={onSelect} />}
          {after.length > 0 && <ConnectionLine label="Leads to" pages={after} onSelect={onSelect} />}
        </section>
      )}

      <div className="mt-auto space-y-3 pt-2">
        {studied ? (
          <>
            {nextPage && (
              <p className="text-sm text-muted-foreground">
                Next up:{' '}
                <button
                  type="button"
                  onClick={() => onSelect(nextPage.id)}
                  className="font-bold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {nextPage.title}
                </button>
              </p>
            )}
            <button
              type="button"
              onClick={() => onMarkStudied(page.id, false)}
              className="h-11 w-full rounded border border-border bg-card text-[15px] font-bold text-foreground transition-colors hover:bg-accent"
            >
              Mark as not studied
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onMarkStudied(page.id, true)}
            className="h-11 w-full rounded bg-finder text-[15px] font-bold text-finder-foreground transition-colors hover:bg-finder/90 focus-visible:outline-finder active:bg-finder/80"
          >
            Mark as studied
          </button>
        )}
      </div>
    </aside>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const KindIcon = KIND_ICON[resource.kind];
  const meta = [KIND_LABEL[resource.kind], resource.detail].filter(Boolean).join(', ');
  const body = (
    <>
      <span className="mt-0.5 text-muted-foreground">
        <KindIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug">{resource.title}</span>
        <span className="block text-[13px] text-muted-foreground">{meta}</span>
      </span>
      {resource.url && (
        <span className="mt-1 text-muted-foreground">
          <ExternalIcon />
        </span>
      )}
    </>
  );
  const rowClass = 'flex items-start gap-3 rounded border border-border bg-card px-3 py-2.5';

  if (!resource.url) return <div className={rowClass}>{body}</div>;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${rowClass} transition-colors hover:border-primary/40 hover:bg-white`}
    >
      {body}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function ConnectionLine({ label, pages, onSelect }: { label: string; pages: Page[]; onSelect: (id: string) => void }) {
  return (
    <p className="leading-relaxed text-muted-foreground">
      {label}{' '}
      {pages.map((p, i) => (
        <span key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            className="font-star text-[15px] italic text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {p.title}
          </button>
          {i < pages.length - 2 ? ', ' : i === pages.length - 2 ? ' and ' : ''}
        </span>
      ))}
    </p>
  );
}
