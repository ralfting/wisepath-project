'use client';

import classes from './MindMap.module.css';

/** The map's progress as a ring, the root's colour inside */
export function ProgressRing({ size, stroke, share }: { size: number; stroke: number; share: number }) {
  const r = size / 2 - stroke / 2 - 1.5;
  const circumference = 2 * Math.PI * r;
  return (
    <svg className={classes.ring} width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="wp-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--mantine-color-teal-5)" />
          <stop offset="100%" stopColor="var(--mantine-color-cyan-5)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mantine-color-gray-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#wp-ring)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference * share} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
