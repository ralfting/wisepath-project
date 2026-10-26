import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Anchor, TypographyStylesProvider } from '@mantine/core';
import type { Translate } from '@/i18n/I18nProvider';
import { CALLOUT_KINDS } from '@/shared/callouts';
import { Callout } from '@/ui/Callout/Callout';
import { remarkCallouts } from './remarkCallouts';
import { remarkWikiLinks } from './remarkWikiLinks';
import classes from './MarkdownText.module.css';

/** Links to other pages of the path start here; anything else leaves the site */
const INTERNAL = '/';

const components = (t: Translate): Components => ({
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
  // Only remarkCallouts makes asides, since the author's own HTML is never let through
  aside: ({ node, children }) => {
    const kind = CALLOUT_KINDS.find((k) => k === node?.properties.dataCallout);
    return kind ? (
      <Callout kind={kind} label={t(`editor.callout.kinds.${kind}`)}>
        {children}
      </Callout>
    ) : (
      <aside>{children}</aside>
    );
  },
});

/**
 * Markdown as HTML, read without an editor (on the server for the catalog, under a page for the reader's notes), with
 * no HTML of the author's let through: [[Title]] links to the page by that title when the path has one, tables and
 * task lists as GitHub writes them, callouts as the editor draws them.
 */
export function MarkdownText({ content, hrefOf, t }: { content: string; hrefOf: (title: string) => string | null; t: Translate }) {
  return (
    <TypographyStylesProvider className={classes.text}>
      <Markdown remarkPlugins={[remarkGfm, remarkCallouts, [remarkWikiLinks, { hrefOf }]]} components={components(t)}>
        {content}
      </Markdown>
    </TypographyStylesProvider>
  );
}
