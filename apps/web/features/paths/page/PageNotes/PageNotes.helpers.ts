import type { PageNote } from '@wisepath/domain/paths';
import type { NoteRect } from '@/features/paths/editor';

/** A note as the list shows it: `removed` when the words it was made on are no longer in the text */
export interface ListedNote {
  readonly note: PageNote;
  readonly removed: boolean;
}

/**
 * The notes in the order of the text: those on a passage found in it by where it is, then the others (on the whole
 * page, or whose words are gone) oldest first. `found`: the ids the editor found, in text order; null until it says
 */
export function notesInTextOrder(notes: ReadonlyArray<PageNote>, found: ReadonlyArray<string> | null): ReadonlyArray<ListedNote> {
  const at = new Map((found ?? []).map((id, index) => [id, index]));
  const located = notes.filter((note) => at.has(note.id)).sort((a, b) => at.get(a.id)! - at.get(b.id)!);
  const others = notes.filter((note) => !at.has(note.id));
  return [...located, ...others].map((note) => ({ note, removed: found !== null && note.quote !== undefined && !at.has(note.id) }));
}

/** Where something on screen is inside a box, for a card to point at it as the box scrolls */
export interface Spot {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** What a passage's card is placed by, all in window coordinates */
export interface CardRoom {
  /** The passage the card is on */
  readonly passage: NoteRect;
  /** The card the page is on (the full page's sheet, the drawer), where it sits before any shift */
  readonly frame: Pick<NoteRect, 'left' | 'right'>;
  /** Across, where the frame and a card beside it may go: the full page's column, or the whole window over the map */
  readonly area: { readonly left: number; readonly right: number };
  /** The frame may move left to make room (the full page), unlike the drawer held at the window's edge */
  readonly movable: boolean;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly card: { readonly width: number; readonly height: number };
  /** Between the card and the frame, and between the card and the window's edges */
  readonly gap: number;
}

/** Where the card goes: its top-left corner, and how far left the frame moves to make room for it */
export interface CardPlace {
  readonly side: 'right' | 'left' | 'under';
  readonly top: number;
  readonly left: number;
  readonly shift: number;
}

type Beside = (room: CardRoom) => Pick<CardPlace, 'side' | 'left' | 'shift'> | null;

const needed = (room: CardRoom) => room.card.width + 2 * room.gap;
const roomRight = (room: CardRoom) => room.area.right - room.frame.right;

/** The margins beside the page, in the order they are tried */
const BESIDE: ReadonlyArray<Beside> = [
  (room) => (roomRight(room) >= needed(room) ? { side: 'right', left: room.frame.right + room.gap, shift: 0 } : null),
  (room) =>
    room.frame.left - room.area.left >= needed(room) ? { side: 'left', left: room.frame.left - room.gap - room.card.width, shift: 0 } : null,
  // As Docs does: the page moves left when the room right of it is short, while it stays clear of the column's edge
  (room) => {
    const shift = needed(room) - roomRight(room);
    return room.movable && room.frame.left - shift - room.area.left >= room.gap ? { side: 'right', left: room.frame.right - shift + room.gap, shift } : null;
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * A note's card beside the page, its top on the passage's, as a comment in Docs; under the passage when neither
 * margin has room for it. It stays in the window: a passage scrolled out of sight leaves it at the edge
 */
export function placeNoteCard(room: CardRoom): CardPlace {
  const { passage, viewport, card, gap } = room;
  const lowest = viewport.height - card.height - gap;
  for (const beside of BESIDE) {
    const place = beside(room);
    if (place) return { ...place, top: clamp(passage.top, gap, lowest) };
  }
  const below = passage.bottom + gap / 2;
  const top = below <= lowest ? below : passage.top - gap / 2 - card.height;
  return { side: 'under', top: clamp(top, gap, lowest), left: clamp(passage.left, gap, viewport.width - card.width - gap), shift: 0 };
}
