'use client';

import { ActionIcon, Menu } from '@mantine/core';
import { IconBoxOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { CALLOUT_KINDS } from '@wisepath/domain/paths';
import type { CalloutKind } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { calloutLook } from '@/ui/Callout/Callout';

interface KindMenuProps {
  readonly kind: CalloutKind;
  /** The kind's name, read out with the button */
  readonly label: string;
  /** How the button shows: the kind's icon, or what the block shows in its place (a done activity's check) */
  readonly look: { readonly color: string; readonly icon: Icon };
  readonly onPick: (kind: CalloutKind) => void;
  readonly onRemove: () => void;
  /** In the page's margin beside the grip (a question's, which has no box), as narrow as the grip */
  readonly inMargin?: boolean;
}

/** A callout's icon as a menu, while the text is editable: another kind, or the box taken away with its text kept */
export function KindMenu({ kind, label, look, onPick, onRemove, inMargin = false }: KindMenuProps) {
  const t = useT();
  const { color, icon: Mark } = look;
  return (
    // Outside the editable text, so clicking it doesn't move the cursor into the icon
    <span contentEditable={false}>
      <Menu position="bottom-start">
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color={color}
            size={inMargin ? 'var(--mantine-spacing-md)' : 'sm'}
            aria-label={t('editor.callout.change', { kind: label })}
          >
            <Mark size={inMargin ? 16 : 20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {CALLOUT_KINDS.map((option) => {
            const { color: optionColor, icon: OptionMark } = calloutLook(option);
            return (
              <Menu.Item
                key={option}
                leftSection={<OptionMark size={16} color={`var(--mantine-color-${optionColor}-light-color)`} />}
                onClick={() => onPick(option)}
                aria-current={option === kind || undefined}
              >
                {t(`editor.callout.kinds.${option}`)}
              </Menu.Item>
            );
          })}
          <Menu.Divider />
          <Menu.Item leftSection={<IconBoxOff size={16} />} onClick={onRemove}>
            {t('editor.callout.remove')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </span>
  );
}
