/** Messages for spaced review (the Review page and its counts), in English: the source the other languages follow */
export const review = {
  meta: {
    title: 'Review | WisePath',
  },
  nav: {
    label: 'Review',
    due: { one: '{count} card due today', other: '{count} cards due today' },
  },
  title: 'Review',
  titleIn: 'Review {path}',
  filter: {
    label: 'Cards from',
    all: 'All paths',
  },
  loading: 'Loading cards…',
  unavailable: "Can't reach WisePath right now. Reload the page to try again.",
  left: { one: '{count} card left', other: '{count} cards left' },
  from: 'From {page} · {path}',
  fromLabel: 'Open {page}, where this card was written',
  question: 'Question',
  answer: 'Answer',
  blank: 'blank',
  show: 'Show answer',
  grade: {
    label: 'How well did you remember it?',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    /** The button's accessible name: the grade, its key and when the card comes back */
    full: '{grade}, key {key}, next in {when}',
  },
  done: {
    title: 'Done for today',
    body: { one: 'You reviewed {count} card. Come back tomorrow for more.', other: 'You reviewed {count} cards. Come back tomorrow for more.' },
    back: 'Go to My paths',
  },
  empty: {
    title: 'Nothing to review today',
    body: 'Cards come from your notes. In any page, write a question and its answer on one line, or mark words to hide in a sentence:',
    noCards: 'This path has no cards yet. Write a question and its answer on one line in any of its pages:',
    exampleCard: 'What does a closure keep? :: The variables around it',
    exampleCloze: 'A closure keeps the ==variables== around it.',
  },
  path: {
    cards: { one: '{count} card', other: '{count} cards' },
    due: { zero: 'none due', one: '{count} due', other: '{count} due' },
    review: 'Review',
    reviewLabel: 'Review {path}: {due}',
  },
  errors: {
    notSaved: "A grade couldn't be saved. Check the connection; the card will come back.",
  },
} as const;
