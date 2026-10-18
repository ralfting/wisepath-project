import type { Path } from "./Path"

/** One file of a download: where it goes in the zip and its text */
export interface ExportFile {
  readonly name: string
  readonly content: string
}

/** Long titles are cut so a name stays under what file systems take, with room for the folder and ".md" */
const NAME_MAX = 120

/**
 * A title as a file or folder name every system accepts: no characters Windows or macOS refuse, no control
 * characters, no trailing dots or spaces; the fallback when nothing is left.
 */
export function fileName(title: string, fallback: string): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|\u0000-\u001f\u007f]/g, "-")
    .trim()
    .slice(0, NAME_MAX)
    .replace(/[. ]+$/, "")
  return cleaned || fallback
}

/** Names made unique, ignoring case as macOS and Windows do: a second "Hooks" becomes "Hooks (2)" */
function uniqueNames(names: ReadonlyArray<string>): ReadonlyArray<string> {
  const taken = new Set<string>()
  return names.map((name) => {
    let candidate = name
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${name} (${n})`
    taken.add(candidate.toLowerCase())
    return candidate
  })
}

/** A path as Markdown files, one per page named after its title, with the text exactly as written */
export function markdownFiles(path: Path): ReadonlyArray<ExportFile> {
  const names = uniqueNames(path.pages.map((page) => fileName(page.title, page.id)))
  return path.pages.map((page, index) => ({ name: `${names[index]}.md`, content: page.content }))
}

/** Several paths as Markdown files, one folder per path named after its title */
export function exportFolders(paths: ReadonlyArray<Path>): ReadonlyArray<ExportFile> {
  const folders = uniqueNames(paths.map((path) => fileName(path.title, path.id)))
  return paths.flatMap((path, index) => markdownFiles(path).map((file) => ({ ...file, name: `${folders[index]}/${file.name}` })))
}
