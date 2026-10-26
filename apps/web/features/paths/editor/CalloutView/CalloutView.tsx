'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ActionIcon, Menu } from '@mantine/core';
import { IconBoxOff } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import { CALLOUT_KINDS } from '@wisepath/domain/paths';
import type { CalloutKind } from '@wisepath/domain/paths';
import { Callout, calloutLook } from '@/ui/Callout/Callout';

/**
 * CalloutView
 * A callout as the editor shows it: the box with its text editable inside,
 * and its icon a menu that changes its kind or takes the box away, leaving
 * the text where it was.
 */
export function CalloutView({ node, editor, getPos, updateAttributes }: NodeViewProps) {
  const t = useT();
  const kind = node.attrs.kind as CalloutKind; // set only from CALLOUT_KINDS, by the parser and the commands
  const { color, icon: Mark } = calloutLook(kind);
  const label = t(`editor.callout.kinds.${kind}`);

  const unwrap = () => {
    const at = getPos();
    if (typeof at !== 'number') return;
    editor.chain().focus().setTextSelection({ from: at + 1, to: at + node.nodeSize - 1 }).lift('callout').run();
  };

  const marker = editor.isEditable ? (
    // Outside the editable text, so clicking it doesn't move the cursor into the icon
    <span contentEditable={false}>
      <Menu position="bottom-start">
        <Menu.Target>
          <ActionIcon variant="subtle" color={color} size="sm" aria-label={t('editor.callout.change', { kind: label })}>
            <Mark size={20} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {CALLOUT_KINDS.map((option) => {
            const { color: optionColor, icon: OptionMark } = calloutLook(option);
            return (
              <Menu.Item
                key={option}
                leftSection={<OptionMark size={16} color={`var(--mantine-color-${optionColor}-light-color)`} />}
                onClick={() => updateAttributes({ kind: option })}
                aria-current={option === kind || undefined}
              >
                {t(`editor.callout.kinds.${option}`)}
              </Menu.Item>
            );
          })}
          <Menu.Divider />
          <Menu.Item leftSection={<IconBoxOff size={16} />} onClick={unwrap}>
            {t('editor.callout.remove')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </span>
  ) : undefined;

  return (
    <NodeViewWrapper>
      <Callout kind={kind} label={label} marker={marker}>
        <NodeViewContent />
      </Callout>
    </NodeViewWrapper>
  );
}
