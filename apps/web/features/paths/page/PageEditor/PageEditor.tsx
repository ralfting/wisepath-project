'use client';

import { usePathname } from 'next/navigation';
import { PathGate } from '@/features/paths/path';
import { openPageId } from '@/shared/routes';
import { EditorView } from './EditorView';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's panel, for longer writing.
 */
export function PageEditor({ pathId, pageId }: { pathId: string; pageId: string }) {
  // The page in the URL: another page shown in place (showFullPage) is ahead of the route's own
  const current = openPageId(usePathname(), pathId) ?? pageId;
  return (
    <PathGate pathId={pathId}>
      {(path, store, save) => <EditorView key={current} path={path} store={store} save={save} pageId={current} />}
    </PathGate>
  );
}
