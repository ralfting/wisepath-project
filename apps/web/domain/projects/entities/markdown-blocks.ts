/**
 * Markdown blocks
 * Splits page markdown into top-level blocks (separated by blank lines,
 * keeping fenced code intact) so each block can be edited on its own.
 */

const FENCE = /^\s*(```|~~~)/;

export function splitBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === '') {
      if (current.length) blocks.push(current.join('\n'));
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current.join('\n'));
  return blocks;
}

export function joinBlocks(blocks: string[]): string {
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Replaces block `index` (or appends when index equals the block count) with new source */
export function replaceBlock(markdown: string, index: number, source: string): string {
  const blocks = splitBlocks(markdown);
  if (index >= blocks.length) blocks.push(source);
  else blocks[index] = source;
  return joinBlocks(blocks);
}
