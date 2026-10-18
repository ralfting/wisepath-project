/** Messages for WisePath's administrators (reviewing requests to publish), in English */
export const admin = {
  publications: {
    meta: 'Requests to publish | WisePath',
    title: 'Requests to publish',
    intro: 'Paths their owners asked to list in the catalog. Read each one before deciding.',
    none: 'Nothing is waiting for review.',
    by: 'By {name}',
    pages: { one: '{count} page', other: '{count} pages' },
    askedOn: 'Asked {date}',
    for: 'For: {audience}',
    language: 'Written in {language}',
    read: 'Read it',
    approve: 'Approve',
    decline: 'Decline',
    decided: 'This request was already decided or withdrawn.',
  },
} as const;
