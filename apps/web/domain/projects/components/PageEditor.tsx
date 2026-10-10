'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { displayTitle, wordCount } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { ConnectionsEditor } from './ConnectionsEditor';
import { Markdown } from './Markdown';
import { StudiedToggle } from './StudiedToggle';
import { BackIcon, TrashIcon } from './icons';

/**
 * PageEditor
 * Full-screen page: title and markdown with Write/Preview tabs,
 * connections beside it. Every change is saved as it happens.
 */

type Mode = 'write' | 'preview';

export function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useProjectStore();
  const { project, ready } = store;
  const page = project.pages.find((p) => p.id === pageId);
  const isNew = searchParams.get('new') === '1';

  const [mode, setMode] = useState<Mode>(page && !page.content.trim() ? 'write' : isNew ? 'write' : 'preview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ write: null, preview: null });
  const mapHref = `/projects/${project.id}?page=${pageId}`;

  // Grow the writing area with its content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 360)}px`;
  }, [page?.content, mode]);

  if (!page) {
    if (!ready) return null;
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="font-star text-3xl italic">Page not found</h1>
          <p className="text-[15px] text-muted-foreground">It may have been deleted. The rest of the project is on the map.</p>
          <Link href={`/projects/${project.id}`} className="inline-block font-bold underline underline-offset-4">
            Back to the map
          </Link>
        </div>
      </main>
    );
  }

  const words = wordCount(page.content);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const next: Mode = mode === 'write' ? 'preview' : 'write';
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  const remove = () => {
    store.deletePage(page.id);
    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
        <Link
          href={mapHref}
          className="inline-flex items-center gap-1 rounded py-1 pr-2 text-sm font-bold text-foreground hover:bg-accent"
        >
          <BackIcon />
          Map
        </Link>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 truncate text-[15px] text-muted-foreground sm:block">
          <Link href={`/projects/${project.id}`} className="hover:text-foreground hover:underline">
            {project.title}
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground" aria-current="page">
            {displayTitle(page)}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="hidden md:inline">Saved on this device</span>
          <StudiedToggle studied={page.studied} onChange={(studied) => store.updatePage(page.id, { studied })} />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-[78ch] px-5 pb-16 pt-8 sm:px-8">
            <label htmlFor="page-title" className="sr-only">
              Page title
            </label>
            <input
              id="page-title"
              value={page.title}
              autoFocus={isNew}
              onChange={(e) => store.updatePage(page.id, { title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setMode('write');
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }
              }}
              placeholder="Untitled page"
              className="w-full bg-transparent font-star text-[36px] font-medium italic leading-tight outline-none placeholder:text-muted-foreground/60 focus-visible:outline-none"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border">
              <div role="tablist" aria-label="Editor mode" className="flex gap-5">
                {(['write', 'preview'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    ref={(el) => {
                      tabRefs.current[m] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`mode-${m}`}
                    aria-selected={mode === m}
                    aria-controls="editor-panel"
                    tabIndex={mode === m ? 0 : -1}
                    onClick={() => setMode(m)}
                    onKeyDown={onTabKeyDown}
                    className="-mb-px border-b-2 border-transparent pb-2 text-sm text-muted-foreground hover:text-foreground aria-selected:border-primary aria-selected:font-bold aria-selected:text-foreground"
                  >
                    {m === 'write' ? 'Write' : 'Preview'}
                  </button>
                ))}
              </div>
              <span className="pb-2 text-[13px] text-muted-foreground">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
            </div>

            <div id="editor-panel" role="tabpanel" aria-labelledby={`mode-${mode}`} className="pt-5">
              {mode === 'write' ? (
                <>
                  <label htmlFor="page-content" className="sr-only">
                    Page content in markdown
                  </label>
                  <textarea
                    id="page-content"
                    ref={textareaRef}
                    value={page.content}
                    onChange={(e) => store.updatePage(page.id, { content: e.target.value })}
                    placeholder={'Write in markdown.\n\n## Headings, **bold**, `code`, - lists and [links](https://…) all work.\nA YouTube link on its own line becomes a video.'}
                    spellCheck
                    className="block w-full resize-none rounded border border-border bg-card px-4 py-3.5 font-mono text-[14px] leading-[1.75] text-foreground placeholder:text-muted-foreground/70"
                  />
                </>
              ) : page.content.trim() ? (
                <Markdown content={page.content} className="text-[16px]" />
              ) : (
                <p className="text-[15px] text-muted-foreground">
                  Nothing to preview yet.{' '}
                  <button type="button" onClick={() => setMode('write')} className="font-bold text-foreground underline underline-offset-4">
                    Start writing
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        <aside
          aria-label="Page connections"
          className="flex flex-col gap-8 border-t border-border bg-card px-6 py-7 lg:overflow-y-auto lg:border-l lg:border-t-0"
        >
          <ConnectionsEditor
            project={project}
            pageId={page.id}
            onOpenPage={(id) => router.push(`/projects/${project.id}/pages/${id}`)}
            onConnect={store.connect}
            onDisconnect={store.disconnect}
          />

          <div className="mt-auto border-t border-border pt-5">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Delete <span className="font-star italic">{displayTitle(page)}</span> and its connections? This can&apos;t be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={remove}
                    className="h-9 rounded bg-destructive px-3.5 text-sm font-bold text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete page
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="h-9 rounded px-3.5 text-sm text-foreground hover:bg-accent"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded py-1 text-sm text-muted-foreground hover:text-destructive"
              >
                <TrashIcon />
                Delete page
              </button>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
