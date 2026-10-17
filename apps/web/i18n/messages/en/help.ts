/** Messages for Help (what can I do here), in English: the source the other languages follow */
export const help = {
  open: 'Help',
  title: 'What can I do here',
  /** On a clip that waits for the learner, when the system asks for less motion */
  play: 'Play the example',
  enlarge: 'Enlarge',
  enlargeClip: 'Enlarge the example: {title}',
  page: {
    intro: 'A page is free text in markdown, linked to the rest of the path.',
    addPage: {
      title: 'Add a page',
      body: 'Type / on a new line and choose Page, give it a name and press Enter: the new page branches from this one and opens. Or write [[Name]] in the text and click it.',
    },
    videoNotes: {
      title: 'Take notes on a video',
      body: 'Add a YouTube video with the video button (or paste its link on a line of its own). While it plays, press Note at… under it (or N): the video pauses and your note goes under it with the moment, like [01:25]. Clicking a time plays the video from there.',
    },
  },
  map: {
    intro: 'The map is drawn from the links between pages, outward from the path’s main page.',
    addBranch: {
      title: 'Add a page from the map',
      body: 'Point at a page (or focus it) and click its + (or press N), name the new page and press Enter: it branches from that page and opens beside the map.',
    },
    search: {
      title: 'Find a page in this path',
      body: '⌘K (Ctrl K), or the search button, finds pages by title or text; they light up on the map, and Enter opens the one marked.',
    },
    open: {
      title: 'Open a page',
      body: 'Click a page to open it beside the map; ⌘ Enter (Ctrl Enter) opens it full. List shows the same tree as an indented list.',
    },
    keys: {
      title: 'Move with the keyboard',
      body: '→ and ← follow the branches as drawn, ↑ and ↓ move between siblings, Home goes back to the centre, Enter opens a page.',
    },
  },
  home: {
    intro: 'Your paths, grouped by project.',
    newPath: {
      title: 'Start a path',
      body: 'New path asks what you are learning, the project it goes in and its kind; its map opens, ready to write. A project’s + starts one there.',
    },
    projects: {
      title: 'Group paths in projects',
      body: 'New project makes a group. Drag a path onto it to move it, or use Move to in the path’s ⋯ menu. A project’s ⋯ menu renames or deletes it; its paths then go to the default project.',
    },
    kind: {
      title: 'Study or learning path',
      body: 'A Study is open notes with nothing to finish. A Learning path is followed page by page and tracks what you studied. Switch from the path’s ⋯ menu; the studied marks stay.',
    },
  },
} as const;
