import { apiUrl } from "@/infrastructure/http/ApiClient"

/**
 * Downloads as Markdown (docs/plans/17-markdown-export.md). Plain links the browser follows with the session cookie
 * and saves as a file, so no client code holds the zip. The API checks who may download; the id is only escaped here.
 */

/** One path the learner owns, as a zip of Markdown files */
export const pathDownloadHref = (pathId: string) => apiUrl(`/paths/${encodeURIComponent(pathId)}/export`)

/** Every path the learner owns, one folder each */
export const allPathsDownloadHref = () => apiUrl("/paths/export")
