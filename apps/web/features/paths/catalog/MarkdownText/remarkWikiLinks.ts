/**
 * A remark plugin turning [[Title]] in a page's text into a link to that page, or into the bare title when the path
 * has no page by it yet. A citation, @[[Title]], becomes the same link marked data-citation, to draw it quieter, or
 * the bare title without its @. Code keeps its brackets: only text nodes are read.
 */

/** The bits of a markdown tree this plugin reads and writes */
interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
  data?: { hProperties: Record<string, string> };
}

const WIKI_LINK = /(@?)\[\[([^\]\n]+)\]\]/g;

/** A text node's words with each [[Title]] (or @[[Title]]) as a link, or as its title alone */
function split(value: string, hrefOf: (title: string) => string | null): MarkdownNode[] {
  const out: MarkdownNode[] = [];
  let last = 0;
  for (const match of value.matchAll(WIKI_LINK)) {
    const title = match[2].trim();
    const href = hrefOf(title);
    const citation = match[1] ? { data: { hProperties: { dataCitation: 'true' } } } : {};
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    out.push(href ? { type: 'link', url: href, children: [{ type: 'text', value: title }], ...citation } : { type: 'text', value: title });
    last = match.index + match[0].length;
  }
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function visit(node: MarkdownNode, hrefOf: (title: string) => string | null) {
  if (!node.children) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value?.includes('[[')) return split(child.value, hrefOf);
    visit(child, hrefOf);
    return [child];
  });
}

/** The plugin, for react-markdown's remarkPlugins: `[remarkWikiLinks, { hrefOf }]` */
export function remarkWikiLinks({ hrefOf }: { hrefOf: (title: string) => string | null }) {
  return (tree: MarkdownNode) => visit(tree, hrefOf);
}
