'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Project } from '../types/project.types';
import { countStudied, findNextPage, setStudied } from '../entities/project.entity';

/**
 * Holds a project's study progress on the client.
 * Progress is in memory until the projects API exists.
 */
export function useProjectProgress(initial: Project) {
  const [project, setProject] = useState(initial);

  const nextPage = useMemo(() => findNextPage(project), [project]);
  const studiedCount = useMemo(() => countStudied(project), [project]);

  const markStudied = useCallback((pageId: string, studied: boolean) => {
    setProject((current) => setStudied(current, pageId, studied));
  }, []);

  return { project, nextPage, studiedCount, markStudied };
}
