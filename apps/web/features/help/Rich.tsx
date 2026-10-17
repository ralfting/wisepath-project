import { Fragment } from 'react';
import { Code, Kbd, Text } from '@mantine/core';
import { parseRich } from './markup';

/** Help's texts with their markup (markup.ts) drawn: bold, code, keys. The messages are ours, never the learner's */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((part, i) =>
        part.kind === 'bold' ? (
          <Text key={i} span fw={700} inherit>
            {part.text}
          </Text>
        ) : part.kind === 'code' ? (
          <Code key={i}>{part.text}</Code>
        ) : part.kind === 'kbd' ? (
          <Kbd key={i} size="xs">
            {part.text}
          </Kbd>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
