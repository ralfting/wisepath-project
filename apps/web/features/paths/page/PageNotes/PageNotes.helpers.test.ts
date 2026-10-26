import { describe, expect, it } from 'vitest';
import { placeNoteCard } from './PageNotes.helpers';
import type { CardRoom } from './PageNotes.helpers';

const card = { width: 320, height: 200 };
const gap = 16;
const passage = { top: 300, bottom: 320, left: 900, right: 1000 };

/** The full page: a 688-wide sheet centred in the column right of the sidebar */
const fullPage = (windowWidth: number): CardRoom => {
  const column = { left: 264, right: windowWidth };
  const left = (column.left + column.right - 688) / 2;
  return { passage, frame: { left, right: left + 688 }, area: column, movable: true, viewport: { width: windowWidth, height: 860 }, card, gap };
};

/** The drawer: 560 wide, 12 from the window's right edge, over the map */
const drawer = (windowWidth: number): CardRoom => ({
  passage,
  frame: { left: windowWidth - 572, right: windowWidth - 12 },
  area: { left: 0, right: windowWidth },
  movable: false,
  viewport: { width: windowWidth, height: 860 },
  card,
  gap,
});

describe('placeNoteCard', () => {
  it.each([
    ['the full page with room on its right', fullPage(1920), { side: 'right', left: 1436 + gap, shift: 0 }],
    ['the full page short of room, moved left as Docs does', fullPage(1512), { side: 'right', left: 1232 - 72 + gap, shift: 72 }],
    ['the drawer at the window edge, the card over the map', drawer(1440), { side: 'left', left: 868 - gap - 320, shift: 0 }],
    ['the drawer in a window too narrow for either margin', drawer(900), { side: 'under', left: 900 - 320 - gap, shift: 0 }],
    ['the full page on a phone', { ...fullPage(390), area: { left: 0, right: 390 }, frame: { left: 0, right: 390 }, passage: { ...passage, left: 40 } }, { side: 'under', left: 40, shift: 0 }],
  ] as const)('%s', (_, room, expected) => {
    expect(placeNoteCard(room)).toMatchObject(expected);
  });

  it("aligns the card's top with the passage's beside the page, and puts it just under the passage otherwise", () => {
    expect(placeNoteCard(drawer(1440)).top).toBe(300);
    expect(placeNoteCard(drawer(900)).top).toBe(320 + gap / 2);
  });

  it('keeps the card in the window once its passage scrolls out of sight', () => {
    expect(placeNoteCard({ ...drawer(1440), passage: { ...passage, top: -400, bottom: -380 } }).top).toBe(gap);
    expect(placeNoteCard({ ...drawer(1440), passage: { ...passage, top: 2000, bottom: 2020 } }).top).toBe(860 - 200 - gap);
  });

  it('puts the card over the passage when there is no room under it', () => {
    expect(placeNoteCard({ ...drawer(900), passage: { ...passage, top: 760, bottom: 780 } }).top).toBe(760 - gap / 2 - 200);
  });
});
