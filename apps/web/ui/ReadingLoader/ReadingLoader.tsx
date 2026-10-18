'use client';

import { useEffect, useState } from 'react';
import { Center, Stack, Text } from '@mantine/core';
import classes from './ReadingLoader.module.css';

/** Most loads finish sooner; showing the reader only past this keeps quick ones from flashing it */
const SHOW_AFTER_MS = 500;

/**
 * A wait worth waiting through: a small reader turning the pages of a book, shown only once the wait passes half a
 * second, and still for those who ask for reduced motion. Drawn in SVG with the theme's colours.
 */
export function ReadingLoader({ label }: { label: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Center component="main" mih="60vh" p="md" role="status" aria-busy>
      {shown && (
        <Stack gap="xs" align="center">
          <svg className={classes.reader} viewBox="0 0 200 200" aria-hidden>
              <g className={classes.body}>
              {/* hair, behind the head */}
              <path d="M52 86 C48 40 152 40 148 86 L152 128 C140 136 124 130 120 120 L80 120 C76 130 60 136 48 128 Z" fill="var(--mantine-color-dark-6)"/>
              {/* body */}
              <path d="M58 200 C58 158 74 138 100 138 C126 138 142 158 142 200 Z" fill="var(--mantine-color-blue-6)"/>
              <path d="M90 140 L100 152 L110 140" fill="none" stroke="var(--mantine-color-blue-8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              {/* head */}
              <ellipse cx="100" cy="86" rx="42" ry="40" fill="var(--mantine-color-orange-1)"/>
              {/* a strand standing up on top */}
              <path className={classes.strand} d="M100 46 C96 34 104 28 112 30 C104 33 102 38 104 46 Z" fill="var(--mantine-color-dark-6)"/>
              {/* bangs */}
              <path d="M58 82 C60 52 80 42 100 42 C122 42 142 54 142 82 C134 70 126 64 116 62 C114 70 108 74 100 76 C102 70 100 64 96 60 C88 66 78 74 58 82 Z" fill="var(--mantine-color-dark-6)"/>
              {/* eyes, large and looking down at the book */}
              <g className={classes.eyes}>
              <ellipse cx="83" cy="95" rx="8.5" ry="10.5" fill="var(--mantine-color-white)"/>
              <ellipse cx="117" cy="95" rx="8.5" ry="10.5" fill="var(--mantine-color-white)"/>
              <g className={classes.pupils}>
              <ellipse cx="83" cy="98" rx="6.5" ry="8" fill="var(--mantine-color-indigo-7)"/>
              <ellipse cx="117" cy="98" rx="6.5" ry="8" fill="var(--mantine-color-indigo-7)"/>
              <ellipse cx="83" cy="99.5" rx="3.6" ry="4.6" fill="var(--mantine-color-dark-6)"/>
              <ellipse cx="117" cy="99.5" rx="3.6" ry="4.6" fill="var(--mantine-color-dark-6)"/>
              <circle cx="85.5" cy="94" r="2.4" fill="var(--mantine-color-white)"/>
              <circle cx="119.5" cy="94" r="2.4" fill="var(--mantine-color-white)"/>
              <circle cx="80.5" cy="102.5" r="1.1" fill="var(--mantine-color-white)"/>
              <circle cx="114.5" cy="102.5" r="1.1" fill="var(--mantine-color-white)"/>
              </g>
              <path d="M73.5 89 Q83 82 92.5 88" fill="none" stroke="var(--mantine-color-dark-6)" strokeWidth="2.6" strokeLinecap="round"/>
              <path d="M107.5 88 Q117 82 126.5 89" fill="none" stroke="var(--mantine-color-dark-6)" strokeWidth="2.6" strokeLinecap="round"/>
              </g>
              {/* eyebrows */}
              <path d="M76 79 Q83 76 90 78" fill="none" stroke="var(--mantine-color-dark-4)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M110 78 Q117 76 124 79" fill="none" stroke="var(--mantine-color-dark-4)" strokeWidth="1.8" strokeLinecap="round"/>
              {/* cheeks and mouth */}
              <ellipse cx="72" cy="106" rx="6" ry="3.5" fill="var(--mantine-color-pink-3)" opacity=".55"/>
              <ellipse cx="128" cy="106" rx="6" ry="3.5" fill="var(--mantine-color-pink-3)" opacity=".55"/>
              <path d="M95 112 Q100 116 105 112" fill="none" stroke="var(--mantine-color-dark-4)" strokeWidth="2" strokeLinecap="round"/>
              {/* the open book, held up */}
              <path d="M56 140 L100 146 L144 140 L146 176 L100 182 L54 176 Z" fill="var(--mantine-color-teal-6)"/>
              <path d="M60 138 L100 144 L100 178 L60 172 Z" fill="var(--mantine-color-white)" stroke="var(--mantine-color-gray-4)" strokeWidth="1"/>
              <path d="M140 138 L100 144 L100 178 L140 172 Z" fill="var(--mantine-color-white)" stroke="var(--mantine-color-gray-4)" strokeWidth="1"/>
              <g stroke="var(--mantine-color-gray-4)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M67 149 L93 152 M67 156 L93 159 M67 163 L88 165.5"/>
              <path d="M107 152 L133 149 M107 159 L133 156 M107 166 L128 163.5"/>
              </g>
              {/* the page that turns, from right to left */}
              <path className={classes.flip} d="M140 138 L100 144 L100 178 L140 172 Z" fill="var(--mantine-color-gray-2)" stroke="var(--mantine-color-gray-4)" strokeWidth="1"/>
              <path className={classes.flipShade} d="M60 138 L100 144 L100 178 L60 172 Z" fill="var(--mantine-color-dark-4)"/>
              <line x1="100" y1="144" x2="100" y2="178" stroke="var(--mantine-color-teal-8)" strokeWidth="2"/>
              {/* hands on the book */}
              <ellipse cx="58" cy="164" rx="8" ry="9" fill="var(--mantine-color-orange-1)" stroke="var(--mantine-color-orange-2)"/>
              <ellipse cx="142" cy="164" rx="8" ry="9" fill="var(--mantine-color-orange-1)" stroke="var(--mantine-color-orange-2)"/>
              </g>
          </svg>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        </Stack>
      )}
    </Center>
  );
}
