'use client';

import { PathGate } from '@/features/paths/path';
import { EditorView } from './EditorView';

/**
 * PageEditor
 * Full-screen page, edited in place like the map's panel, for longer writing.
 */
export function PageEditor({ pathId, pageId }: { pathId: string; pageId: string }) {
  return (
    <PathGate pathId={pathId}>
      {(path, store, save) => <EditorView path={path} store={store} save={save} pageId={pageId} />}
    </PathGate>
  );
}
