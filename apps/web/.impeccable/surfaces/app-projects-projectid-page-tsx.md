---
version: 1
slug: "app-projects-projectid-page-tsx"
primary_target: "app/projects/[projectId]/page.tsx"
related_targets: ["app/projects/[projectId]/pages/[pageId]/page.tsx"]
---

# Project map and page editor (Star Atlas)

Scope: the project view at `app/projects/[projectId]` (Map and List tabs, selection panel) and the full-screen page editor at `app/projects/[projectId]/pages/[pageId]`. Visitor mode: Operate.

Audience and job: an author builds a project: creates pages, writes free markdown in them, and connects related pages. Typical project: 20–30 pages. The map is for navigating, creating and connecting; opening a page goes to the full-screen markdown editor with its connections beside it. Connections are undirected "related" links. Progress is discreet: a per-page studied flag and a counter; no computed next page. No page grouping for now.

Constraints: no projects API yet; data lives in a client store persisted to localStorage, seeded with a sample project that reads as sample.

## Direction contract

THESIS: The project is a star chart the author draws: every page is a star placed by hand, every connection an asterism line drawn between two stars, and the red finder rings sit on whatever page is selected. Refuses the node-editor canvas of rounded cards, bezier edges and minimap.

OWN-WORLD: Atlas-blue chart field (#1B3A6B) framed by a pale cool shell (#E9EEF5 / #FBFCFE), porcelain star ink (#F4F7FB), coordinate grid hairlines (#2F5084) with Roman column ticks. Finder red is split for contrast: finder (#CE392C) for the primary action and text on light ground, finder-glow (#EE6A5C) for rings on the chart; red is spent only on the selection rings, the connection being drawn, and the primary action. Atkinson Hyperlegible for the UI; Spectral italic for star names and page titles. Filled star = studied, open ring = not studied, star size = how much is written. State is encoded once. The grid is a real, toggleable armature.

STORY: The author sees the whole subject as a sky, double-clicks empty sky to add a page, drags from a star's handle to another star to connect them, and opens a page to write it; back on the map, the new star and line are there.

FIRST VIEWPORT: 56px top bar (WisePath, breadcrumb, Map/List tabs, page search, New page, "10 of 25 studied"). Chart fills the left, inset 16px, tools top-left (New page hint, Fit, zoom, Grid), legend bottom-left. 400px right panel for the selected page: title, studied flag, excerpt of its markdown, connections with add/remove, and "Open page" as the primary action. Editor: full-screen, title in Spectral italic, Write/Preview tabs over the markdown, connections column on the right.

FORM: Star Atlas (printed star atlases, Norton / Tirion), candidate 7 of 7 on the ordered list, seed key 9b5a262d. Signature interaction: drawing a connection: a red line follows the pointer from the selected star's handle and snaps to the target star, which becomes a new asterism line; the finder rings settle onto each newly selected star.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: page grouping (constellations), label rule beyond ~30 pages, auth gating of the routes once the projects API exists, server persistence.
