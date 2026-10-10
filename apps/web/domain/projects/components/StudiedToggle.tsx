'use client';

/**
 * StudiedToggle
 * A quiet switch for the page's studied flag, drawn as the chart's star symbol.
 */
export function StudiedToggle({ studied, onChange }: { studied: boolean; onChange: (studied: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={studied}
      onClick={() => onChange(!studied)}
      className="inline-flex items-center gap-2 rounded px-1.5 py-1 text-sm text-foreground transition-colors hover:bg-accent"
    >
      <svg width="14" height="14" aria-hidden="true">
        {studied ? (
          <circle cx="7" cy="7" r="6" className="fill-primary" />
        ) : (
          <circle cx="7" cy="7" r="5" fill="none" className="stroke-primary" strokeWidth="1.6" />
        )}
      </svg>
      Studied
    </button>
  );
}
