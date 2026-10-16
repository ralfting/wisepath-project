/** Messages for Help (what can I do here), in English: the source the other languages follow */
export const help = {
  open: 'Help',
  title: 'What can I do here',
  /** Under a clip that waits for the learner, when the system asks for less motion */
  play: 'Play the example',
  page: {
    intro: 'A page is free text in markdown. These are the two things people look for first.',
    addPage: {
      title: 'Add a page',
      body: 'Type / and choose Page, give it a name and press Enter: the new page branches from this one and opens. Or write [[Name]] in the text and click it.',
    },
    videoNotes: {
      title: 'Take notes on a video',
      body: 'Paste a YouTube link on a line of its own. While it plays, press Note at… under it (or N): the video pauses and your note goes under it with the moment, like [01:25]. Clicking a time plays the video from there.',
    },
    more: 'The ? in the editor’s toolbar lists the markdown you can use.',
  },
  map: {
    intro: 'The map is drawn from the links between pages, outward from the path’s main page.',
    tips: {
      add: 'Point at a page (or focus it) and press + or N to add a page branching from it.',
      open: 'Click a page to open it beside the map; ⌘ Enter (Ctrl Enter) opens it full.',
      keys: 'With the keyboard: → and ← follow the branches, ↑ and ↓ move between siblings, Home goes to the centre.',
      search: '⌘K (Ctrl K) finds pages in this path; List shows the same tree as an indented list.',
    },
  },
  home: {
    intro: 'Your paths, grouped by project.',
    tips: {
      newPath: 'New path starts one in the default project; a project’s + starts one there.',
      projects: 'New project makes a group; its ⋯ menu renames or deletes it (its paths move to the default).',
      move: 'Drag a path onto another project to move it, or use Move to in its ⋯ menu.',
      kind: 'A Study is open notes; a Learning path tracks what you studied. Switch from the path’s ⋯ menu.',
    },
  },
} as const;
