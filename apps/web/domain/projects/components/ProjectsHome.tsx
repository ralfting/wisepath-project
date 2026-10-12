'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../types/project.types';
import { countStudied } from '../entities/project.entity';
import { references, subjectOf } from '../entities/levels';
import { layoutGraph } from '../entities/graph-layout';
import { readStoredProject } from '../hooks/useProjectStore';
import { useAuth } from '@/domain/auth';

/**
 * ProjectsHome
 * Where a logged-in learner lands: their projects, each with a small chart
 * of its pages, how far they have studied, and the way into its map.
 */

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

export function ProjectsHome({ projects: shipped }: { projects: Project[] }) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  // Projects live on this device until the projects API exists; prefer the saved copy
  const [projects, setProjects] = useState(shipped);

  useEffect(() => {
    setProjects(shipped.map((p) => readStoredProject(p.id) ?? p));
  }, [shipped]);

  // A cookie that no longer opens a session: clear it, then log in again
  useEffect(() => {
    if (loading || user) return;
    logout()
      .catch(() => undefined)
      .finally(() => router.replace('/login'));
  }, [loading, user, logout, router]);

  const onLogout = async () => {
    await logout().catch(() => undefined);
    router.replace('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
        <Link href="/projects" className="text-[17px] font-bold">
          WisePath
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {user && <span className="hidden text-muted-foreground sm:inline">{user.name || user.email}</span>}
          <button
            type="button"
            onClick={onLogout}
            className="h-9 rounded border border-border bg-card px-3.5 font-bold text-foreground transition-colors hover:bg-accent"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6">
        <h1 className="font-star text-[34px] font-medium italic leading-tight">Your projects</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Each project is a subject you are learning, mapped page by page.
        </p>

        {projects.length === 0 ? (
          <p className="mt-10 text-[15px] text-muted-foreground">No projects yet.</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const total = project.pages.length;
  const studied = countStudied(project);
  const lastEdit = project.pages.reduce<string | null>((latest, p) => (!latest || p.updatedAt > latest ? p.updatedAt : latest), null);
  const start = project.pages.find((p) => p.id === project.startPageId);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col gap-5 rounded border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
    >
      <MiniChart project={project} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-star text-2xl italic leading-tight group-hover:underline group-hover:underline-offset-4">
            {project.title}
          </h2>
          {project.isSample && <span className="text-[13px] text-muted-foreground">Sample project</span>}
        </div>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'page' : 'pages'}
          {start ? `, starting from ${start.title}` : ''}.
          {lastEdit ? ` Last edited ${dateFormat.format(new Date(lastEdit))}.` : ''}
        </p>
        <div className="space-y-1.5 pt-1">
          <div
            role="progressbar"
            aria-label={`Pages studied in ${project.title}`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={studied}
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (studied / total) * 100 : 0}%` }} />
          </div>
          <p className="text-[13px] text-muted-foreground">
            <span className="font-bold text-foreground">{studied}</span> of {total} studied toward knowing{' '}
            {subjectOf(project)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** The project's chart in miniature: the same downward graph, without names */
function MiniChart({ project }: { project: Project }) {
  const W = 220;
  const H = 136;
  const { dots, lines } = useMemo(() => {
    const { positions } = layoutGraph(project);
    const pts = Array.from(positions.values());
    if (!pts.length) return { dots: [], lines: [] };
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    const scale = Math.min((W - 24) / Math.max(maxX - minX, 1), (H - 24) / Math.max(maxY - minY, 1));
    const ox = (W - (maxX - minX) * scale) / 2;
    const oy = (H - (maxY - minY) * scale) / 2;
    const at = (id: string) => {
      const p = positions.get(id) ?? { x: minX, y: minY };
      return { x: ox + (p.x - minX) * scale, y: oy + (p.y - minY) * scale };
    };
    return {
      dots: project.pages.map((p) => ({ id: p.id, studied: p.studied, ...at(p.id) })),
      lines: references(project).map((r) => ({ key: `${r.from}-${r.to}`, a: at(r.from), b: at(r.to) })),
    };
  }, [project]);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="w-full shrink-0 rounded bg-chart sm:w-[220px]"
    >
      {lines.map(({ key, a, b }) => (
        <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-star-dim" strokeWidth={0.8} opacity={0.7} />
      ))}
      {dots.map((d) =>
        d.studied ? (
          <circle key={d.id} cx={d.x} cy={d.y} r={2.6} className="fill-star" />
        ) : (
          <circle key={d.id} cx={d.x} cy={d.y} r={2.2} className="fill-chart stroke-star-ring" strokeWidth={1} />
        ),
      )}
    </svg>
  );
}
