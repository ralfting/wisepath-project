'use client';

import { useEffect, useState } from 'react';

/**
 * LinkPreview
 * A small card for the link under the pointer: another page's title and
 * opening lines, or an external site's favicon, title and description.
 */

interface ExternalPreview {
  title: string | null;
  description: string | null;
  siteName: string;
  favicon: string | null;
}

const cache = new Map<string, Promise<ExternalPreview | null>>();

function loadPreview(href: string): Promise<ExternalPreview | null> {
  let pending = cache.get(href);
  if (!pending) {
    pending = fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ExternalPreview>) : null))
      .catch(() => null);
    cache.set(href, pending);
  }
  return pending;
}

function plainExcerpt(markdown: string, max = 150): string {
  const text = markdown
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#>*_`~[\]]|\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export interface PreviewPage {
  id: string;
  title: string;
  content: string;
}

export type PreviewTarget = { kind: 'page'; title: string; page: PreviewPage | undefined } | { kind: 'url'; href: string };

export function LinkPreview({ target }: { target: PreviewTarget }) {
  if (target.kind === 'page') {
    return (
      <div className="space-y-1">
        <p className="font-star text-[15px] italic leading-snug">{target.page?.title || target.title}</p>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
          {target.page ? plainExcerpt(target.page.content) || 'Nothing written yet.' : "This page doesn't exist yet."}
        </p>
      </div>
    );
  }
  return <ExternalLinkPreview href={target.href} />;
}

function ExternalLinkPreview({ href }: { href: string }) {
  const [preview, setPreview] = useState<ExternalPreview | null | undefined>(undefined);
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    // Keep the raw text
  }

  useEffect(() => {
    let alive = true;
    setPreview(undefined);
    loadPreview(href).then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [href]);

  return (
    <div className="flex gap-2.5">
      {preview?.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.favicon} alt="" width={16} height={16} className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
      ) : (
        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-accent" aria-hidden="true" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="line-clamp-2 text-sm font-bold leading-snug">
          {preview === undefined ? 'Loading preview…' : preview?.title || host}
        </p>
        {preview?.description && (
          <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{preview.description}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{preview?.siteName ?? host}</p>
      </div>
    </div>
  );
}
