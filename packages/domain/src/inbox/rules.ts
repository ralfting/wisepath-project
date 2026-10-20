import { Effect } from "effect"
import { addPage, asTitle, editPage, findPageByTitle, PageNotFound, withLinkTo } from "../paths/index"
import type { Page, PageId, Path } from "../paths/index"
import type { InboxItem } from "./InboxItem"

/**
 * Filing
 * An Inbox item becomes markdown in a page, written the way the editor writes
 * it: text as paragraphs, an address as a link on its own line, and a moment
 * of a video as a timestamped note in the list right below that video.
 */

type Item = Pick<InboxItem, "text" | "url" | "title" | "videoTime">

/** The id of a YouTube video at this address, or null (written without URL, which the domain doesn't have) */
export function youTubeId(address: string): string | null {
  const found = address.trim().match(/^https?:\/\/([^/?#\s]+)(\/[^?#\s]*)?(\?[^#\s]*)?/i)
  if (!found) return null
  const [, host, path = "/", query = ""] = found
  const hostname = host.toLowerCase().replace(/:\d+$/, "")
  if (hostname === "youtu.be") return path.slice(1).match(/^[\w-]+/)?.[0] ?? null
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(hostname)) return null
  if (path === "/watch") return query.match(/[?&]v=([\w-]+)/)?.[1] ?? null
  return path.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ?? null
}

/** "01:25", or "1:02:15" past an hour, as the editor's timestamps read */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
}

const seconds = (time: string) => time.split(":").reduce((total, part) => total * 60 + Number(part), 0)

/** What the learner wrote, without the address when the text is only that */
const ownText = (item: Item) => {
  const text = item.text.trim()
  return item.url !== undefined && text === item.url.trim() ? "" : text
}

/** The address as a markdown link, named after its title when it has one */
const linkLine = (url: string, title?: string) => {
  const name = title?.trim().replace(/[[\]]/g, "")
  return name ? `[${name}](${url.replace(/[()\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`)})` : `<${url}>`
}

/** The markdown an item adds to a page, on its own */
export function itemMarkdown(item: Item): string {
  const text = ownText(item)
  if (item.url === undefined) return text
  // A YouTube address alone on its line is how the editor stores a video, so it shows as one
  const address = youTubeId(item.url) ? item.url.trim() : linkLine(item.url.trim(), item.title)
  return text ? `${text}\n\n${address}` : address
}

const TIMESTAMPED = /^[-*] \[((?:\d{1,2}:)?[0-5]?\d:[0-5]\d)\]/

/**
 * Adds "- [mm:ss] text" to the notes right below the video's line, where its
 * time puts it among them; starts the list when there is none. Null when the
 * page doesn't have that video.
 */
function addVideoNote(markdown: string, videoId: string, time: number, note: string): string | null {
  const lines = markdown.split("\n")
  const at = lines.findIndex((line) => youTubeId(line) === videoId && /^\S+$/.test(line.trim()))
  if (at < 0) return null

  const line = `- [${formatTime(time)}]${note ? ` ${note}` : ""}`
  // The list starts on the first line after the video that isn't blank, if it is a list
  let start = at + 1
  while (start < lines.length && !lines[start].trim()) start++
  if (start >= lines.length || !/^[-*] /.test(lines[start])) {
    return [...lines.slice(0, at + 1), "", line, ...(start < lines.length ? [""] : []), ...lines.slice(start)].join("\n")
  }

  let insert = start
  while (insert < lines.length && /^[-*] /.test(lines[insert])) {
    const found = lines[insert].match(TIMESTAMPED)
    if (found && seconds(found[1]) > time) break
    insert++
  }
  // Stop where the list ends, so a later list isn't taken for this one
  return [...lines.slice(0, insert), line, ...lines.slice(insert)].join("\n")
}

/** A page's markdown with an item appended at the end, or, for a moment of a video, under that video */
export function appendItem(markdown: string, item: Item): string {
  const videoId = item.url !== undefined ? youTubeId(item.url) : null
  if (videoId && item.videoTime !== undefined) {
    const note = ownText(item).replace(/\s*\n\s*/g, " ") || item.title?.trim() || ""
    const placed = addVideoNote(markdown, videoId, item.videoTime, note)
    if (placed !== null) return placed
    // The page doesn't have the video yet: add it, with the note below. The editor stores a video as its
    // address alone, dropping ?t=, so the moment is kept as the note's timestamp instead
    const withVideo = joinBlocks(markdown, item.url!.trim())
    return addVideoNote(withVideo, videoId, item.videoTime, note) ?? withVideo
  }
  return joinBlocks(markdown, itemMarkdown(item))
}

/**
 * The markdown an item brings to a page where the learner puts it (the / command): as it is, or for a moment
 * of a video, its "- [mm:ss] text" note, after the video when the page doesn't have it yet
 */
export function itemHere(markdown: string, item: Item): string {
  const videoId = item.url !== undefined ? youTubeId(item.url) : null
  if (!videoId || item.videoTime === undefined) return itemMarkdown(item)
  const note = ownText(item).replace(/\s*\n\s*/g, " ") || item.title?.trim() || ""
  const line = `- [${formatTime(item.videoTime)}]${note ? ` ${note}` : ""}`
  const hasVideo = markdown.split("\n").some((l) => youTubeId(l) === videoId && /^\S+$/.test(l.trim()))
  return hasVideo ? line : `${item.url!.trim()}\n\n${line}`
}

const joinBlocks = (markdown: string, block: string) => {
  const before = markdown.trimEnd()
  return before ? `${before}\n\n${block}` : block
}

/**
 * Files an item into one page of a map: the page's text with the item
 * appended, as a page edit the web and the API both apply.
 */
export const fileItem = Effect.fnUntraced(function*(path: Path, pageId: PageId, item: Item, now = new Date()) {
  const page = path.pages.find((p) => p.id === pageId)
  if (!page) return yield* new PageNotFound({ pageId })
  return yield* editPage(path, pageId, { content: appendItem(page.content, item) }, now)
})

/** A title for a page made from an item: its link's title, else its first line, short and free of [[ ]] */
export function titleFor(item: Item, untitled = "From the Inbox"): string {
  const firstLine = ownText(item).split("\n").find((line) => line.trim()) ?? ""
  const raw = item.title?.trim() || firstLine.replace(/^#+\s*|^[-*>]\s*/, "") || item.url || untitled
  const clean = asTitle(raw).replace(/\s+/g, " ").trim()
  return clean.length > 80 ? `${clean.slice(0, 79).trimEnd()}…` : clean
}

/** The title, or "Title (2)", "Title (3)"… when another page has it */
export function freeTitle(pages: ReadonlyArray<Pick<Page, "title">>, title: string): string {
  if (!findPageByTitle(pages, title)) return title
  for (let n = 2; ; n++) {
    const next = `${title} (${n})`
    if (!findPageByTitle(pages, next)) return next
  }
}


/**
 * Makes an item a page of its own, linked from the chosen page: a new page
 * titled from the item, holding it, and a [[link]] to it at the end of the
 * chosen page. Returns the map and the new page's title.
 */
export const makePage = Effect.fnUntraced(function*(
  path: Path,
  fromPageId: PageId,
  item: Item,
  id: PageId,
  options: { readonly untitled?: string; readonly now?: Date } = {}
) {
  const from = path.pages.find((p) => p.id === fromPageId)
  if (!from) return yield* new PageNotFound({ pageId: fromPageId })
  const title = freeTitle(path.pages, titleFor(item, options.untitled))
  const added = yield* addPage(path, { id, title }, options.now)
  const filled = yield* editPage(added.path, id, { content: itemMarkdown(item) }, options.now)
  const linked = yield* editPage(filled, fromPageId, { content: withLinkTo(from.content, title) }, options.now)
  return { path: linked, title }
})
