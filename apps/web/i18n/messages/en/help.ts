/**
 * Messages for Help (what can I do here), in English: the source the other languages follow.
 * Topic texts are short steps and a tip, with light markup (features/help/markup.ts):
 * **bold** for what the screen shows, `code` for what is typed, <kbd>Key</kbd> for keys.
 */
export const help = {
  open: 'Help',
  title: 'What can I do here',
  /** The label before a topic's tip */
  tip: 'Tip',
  /** On a clip that waits for the learner, when the system asks for less motion */
  play: 'Play the example',
  enlarge: 'Enlarge',
  enlargeClip: 'Enlarge the example: {title}',
  page: {
    intro: 'A page is free text in markdown, linked to the rest of the path.',
    addPage: {
      title: 'Add a page',
      steps: {
        a: 'On a new line, type `/`',
        b: 'Choose **Page**',
        c: 'Type its name and press <kbd>Enter</kbd>: the new page **opens**, linked from this one',
      },
      tip: 'Or write `[[Name]]` in the text and click it. <kbd>⌘</kbd> <kbd>Enter</kbd> creates the page and **stays** here.',
    },
    videoNotes: {
      title: 'Take notes on a video',
      steps: {
        a: 'Click the **video** button in the toolbar and paste a YouTube link',
        b: 'Play the video',
        c: 'Press **Note at…** under it (or <kbd>N</kbd>): the video **pauses**',
        d: 'Write and press <kbd>Enter</kbd>: the note keeps the moment, like `[01:25]`',
      },
      tip: 'Click a time to play the video **from there**.',
    },
  },
  map: {
    intro: 'The map is drawn from the links between pages, outward from the path’s main page.',
    addBranch: {
      title: 'Add a page from the map',
      steps: {
        a: 'Point at a page (or focus it)',
        b: 'Click its **+** (or press <kbd>N</kbd>)',
        c: 'Name the new page and press <kbd>Enter</kbd>',
      },
      tip: 'The new page **branches from** that one and opens beside the map.',
    },
    search: {
      title: 'Find a page in this path',
      steps: {
        a: 'Press <kbd>⌘</kbd> <kbd>K</kbd> or click **search**',
        b: 'Type: the pages that match **light up** on the map',
        c: '<kbd>Enter</kbd> opens the page marked',
      },
      tip: '<kbd>↑</kbd> <kbd>↓</kbd> move between the results.',
    },
    open: {
      title: 'Open a page',
      steps: {
        a: '**Click** a page: it opens beside the map',
        b: '<kbd>⌘</kbd> <kbd>Enter</kbd> opens it **full**',
      },
      tip: '**List** shows the same pages as an indented list.',
    },
    keys: {
      title: 'Move with the keyboard',
      steps: {
        a: '<kbd>→</kbd> <kbd>←</kbd> follow the branches',
        b: '<kbd>↑</kbd> <kbd>↓</kbd> move between pages side by side',
        c: '<kbd>Home</kbd> goes back to the centre',
        d: '<kbd>Enter</kbd> opens the page',
      },
      tip: 'Click the map first, or <kbd>Tab</kbd> to it.',
    },
  },
  home: {
    intro: 'Your paths, grouped by project.',
    newPath: {
      title: 'Start a path',
      steps: {
        a: 'Click **New path**',
        b: 'Write what you are learning and choose its **project**',
        c: 'Choose **Study** or **Learning path** and create it: its map opens',
      },
      tip: 'A project’s **+** starts a path right in it.',
    },
    projects: {
      title: 'Group paths in projects',
      steps: {
        a: 'Click **New project** and name it',
        b: '**Drag** a path onto it (or **⋯** › **Move to**)',
        c: 'Its **⋯** menu **renames** or **deletes** it',
      },
      tip: 'Deleting a project moves its paths to the **default** one: nothing is lost.',
    },
    kind: {
      title: 'Study or learning path',
      steps: {
        a: '**Study**: open notes, nothing to finish',
        b: '**Learning path**: followed page by page, tracking what you studied',
      },
      tip: 'Switch in the path’s **⋯** menu; what you marked as studied **stays**.',
    },
  },
} as const;
