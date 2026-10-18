import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Anchor, TypographyStylesProvider } from '@mantine/core';
import { remarkWikiLinks } from './remarkWikiLinks';

/** Links to other pages of the path start here; anything else leaves the site */
const INTERNAL = '/';

const components: Components = {
  // The page's title is the one top heading; the text's headings sit under it
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) =>
    href?.startsWith(INTERNAL) ? (
      <Anchor href={href}>{children}</Anchor>
    ) : (
      // Written by the path's author, not vouched for by WisePath
      <Anchor href={href} target="_blank" rel="ugc nofollow noopener noreferrer">
        {children}
      </Anchor>
    ),
};

/**
 * A page's markdown as HTML, rendered on the server with no HTML of the author's let through: [[Title]] links to the
 * page by that title when the path has one, tables and task lists as GitHub writes them.
 */
export function MarkdownText({ content, hrefOf }: { content: string; hrefOf: (title: string) => string | null }) {
  return (
    <TypographyStylesProvider>
      <Markdown remarkPlugins={[remarkGfm, [remarkWikiLinks, { hrefOf }]]} components={components}>
        {content}
      </Markdown>
    </TypographyStylesProvider>
  );
}
