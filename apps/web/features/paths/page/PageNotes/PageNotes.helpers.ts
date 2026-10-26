import type { PageNote } from '@wisepath/domain/paths';

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
