/** Activities on a page (docs/plans/22-page-activities.md): ticking them, the studied control they hold, their badge */
export const activity = {
  markDone: 'Mark as done',
  done: 'Done',
  left: { one: '{count} activity left', other: '{count} activities left' },
  leftHint: 'Do the activities on this page to mark it studied. This takes you to the next one.',
  badge: {
    has: 'Has activities',
    open: { one: '{count} activity open', other: '{count} activities open' },
    done: 'Activities done',
  },
} as const;
