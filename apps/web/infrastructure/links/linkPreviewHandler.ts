import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { Effect, Option, Schema } from "effect"
import { HttpEffect, HttpServerRequest, HttpServerResponse } from "effect/http"
import { LinkPreview } from "@wisepath/domain/projects"

/**
 * GET /api/link-preview?url=<https url>
 * Returns a LinkPreview read from a page's meta tags.
 * Fetches user-supplied URLs, so it only allows public http(s) hosts,
 * caps time and size, and never follows redirects to private addresses.
 */

const TIMEOUT_MS = 5000
const MAX_BYTES = 512 * 1024
const MAX_REDIRECTS = 3

/** The link can't be previewed; the reason goes back to the caller */
class PreviewFailed extends Schema.TaggedError<PreviewFailed>()("PreviewFailed", {
  reason: Schema.String
}) {}

const fail = (reason: string) => Effect.fail(new PreviewFailed({ reason }))

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase()
    if (a === "::1" || a === "::") return true
    if (a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80")) return true
    const mapped = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  const [a, b] = address.split(".").map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

const publicUrl = Effect.fn("linkPreview.publicUrl")(function*(raw: string, base?: URL) {
  const url = yield* Effect.try({
    try: () => new URL(raw, base),
    catch: () => new PreviewFailed({ reason: "Invalid url" })
  })
  if (url.protocol !== "http:" && url.protocol !== "https:") return yield* fail("Only http and https links")
  if (url.username || url.password) return yield* fail("Credentials in URL")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return yield* fail("Private host")
  const addresses = isIP(host)
    ? [{ address: host }]
    : yield* Effect.tryPromise({
      try: () => lookup(host, { all: true }),
      catch: () => new PreviewFailed({ reason: "Unknown host" })
    })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    return yield* fail("Private host")
  }
  return url
})

/** Reads at most MAX_BYTES of the body; the <head> is all we need */
const readHead = (response: Response) =>
  Effect.tryPromise({
    try: async () => {
      const reader = response.body?.getReader()
      if (!reader) return ""
      const chunks: Array<Uint8Array> = []
      let size = 0
      while (size < MAX_BYTES) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        size += value.length
      }
      await reader.cancel().catch(() => undefined)
      return Buffer.concat(chunks).toString("utf8")
    },
    catch: () => new PreviewFailed({ reason: "Body unreadable" })
  })

const fetchHtml = Effect.fn("linkPreview.fetchHtml")(function*(start: string) {
  let url = yield* publicUrl(start)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const target = url
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(target, {
          redirect: "manual",
          signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
          headers: { "user-agent": "WisePathLinkPreview/1.0", accept: "text/html" }
        }),
      catch: () => new PreviewFailed({ reason: "Fetch failed" })
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) return yield* fail("Redirect without location")
      url = yield* publicUrl(location, url)
      continue
    }
    if (!response.ok) return yield* fail(`Status ${response.status}`)
    if (!(response.headers.get("content-type") ?? "").includes("text/html")) return yield* fail("Not HTML")
    return { html: yield* readHead(response), url }
  }
  return yield* fail("Too many redirects")
})

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim()
}

function metaContent(html: string, keys: Array<string>): string | null {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    )
    const match = html.match(pattern)
    const value = match?.[1] ?? match?.[2]
    if (value) return decodeEntities(value)
  }
  return null
}

/** Reads title, description, site name and favicon from the page's HTML */
export function readPreview(html: string, url: URL): LinkPreview {
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
  const iconHref = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1]
  const favicon = new URL(iconHref ?? "/favicon.ico", url)
  return {
    title: metaContent(html, ["og:title", "twitter:title"]) ?? (titleTag ? decodeEntities(titleTag) : null),
    description: metaContent(html, ["og:description", "description", "twitter:description"]),
    siteName: metaContent(html, ["og:site_name"]) ?? url.hostname.replace(/^www\./, ""),
    favicon: favicon.protocol === "https:" || favicon.protocol === "http:" ? favicon.toString() : null
  }
}

const respondWithPreview = HttpServerResponse.schemaJson(LinkPreview)

const linkPreview = Effect.gen(function*() {
  const request = yield* HttpServerRequest.HttpServerRequest
  const raw = HttpServerRequest.toURL(request).pipe(
    Option.flatMapNullishOr((url) => url.searchParams.get("url"))
  )
  if (Option.isNone(raw)) return yield* HttpServerResponse.json({ error: "Missing url" }, { status: 400 })
  const { html, url } = yield* fetchHtml(raw.value)
  return yield* respondWithPreview(readPreview(html, url), {
    headers: { "cache-control": "public, max-age=86400" }
  })
}).pipe(
  Effect.catchTag("PreviewFailed", (error) => HttpServerResponse.json({ error: error.reason }, { status: 422 }))
)

/** The route as a Web Request handler for Next.js */
export const linkPreviewHandler = HttpEffect.toWebHandler(linkPreview)
