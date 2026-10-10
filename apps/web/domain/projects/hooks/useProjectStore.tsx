'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChartPosition, Page, Project } from '../types/project.types';
import {
  addPage,
  connectPages,
  deletePage,
  disconnectPages,
  movePage,
  updatePage,
} from '../entities/project.entity';

/**
 * Project store
 * Holds one project on the client and persists it to localStorage,
 * standing in for the projects API until it exists.
 */

const storageKey = (projectId: string) => `wisepath:project:v2:${projectId}`;

interface ProjectStore {
  project: Project;
  /** False until the saved copy (if any) has been read on the client */
  ready: boolean;
  createPage: (position: ChartPosition) => Page;
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  movePage: (pageId: string, position: ChartPosition) => void;
  deletePage: (pageId: string) => void;
  connect: (pageA: string, pageB: string) => void;
  disconnect: (pageA: string, pageB: string) => void;
}

const ProjectStoreContext = createContext<ProjectStore | null>(null);

function readStored(projectId: string): Project | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    return Array.isArray(parsed.pages) && Array.isArray(parsed.connections) ? parsed : null;
  } catch {
    return null;
  }
}

export function ProjectStoreProvider({ initialProject, children }: { initialProject: Project; children: ReactNode }) {
  const [project, setProject] = useState(initialProject);
  const projectRef = useRef(project);
  const loadedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Replace the seed with the saved copy once on the client
  useEffect(() => {
    const stored = readStored(initialProject.id);
    if (stored) setProject(stored);
    loadedRef.current = true;
    setReady(true);
  }, [initialProject.id]);

  // Save edits shortly after they happen
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(project.id), JSON.stringify(project));
      } catch {
        // Storage full or blocked: edits stay in memory for this session
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [project]);

  const createPage = useCallback((position: ChartPosition) => {
    const result = addPage(projectRef.current, position);
    projectRef.current = result.project;
    setProject(result.project);
    return result.page;
  }, []);

  const store = useMemo<ProjectStore>(
    () => ({
      project,
      ready,
      createPage,
      updatePage: (pageId, patch) => setProject((p) => updatePage(p, pageId, patch)),
      movePage: (pageId, position) => setProject((p) => movePage(p, pageId, position)),
      deletePage: (pageId) => setProject((p) => deletePage(p, pageId)),
      connect: (a, b) => setProject((p) => connectPages(p, a, b)),
      disconnect: (a, b) => setProject((p) => disconnectPages(p, a, b)),
    }),
    [project, ready, createPage],
  );

  return <ProjectStoreContext.Provider value={store}>{children}</ProjectStoreContext.Provider>;
}

export function useProjectStore(): ProjectStore {
  const store = useContext(ProjectStoreContext);
  if (!store) throw new Error('useProjectStore must be used inside ProjectStoreProvider');
  return store;
}
