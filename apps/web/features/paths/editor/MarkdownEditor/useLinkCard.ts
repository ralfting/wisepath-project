'use client';

import { useRef, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';
import { findPageByTitle } from '@wisepath/domain/paths';
import type { PreviewPage, PreviewTarget } from '../LinkPreview/LinkPreview';
import { openInNewTab, webAddress } from './MarkdownEditor.helpers';
import type { LinkCard } from './MarkdownEditor.helpers';
import type { Chip } from '../wikiLink';

/**
 * The card under a link: shown after the pointer rests on it (a page's or a site's preview, the whole card opening
 * it), and at once when a [[link]] to a page not made yet is followed, asking to make it
 */
export function useLinkCard({
  wrapper,
  pages,
  onOpenPage,
  onCreatePage,
  canCreate,
  chipOf,
  onToggleCitation,
}: {
  wrapper: RefObject<HTMLDivElement | null>;
  pages: () => ReadonlyArray<PreviewPage>;
  /** `alternate`: opened with Cmd/Ctrl, in the screen's other way (the full page, or the drawer) */
  onOpenPage: (pageId: string, alternate?: boolean) => void;
  onCreatePage: (title: string) => void;
  /** Whether a link to a missing page may offer to make it, and a link turn into a citation (not for a reader) */
  canCreate: () => boolean;
  /** The chip drawn as this element, to turn it into a citation or a link */
  chipOf: (element: Element) => Chip | null;
  onToggleCitation: (pos: number) => void;
}) {
  const [card, setCard] = useState<LinkCard | null>(null);
  const hoverTimer = useRef<number>(0);

  const placeBelow = (el: Element) => {
    const box = wrapper.current;
    if (!box) return { top: 0, left: 0 };
    const a = el.getBoundingClientRect();
    const w = box.getBoundingClientRect();
    return { top: a.bottom - w.top, left: Math.max(0, Math.min(a.left - w.left, w.width - 288)) };
  };

  /** Follows a [[link]]: to its page, or (none has the name yet) to the card that offers to make it */
  const openWikiLink = (title: string, el: Element, alternate = false) => {
    const page = findPageByTitle(pages(), title);
    if (page) {
      setCard(null);
      onOpenPage(page.id, alternate);
      return;
    }
    if (!canCreate()) return;
    window.clearTimeout(hoverTimer.current);
    setCard({ target: { kind: 'page', title, page: undefined }, confirmCreate: true, ...placeBelow(el) });
  };

  const over = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Pointer reached the card: keep it open
    if (target.closest('[data-link-card]')) {
      window.clearTimeout(hoverTimer.current);
      return;
    }
    const el = target.closest('.wp-editor a, .wp-editor span[data-wikilink]');
    if (!el || card?.confirmCreate) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const title = el.getAttribute('data-wikilink');
      const linkTarget: PreviewTarget =
        title !== null
          ? { kind: 'page', title, page: findPageByTitle(pages(), title) }
          : { kind: 'url', href: webAddress(el.getAttribute('href') ?? '') ?? el.getAttribute('href') ?? '' };
      const chip = title !== null && canCreate() ? chipOf(el) : null;
      setCard({ target: linkTarget, ...placeBelow(el), ...(chip ? { chip } : {}) });
    }, 350);
  };
  const out = (event: MouseEvent) => {
    const to = event.relatedTarget as HTMLElement | null;
    if (card?.confirmCreate || to?.closest('.wp-editor a, .wp-editor span[data-wikilink], [data-link-card]')) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setCard(null), 300);
  };

  /** The card's own action: open the site or the page, or make the page it names */
  const act = () => {
    if (!card) return;
    const { target } = card;
    setCard(null);
    if (target.kind === 'url') openInNewTab(target.href);
    else if (target.page) onOpenPage(target.page.id);
    else onCreatePage(target.title);
  };

  /** Turns the card's link into a citation of its page, or back; the card stays, saying what it now is */
  const toggleCitation = () => {
    if (!card?.chip) return;
    onToggleCitation(card.chip.pos);
    setCard({ ...card, chip: { ...card.chip, citation: !card.chip.citation } });
  };

  return { card, openWikiLink, over, out, act, toggleCitation, close: () => setCard(null) };
}
