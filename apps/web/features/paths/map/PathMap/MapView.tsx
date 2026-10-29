'use client';

import { memo, useState } from 'react';
import { Group, Stack } from '@mantine/core';
import type { Path } from '@wisepath/domain/paths';
import { canEdit } from '@wisepath/domain/paths';
import type { PathActions, SaveState } from '@/useCases/paths';
import { AppFrame } from '@/features/shell';
import { DRAWER_GAP, DRAWER_WIDTH } from '@/features/paths/page';
import { MindMap } from '../MindMap/MindMap';
import { MapList } from '../MapList/MapList';
import { MapOrphans } from '../MapOrphans/MapOrphans';
import { BranchPrompt } from '../BranchPrompt/BranchPrompt';
import classes from './PathMap.module.css';
import { MapHeader } from './MapHeader';
import { MapSearch } from './MapSearch';
import { ViewSwitch } from './ViewSwitch';
import { useMapView } from './useMapView';
import { drawnAlike } from './PathMap.helpers';

interface MapViewProps {
  path: Path;
  actions: PathActions;
  save: SaveState;
}

/**
 * A loaded map: its toolbar, search, and mind map or list; selecting a page opens it in the drawer beside it. Drawn
 * again only when what it shows changes, not on every key typed in the page open beside it
 */
export const MapView = memo(function MapView({ path: given, actions, save }: MapViewProps) {
  // The path last drawn, kept while edits change nothing drawn: drawn again for its save status, the map reuses what
  // it worked out from it
  const [drawn, setDrawn] = useState(given);
  const alike = drawnAlike(drawn, given);
  if (!alike) setDrawn(given);
  const path = alike ? drawn : given;

  const { search, branch, state, operations } = useMapView({ path, actions });
  const currentId = state.next?.id ?? null;
  // A reader studies the map: no + to add pages, no N
  const editable = canEdit(path.access);

  const parent = branch.state.parent;
  const branchPrompt = parent ? (
    <BranchPrompt
      key={parent.id}
      parent={parent}
      pages={path.pages}
      onSubmit={(title, stay) => branch.operations.add(parent.id, title, stay)}
      onClose={() => branch.operations.close(true)}
    />
  ) : null;
  const branchSlot = branch.state.from && branchPrompt ? { from: branch.state.from, prompt: branchPrompt } : null;

  // Top left of the canvas: what it shows and the search, then pages left off the map
  const canvasTools = (
    <Stack gap={6} align="flex-start">
      <Group gap="xs" wrap="nowrap" w="100%">
        {state.canSwitchView && <ViewSwitch view={state.view} onChange={operations.setView} />}
        <MapSearch search={search} view={state.view} path={path} selectedId={state.selectedId} currentId={currentId} progress={state.progress} />
      </Group>
      <MapOrphans path={path} selectedId={state.selectedId} onSelect={operations.select} />
    </Stack>
  );

  const header = (
    <MapHeader
      path={path}
      actions={actions}
      save={save}
      pageOpen={state.selectedId !== null}
      look={state.look}
      progress={state.progress}
      next={state.next}
      studied={state.studied}
      total={state.total}
      onContinue={operations.continueStudying}
    />
  );

  return (
    <AppFrame header={header}>
      <div className={classes.page}>
        <div className={classes.canvas}>
          {state.view === 'map' ? (
            <MindMap
              path={path}
              selectedId={state.selectedId}
              coveredRight={state.selectedId ? DRAWER_WIDTH + DRAWER_GAP * 2 : 0}
              currentId={currentId}
              progress={state.progress}
              matchIds={search.state.matchIds}
              searchActiveId={search.state.activeId}
              focusRequest={state.focusRequest}
              onSelect={(pageId, alternate) => operations.select(pageId, alternate)}
              onIntent={operations.prefetch}
              topLeft={canvasTools}
              onAddBranch={editable ? branch.operations.start : undefined}
              branch={branchSlot}
            />
          ) : (
            <MapList
              header={canvasTools}
              path={path}
              selectedId={state.selectedId}
              currentId={currentId}
              progress={state.progress}
              matchIds={search.state.matchIds}
              onSelect={(pageId, alternate) => operations.select(pageId, alternate)}
              onAddBranch={editable ? branch.operations.start : undefined}
              branch={branchSlot}
            />
          )}
        </div>
      </div>
    </AppFrame>
  );
}, sameMap);

function sameMap(before: MapViewProps, after: MapViewProps) {
  return before.actions === after.actions && before.save === after.save && drawnAlike(before.path, after.path);
}
