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
    intro: 'A page is your notes, links and videos, linked to the rest of the path.',
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
    callout: {
      title: 'Put a note in a coloured box',
      steps: {
        a: 'On a new line, type `/` and choose **Info callout**, **Warning callout** or **Danger callout**',
        b: 'Or type `[!info]`, `[!warning]` or `[!danger]` and a space',
        c: 'Write inside the box; <kbd>Enter</kbd> on an empty line leaves it',
      },
      tip: 'Click the box’s **icon** to change its kind, or to remove the box and keep the text.',
    },
    activity: {
      title: 'Ask the learner to do or answer something',
      steps: {
        a: 'On a new line, type `/` and choose **Activity** or **Question**, or type `[!activity]` or `[!question]` and a space',
        b: 'Write inside the box what to do, or what to answer; each reader writes their answer in **Your answer** under a question',
        c: 'In a learning path each reader ticks an activity’s **Mark as done** and answers each question; the page counts as studied once all are done',
      },
      tip: 'Ticks and answers are each reader’s own. Unticking one, or clearing an answer, on a studied page unmarks it; the map shows a clipboard on pages that ask for either.',
    },
    cite: {
      title: 'Cite a page without placing it',
      steps: {
        a: 'Type `@[[` and pick the page, or `/` and choose **Cite a page**',
        b: 'The citation reads quieter than a link: dimmed, dotted, with a quote mark',
        c: 'To switch a link and a citation, point at it and use the button on its card, or put the cursor on it and press <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>L</kbd> (<kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>L</kbd>)',
      },
      tip: 'Only links place pages on the map. A citation draws a dashed grey line between pages already on it, and a page only cited stays with the unlinked pages.',
    },
    moveBranch: {
      title: 'Move a page to another branch',
      steps: {
        a: 'Open the page’s **Related** tab',
        b: 'Beside **Branches from**, click **Change**',
        c: 'Pick the page it should branch from and press <kbd>Enter</kbd>',
      },
      tip: 'Its `[[link]]` moves for you: out of the old page’s text, to the end of the new one’s. Only the pages where the move holds are listed.',
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
  inbox: {
    intro: 'Write things down now, file them later: what you capture waits here.',
    capture: {
      title: 'Capture an idea',
      steps: {
        a: 'Click **Capture**, or press <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Space</kbd> anywhere in WisePath',
        b: 'Write the idea, link or question',
        c: 'Press <kbd>Enter</kbd>: it waits here, newest first',
      },
      tip: 'A pasted link keeps its **title**; a YouTube link with a time keeps the **moment**.',
    },
    file: {
      title: 'Add it to a page',
      steps: {
        a: 'Click **Add to…** on an item',
        b: 'Choose the **path**, then the **page**',
        c: 'The item goes to the **end** of that page and leaves the Inbox',
      },
      tip: 'A video moment goes into the notes **under that video**, as `- [01:25]`.',
    },
    makePage: {
      title: 'Make it a page',
      steps: {
        a: 'Click **Make it a page** on an item',
        b: 'Choose the path and the page to link it from',
        c: 'A new page holds the item, linked from that page',
      },
      tip: 'The new page is named after the link’s title, or the item’s first line.',
    },
    fromPage: {
      title: 'Bring it in from a page',
      steps: {
        a: 'On a page, type `/` and choose **Inbox item**',
        b: 'Pick the item: it goes where the cursor is',
      },
      tip: 'It leaves the Inbox once the page is saved.',
    },
    keys: {
      title: 'Use the keyboard',
      steps: {
        a: '<kbd>↑</kbd> <kbd>↓</kbd> move between items',
        b: '<kbd>A</kbd> adds the item to a page',
        c: '<kbd>D</kbd> deletes it, with **Undo** for a few seconds',
        d: '<kbd>Enter</kbd> opens where it came from',
      },
      tip: 'In the pickers, <kbd>→</kbd> opens a path’s pages and <kbd>←</kbd> goes back.',
    },
  },
  home: {
    intro: 'Your paths, grouped by project.',
    newPath: {
      title: 'Start a path',
      steps: {
        a: 'Click **New path**',
        b: 'Write what you are learning and choose its **project**. It starts as a **Study**',
        c: 'Click **Create path**: its main page opens, ready to write',
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
