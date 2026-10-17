'use client';

import { PathGate } from '@/features/paths/path';
import { MapView } from './MapView';

/**
 * PathMap
 * A map's home: its title and progress, and the mind map (or the list) across
 * the full width. Selecting a page navigates to its URL, which opens it in a
 * drawer over the map (see app/paths/[pathId]/@drawer); the open page
 * is read back from the URL.
 */

export function PathMap({ pathId }: { pathId: string }) {
  return <PathGate pathId={pathId}>{(path, actions, save) => <MapView path={path} actions={actions} save={save} />}</PathGate>;
}
