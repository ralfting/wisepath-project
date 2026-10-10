'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown
 * Renders page content. A YouTube link alone on its line becomes an embedded player.
 */

function youTubeId(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/);
      return match ? match[1] : null;
    }
  } catch {
    // Not an absolute URL
  }
  return null;
}

const components: Components = {
  p({ node, children }) {
    const only = node?.children.length === 1 ? node.children[0] : null;
    if (only?.type === 'element' && only.tagName === 'a') {
      const href = String(only.properties?.href ?? '');
      const id = youTubeId(href);
      if (id) {
        return (
          <div className="md-embed">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="YouTube video"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
    }
    return <p>{children}</p>;
  },
  a({ href, children }) {
    const external = !!href && /^https?:/.test(href);
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
};

export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
