import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { formatTime, parseTime } from './timestamps';

/** The notes under a video: the lines below it that hold a time, read in order and added where their time goes */

export interface VideoNote {
  /** Where the time sits in the document */
  pos: number;
  seconds: number;
  time: string;
  /** The note's line: without the time when it opens it, with it when the time is mid-sentence */
  text: string;
}

/** A line's text, times written out; the time that opens it is left out, the chip shows it */
function lineText(line: PMNode, own: PMNode): string {
  let text = '';
  line.forEach((child, _offset, index) => {
    if (child === own && index === 0) return;
    text += child.type.name === 'timestamp' ? child.attrs.time : child.isText ? child.text : child.textContent;
  });
  return text.trim();
}

/** The times written below a video, up to the next one, in the order they appear */
export function notesAfter(doc: PMNode, videoPos: number): VideoNote[] {
  const video = doc.nodeAt(videoPos);
  if (!video) return [];
  const notes: VideoNote[] = [];
  let pos = videoPos + video.nodeSize;
  for (let index = doc.resolve(pos).index(); index < doc.childCount; index++) {
    const block = doc.child(index);
    if (block.type.name === 'youtube') break;
    block.descendants((node, offset, parent) => {
      if (node.type.name !== 'timestamp' || !parent) return;
      const time = node.attrs.time as string;
      notes.push({ pos: pos + 1 + offset, seconds: parseTime(time), time, text: lineText(parent, node) });
    });
    pos += block.nodeSize;
  }
  return notes;
}

/** The note for this moment: the last one whose time has come */
export function noteAt(notes: ReadonlyArray<VideoNote>, seconds: number): VideoNote | undefined {
  let current: VideoNote | undefined;
  for (const note of notes) if (note.seconds <= seconds + 0.25 && (!current || note.seconds >= current.seconds)) current = note;
  return current;
}

/**
 * Adds "[01:25] text" to the list right below the video, where its time puts
 * it among the others; makes the list if there is none yet
 */
export function addNote(editor: Editor, videoPos: number, seconds: number, text: string) {
  const { state } = editor;
  const { schema, doc } = state;
  const video = doc.nodeAt(videoPos);
  if (!video) return;
  const after = videoPos + video.nodeSize;
  const content = [schema.nodes.timestamp.create({ time: formatTime(seconds) }), ...(text.trim() ? [schema.text(` ${text.trim()}`)] : [])];
  const item = schema.nodes.listItem.create(null, schema.nodes.paragraph.create(null, content));
  const list = doc.nodeAt(after);

  const tr = state.tr;
  if (list?.type.name !== 'bulletList') {
    tr.insert(after, schema.nodes.bulletList.create(null, item));
  } else {
    // Before the first item whose time is later; items without a time don't count
    let insertAt = after + list.nodeSize - 1;
    let offset = after + 1;
    for (let i = 0; i < list.childCount; i++) {
      const first = list.child(i).firstChild?.firstChild;
      if (first?.type.name === 'timestamp' && parseTime(first.attrs.time) > seconds) {
        insertAt = offset;
        break;
      }
      offset += list.child(i).nodeSize;
    }
    tr.insert(insertAt, item);
  }
  editor.view.dispatch(tr.scrollIntoView());
}
