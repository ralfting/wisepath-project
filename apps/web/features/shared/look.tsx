import type { PageColor, PageIcon } from '@wisepath/domain/paths';
import {
  IconBolt,
  IconBook,
  IconBox,
  IconCode,
  IconCube,
  IconDatabase,
  IconFlask,
  IconLock,
  IconNetwork,
  IconPuzzle,
  IconRocket,
  IconRoute,
  IconSchool,
  IconServer,
  IconStack2,
  IconWorld,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

/**
 * Look
 * A page's colour is a Mantine colour name and its icon a Tabler icon; these
 * helpers turn the domain's names into CSS variables and components.
 */

export const pageIcons: Record<PageIcon, Icon> = {
  book: IconBook,
  box: IconBox,
  cube: IconCube,
  database: IconDatabase,
  rocket: IconRocket,
  lock: IconLock,
  network: IconNetwork,
  flask: IconFlask,
  code: IconCode,
  server: IconServer,
  bolt: IconBolt,
  puzzle: IconPuzzle,
  layers: IconStack2,
  world: IconWorld,
  route: IconRoute,
  school: IconSchool,
};

/** var(--mantine-color-<color>-<shade>) */
export const shade = (color: PageColor, n: number) => `var(--mantine-color-${color}-${n})`;

export function PageGlyph({ icon, size = 18, stroke = 1.8 }: { icon: PageIcon; size?: number; stroke?: number }) {
  const Glyph = pageIcons[icon];
  return <Glyph size={size} stroke={stroke} aria-hidden="true" />;
}
