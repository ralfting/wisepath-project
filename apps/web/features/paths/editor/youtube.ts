import Youtube from '@tiptap/extension-youtube';
import type { MarkdownState } from './markdown';

/** YouTube embeds, written to markdown as the video's link on a line of its own */

export function youTubeId(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1) || null;
    if (url.hostname.endsWith('youtube.com') || url.hostname.endsWith('youtube-nocookie.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/);
      return match ? match[1] : null;
    }
  } catch {
    // Not an absolute URL
  }
  return null;
}

/**
 * YouTube video stored as a bare watch URL on its own line, the same
 * convention the rest of the product reads.
 */
export const YouTubeVideo = Youtube.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownState, node: { attrs: { src: string } }) {
          const id = youTubeId(node.attrs.src);
          state.write(id ? `https://www.youtube.com/watch?v=${id}` : node.attrs.src);
          state.closeBlock(node);
        },
        parse: {
          // A paragraph holding only a YouTube link becomes an embed
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('p').forEach((p) => {
              const only = p.childNodes.length === 1 ? p.firstChild : null;
              const href = only instanceof HTMLAnchorElement ? only.getAttribute('href') ?? '' : p.textContent?.trim() ?? '';
              const id = youTubeId(href);
              if (!id) return;
              const wrapper = document.createElement('div');
              wrapper.setAttribute('data-youtube-video', '');
              const iframe = document.createElement('iframe');
              iframe.setAttribute('src', `https://www.youtube.com/watch?v=${id}`);
              wrapper.appendChild(iframe);
              p.replaceWith(wrapper);
            });
          },
        },
      },
    };
  },
}).configure({ nocookie: true, width: 640, height: 360 });
