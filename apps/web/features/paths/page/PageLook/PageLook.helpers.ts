import type { Page, Path } from '@wisepath/domain/paths';
import { lookOf } from '@wisepath/domain/paths';

/** The look for turning a page into a module (keeping the colour and icon it shows now) or back */
export function moduleLook(path: Path, page: Page, module: boolean) {
  const look = lookOf(path, page.id);
  return module ? { module: true, color: look.color, icon: page.icon ?? look.icon } : { module: false };
}
