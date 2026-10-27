/** Questions on a page (docs/plans/24-page-questions.md): the reader’s own answer, and what the studied control says of them */
export const question = {
  answer: 'Your answer',
  placeholder: 'Write your answer…',
  left: { one: '{count} question to answer', other: '{count} questions to answer' },
  leftHint: 'Answer the questions on this page to mark it studied. This takes you to the next one.',
  mixedLeft: { one: '{count} left to do', other: '{count} left to do' },
  mixedHint: 'Do the activities and answer the questions on this page to mark it studied. This takes you to the next one.',
} as const;
