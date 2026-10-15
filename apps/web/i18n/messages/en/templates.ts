/** Messages for page templates, in English: the source the other languages follow */
export const templates = {
  names: {
    concept: 'Concept',
    video: 'Video',
    article: 'Article',
    tool: 'Tool',
    blank: 'Blank',
  },
  start: {
    label: 'Start with:',
    help: '← → to pick, Enter to fill the page',
  },
  slash: {
    label: 'Template: {name}',
    hint: 'Its sections, here',
    keywords: 'template layout sections',
  },
  outline: {
    empty: '{heading} (empty)',
  },
  sections: {
    oneLine: { heading: 'In one line', hint: 'What is it, in a sentence?' },
    why: { heading: 'Why it exists', hint: 'What problem does it solve? What did people do before?' },
    how: { heading: 'How it works', hint: 'The mechanism: what happens, step by step.' },
    notes: { heading: 'Notes', hint: 'Times from the video and what is said there: [01:25] the idea.' },
    passages: { heading: 'Passages', hint: 'Quote the passages that matter (start a line with >) and say why.' },
    install: { heading: 'Install and use', hint: 'How to install it, then the first thing to do with it.' },
    example: { heading: 'Example', hint: 'The smallest real case.' },
    practice: { heading: 'Practice', hint: 'Something to do with it, now.' },
    pitfalls: { heading: 'Pitfalls', hint: 'What goes wrong, and how to tell.' },
    questions: { heading: 'Questions', hint: 'Question :: Answer, one per line, for review.' },
    sources: { heading: 'Sources', hint: 'Where it came from: links, books, people.' },
  },
  address: {
    video: "Paste the video's address here.",
    article: "Paste the article's address here.",
  },
} as const;
