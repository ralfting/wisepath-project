'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import type { PathSummary } from '@wisepath/domain/paths';
import type { Project } from '@wisepath/domain/projects';

/**
 * A project group's view model: its rename and delete dialogs, and taking a path card dragged from another
 * project, which it highlights while the card is over it
 */
export function useProjectGroup({
  project,
  dragging,
  onDrag,
  onMove,
}: {
  project: Project;
  dragging: PathSummary | null;
  onDrag: (path: PathSummary | null) => void;
  onMove: (path: PathSummary, to: Project) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [over, setOver] = useState(false);
  // A card from another project can be dropped here
  const accepts = dragging !== null && dragging.projectId !== project.id;

  const dragOver = (event: DragEvent) => {
    if (!accepts) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(true);
  };
  const dragLeave = (event: DragEvent) => {
    // Leaving for a child of the group is still over it
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (accepts) onMove(dragging, project);
    onDrag(null);
  };

  return {
    state: { renaming, deleting, accepts, over: accepts && over },
    operations: {
      rename: () => setRenaming(true),
      stopRenaming: () => setRenaming(false),
      remove: () => setDeleting(true),
      stopRemoving: () => setDeleting(false),
      dragOver,
      dragLeave,
      drop,
    },
  };
}
