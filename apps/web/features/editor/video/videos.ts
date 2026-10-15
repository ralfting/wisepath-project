import type { Editor } from '@tiptap/react';

/**
 * Videos
 * The YouTube players on a page, so a time in the text can reach the video it
 * belongs to: the nearest one above it. Each video block registers itself with
 * its editor while it is on the page.
 */

export interface VideoControl {
  /** The video block's position in the document; undefined once it is gone */
  readonly getPos: () => number | undefined;
  /** Plays from this second, floating the video into view if it scrolled away, or in fullscreen */
  readonly seek: (seconds: number, fullscreen?: boolean) => void;
  /** Pauses it, when another video on the page starts */
  readonly pause: () => void;
}

const players = new WeakMap<Editor, Set<VideoControl>>();

export function registerVideo(editor: Editor, control: VideoControl): () => void {
  let set = players.get(editor);
  if (!set) players.set(editor, (set = new Set()));
  set.add(control);
  return () => set.delete(control);
}

/** One video plays at a time: the one starting pauses the rest, which would otherwise float on top of each other */
export function pauseOthers(editor: Editor, playing: VideoControl): void {
  for (const control of players.get(editor) ?? []) if (control !== playing) control.pause();
}

/** The video a time at this position belongs to: the last one before it */
export function videoAbove(editor: Editor, pos: number): VideoControl | undefined {
  let videoPos: number | undefined;
  editor.state.doc.forEach((node, offset) => {
    if (offset < pos && node.type.name === 'youtube') videoPos = offset;
  });
  if (videoPos === undefined) return undefined;
  return [...(players.get(editor) ?? [])].find((control) => control.getPos() === videoPos);
}
