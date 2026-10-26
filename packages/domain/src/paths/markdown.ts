/**
 * Reading a page's markdown for what is written in it (review cards, activities): code set aside, and a stable
 * name for a piece of text, the same in the browser and on the server.
 */

/** The markdown with code blocks and inline code blanked out, keeping the lines where they were */
export function withoutCode(markdown: string): string {
  return markdown
    .replace(/^(\s*)(```|~~~)[^\n]*\n[\s\S]*?(?:^\s*\2[^\n]*$|(?![\s\S]))/gm, (block) => block.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`/g, (code) => " ".repeat(code.length))
}

/** Text with its white space collapsed, so re-wrapping a line names the same thing */
export const normalize = (text: string) => text.trim().replace(/\s+/g, " ")

/**
 * A short, stable hash (cyrb53) as hex. Not for security: it only names
 * something written in a page, the same way in the browser and on the server.
 */
export function textHash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
}
