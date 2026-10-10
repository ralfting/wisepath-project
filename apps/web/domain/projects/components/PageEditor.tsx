'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { COLUMN } from './StarChart';
import { displayTitle, freeSpotNear } from '../entities/project.entity';
import { useProjectStore } from '../hooks/useProjectStore';
import { PageContent } from './PageContent';
import type { PageActions } from './PageContent';
import { StudiedToggle } from './StudiedToggle';
import { BackIcon } from './icons';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's sheet, for longer writing.
 */
export function PageEditor({ pageId }: { pageId: string }) {
  const router = useRouter();
  const store = useProjectStore();
  const { project, ready } = store;
  const page = project.pages.find((p) => p.id === pageId);
  const isFresh = useSearchParams().get('new') === '1';
  const pageHref = (id: string) => `/projects/${project.id}/pages/${id}`;

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

  const actions: PageActions = {
    updatePage: store.updatePage,
    connect: store.connect,
    disconnect: store.disconnect,
    openPage: (id) => router.push(pageHref(id)),
    createConnectedPage: (fromId) => {
      const created = store.createPage(freeSpotNear(project, { x: page.position.x + COLUMN, y: page.position.y }));
      store.connect(fromId, created.id);
      router.push(`${pageHref(created.id)}?new=1`);
    },
    deletePage: (id) => {
      store.deletePage(id);
      router.push(`/projects/${project.id}`);
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
        <Link
          href={`/projects/${project.id}?page=${page.id}`}
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

      <main className="mx-auto w-full max-w-[78ch] px-5 pb-20 pt-10 sm:px-8">
        <PageContent
          project={project}
          page={page}
          actions={actions}
          isFresh={isFresh}
          titleClassName="text-[40px]"
        />
      </main>
    </div>
  );
}
