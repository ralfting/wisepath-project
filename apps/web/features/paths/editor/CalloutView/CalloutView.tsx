'use client';

import { useContext } from 'react';
import type { ReactNode } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Button } from '@mantine/core';
import { IconCheck, IconClipboardCheck, IconGripVertical, IconSquare } from '@tabler/icons-react';
import type { CalloutKind } from '@wisepath/domain/paths';
import { useT } from '@/i18n/I18nProvider';
import { ActivityBlock } from '@/ui/ActivityBlock/ActivityBlock';
import { QuestionBlock } from '@/ui/QuestionBlock/QuestionBlock';
import { Callout, calloutLook } from '@/ui/Callout/Callout';
import { EditorActivitiesContext } from '../activities';
import { calloutsBefore } from '../callout';
import { EditorQuestionsContext } from '../questions';
import { AnswerField } from './AnswerField/AnswerField';
import { KindMenu } from './KindMenu';
import classes from './CalloutView.module.css';

/** A block's kind menu, showing the kind's icon or what the block shows in its place (a done activity's check) */
type MenuFor = (look: ReturnType<typeof calloutLook>) => ReactNode;

/**
 * CalloutView
 * A callout as the editor shows it: the box with its text editable inside,
 * and its icon a menu that changes its kind or takes the box away, leaving
 * the text where it was. An activity, in a learning path, has Mark as done in
 * its header: the reader's own tick, there in a page they may only read too.
 * A question has no box, only the reader's own answer under it, in a study as
 * in a path; its kind menu waits in the margin. While the text is editable a
 * grip in the margin picks the whole block, to copy, cut or delete it, and
 * drags it elsewhere in the page.
 */
export function CalloutView(props: NodeViewProps) {
  const { node, editor, getPos, updateAttributes } = props;
  const t = useT();
  const kind = node.attrs.kind as CalloutKind; // set only from CALLOUT_KINDS, by the parser and the commands
  const label = t(`editor.callout.kinds.${kind}`);

  const pick = () => {
    const at = getPos();
    if (typeof at === 'number') editor.chain().focus().setNodeSelection(at).run();
  };
  const unwrap = () => {
    const at = getPos();
    if (typeof at !== 'number') return;
    editor.chain().focus().setTextSelection({ from: at + 1, to: at + node.nodeSize - 1 }).lift('callout').run();
  };
  const changeKind = (next: CalloutKind) => updateAttributes({ kind: next });
  const menu: MenuFor = (look) =>
    editor.isEditable ? <KindMenu kind={kind} label={label} look={look} onPick={changeKind} onRemove={unwrap} /> : undefined;

  return (
    <NodeViewWrapper className={classes.block} data-bare={kind === 'question' || undefined}>
      {editor.isEditable ? (
        <div className={classes.gutter} contentEditable={false}>
          {/* Not a <button>: Tiptap leaves a button's presses to it, and ProseMirror must see this one to drag the block */}
          <div
            role="button"
            aria-label={t('editor.callout.grip')}
            title={t('editor.callout.grip')}
            className={classes.grip}
            draggable
            data-drag-handle
            onClick={pick}
          >
            <IconGripVertical size={16} aria-hidden />
          </div>
          {kind === 'question' ? (
            <KindMenu kind={kind} label={label} look={calloutLook(kind)} onPick={changeKind} onRemove={unwrap} inMargin />
          ) : null}
        </div>
      ) : null}
      <CalloutBlockView {...props} kind={kind} label={label} menu={menu} />
    </NodeViewWrapper>
  );
}

interface CalloutBlockViewProps extends NodeViewProps {
  readonly kind: CalloutKind;
  readonly label: string;
  readonly menu: MenuFor;
}

/** The block itself, by its kind */
function CalloutBlockView({ editor, getPos, kind, label, menu }: CalloutBlockViewProps) {
  const t = useT();
  const activities = useContext(EditorActivitiesContext);
  const questions = useContext(EditorQuestionsContext);

  if (kind === 'question') {
    const at = getPos();
    const id = questions && typeof at === 'number' ? questions.ids[calloutsBefore(editor.state.doc, at, 'question')] : undefined;
    const saved = questions?.answers.find((answer) => answer.question === id)?.body ?? '';
    const answer = questions && id !== undefined ? <AnswerField id={id} saved={saved} onAnswer={questions.onAnswer} /> : undefined;
    return (
      <QuestionBlock label={label} answered={saved !== ''} answer={answer}>
        <NodeViewContent />
      </QuestionBlock>
    );
  }

  if (kind !== 'activity') {
    return (
      <Callout kind={kind} label={label} marker={menu(calloutLook(kind))}>
        <NodeViewContent />
      </Callout>
    );
  }

  const at = getPos();
  const id = activities && typeof at === 'number' ? activities.ids[calloutsBefore(editor.state.doc, at, 'activity')] : undefined;
  const done = id !== undefined && !!activities?.done.includes(id);
  const tick =
    activities && id !== undefined ? (
      <Button
        size="compact-xs"
        variant={done ? 'light' : 'default'}
        color={done ? 'teal' : 'gray'}
        role="switch"
        aria-checked={done}
        leftSection={done ? <IconCheck size={14} /> : <IconSquare size={14} stroke={1.8} />}
        onClick={() => activities.onToggle(id)}
      >
        {t(done ? 'activity.done' : 'activity.markDone')}
      </Button>
    ) : undefined;

  return (
    <ActivityBlock label={label} done={done} marker={menu(done ? { color: 'teal', icon: IconClipboardCheck } : calloutLook(kind))} action={tick}>
      <NodeViewContent />
    </ActivityBlock>
  );
}
