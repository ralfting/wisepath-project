/** Messages for the video area, in English: the source the other languages follow */
export const video = {
  stage: {
    label: 'Video. Space or K plays and pauses, the arrows skip 5 seconds, M mutes, F is fullscreen, N takes a note',
    iframeTitle: 'YouTube video',
  },
  note: {
    at: 'Note at {time}',
    tooltip: 'Pause and write a note',
    placeholder: 'What happens here?',
    hint: 'Enter adds it and the video goes on · Esc cancels',
    key: 'note',
  },
  floating: {
    drag: 'Drag to another corner',
    back: 'Back to the video',
    stop: 'Stop floating the video',
  },
  fullscreen: {
    enter: 'Fullscreen, with the notes',
    exit: 'Exit fullscreen',
    notes: 'Notes on this video',
    hideNotes: 'Hide notes',
    showNotes: 'Show notes',
    empty: 'No notes yet. Add one at any moment: the video waits while you write.',
  },
  failed: "Video notes unavailable: YouTube didn't load.",
  timestamp: {
    play: 'Play video from {time}',
    title: 'Play from {time} (⌘↵ on this line)',
  },
} as const;
