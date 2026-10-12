'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Page, Project } from '../types/project.types';
import { addChildPage, addPage, deletePage, renameLinks, setStartPage, updatePage } from '../entities/project.entity';

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
  /** Adds a page one level below the parent (its [[link]] is written there); no parent makes the start page */
  addChild: (parentId: string | null, title: string) => Page;
  /** Adds a page by title without linking it, e.g. from a [[link]] that pointed nowhere yet */
  addPage: (title: string) => Page;
  updatePage: (pageId: string, patch: Partial<Pick<Page, 'title' | 'content' | 'studied'>>) => void;
  /** Rewrites [[Old]] links across the project after a rename */
  renameLinks: (oldTitle: string, newTitle: string) => void;
  deletePage: (pageId: string) => void;
  setStartPage: (pageId: string | null) => void;
  /** Throws away local edits and restores the project as shipped (sample only) */
  reset: () => void;
}

const ProjectStoreContext = createContext<ProjectStore | null>(null);

/** The copy of a project saved on this device, if any */
export function readStoredProject(projectId: string): Project | null {
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    return Array.isArray(parsed.pages) ? parsed : null;
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
    const stored = readStoredProject(initialProject.id);
    if (stored) {
      projectRef.current = stored;
      setProject(stored);
    }
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

  // Every change goes through the ref so back-to-back actions build on each other
  const commit = useCallback((change: (p: Project) => Project) => {
    projectRef.current = change(projectRef.current);
    setProject(projectRef.current);
  }, []);

  const store = useMemo<ProjectStore>(
    () => ({
      project,
      ready,
      addChild: (parentId, title) => {
        const result = addChildPage(projectRef.current, parentId, title);
        commit(() => result.project);
        return result.page;
      },
      addPage: (title) => {
        const result = addPage(projectRef.current, title);
        commit(() => result.project);
        return result.page;
      },
      updatePage: (pageId, patch) => commit((p) => updatePage(p, pageId, patch)),
      renameLinks: (oldTitle, newTitle) => commit((p) => renameLinks(p, oldTitle, newTitle)),
      deletePage: (pageId) => commit((p) => deletePage(p, pageId)),
      setStartPage: (pageId) => commit((p) => setStartPage(p, pageId)),
      reset: () => commit(() => initialProject),
    }),
    [project, ready, commit, initialProject],
  );

  return <ProjectStoreContext.Provider value={store}>{children}</ProjectStoreContext.Provider>;
}

export function useProjectStore(): ProjectStore {
  const store = useContext(ProjectStoreContext);
  if (!store) throw new Error('useProjectStore must be used inside ProjectStoreProvider');
  return store;
}
