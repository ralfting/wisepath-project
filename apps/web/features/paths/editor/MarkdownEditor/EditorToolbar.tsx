'use client';

import type { Editor } from '@tiptap/react';
import { RichTextEditor } from '@mantine/tiptap';
import { IconBrackets, IconColumnInsertRight, IconColumnRemove, IconRowInsertBottom, IconRowRemove, IconTable, IconTableOff } from '@tabler/icons-react';
import { useT } from '@/i18n/I18nProvider';
import classes from './MarkdownEditor.module.css';
import { MarkdownHelp } from './MarkdownHelp';
import { VideoControl } from './VideoControl/VideoControl';

/**
 * The editor's lean toolbar, sticky under the page's header: headings, lists and checklist, code and quote, a video
 * and a page link, everything about tables (its editing controls while the cursor is in one), and the markdown help
 */
export function EditorToolbar({ editor, offset }: { editor: Editor | null; offset: number }) {
  const t = useT();
  return (
    <RichTextEditor.Toolbar sticky stickyOffset={offset} className={classes.toolbar}>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.H2 />
        <RichTextEditor.H3 />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.BulletList />
        <RichTextEditor.OrderedList />
        <RichTextEditor.TaskList />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.CodeBlock />
        <RichTextEditor.Blockquote />
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup>
        {editor && <VideoControl editor={editor} />}
        <RichTextEditor.Control
          onClick={() => editor?.chain().focus().insertContent('[[').run()}
          aria-label={t('editor.toolbar.linkPage')}
          title={t('editor.toolbar.linkPageTitle')}
        >
          <IconBrackets size={16} stroke={1.5} />
        </RichTextEditor.Control>
      </RichTextEditor.ControlsGroup>
      <RichTextEditor.ControlsGroup aria-label={t('editor.table.group')}>
        <RichTextEditor.Control
          onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()}
          disabled={!editor || editor.isActive('table')}
          aria-label={t('editor.table.insert')}
          title={t('editor.table.insert')}
        >
          <IconTable size={16} stroke={1.5} />
        </RichTextEditor.Control>
        {editor?.isActive('table') && (
          <>
            <RichTextEditor.Control onClick={() => editor.chain().focus().addRowAfter().run()} aria-label={t('editor.table.addRow')} title={t('editor.table.addRow')}>
              <IconRowInsertBottom size={16} stroke={1.5} />
            </RichTextEditor.Control>
            <RichTextEditor.Control
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              aria-label={t('editor.table.addColumn')}
              title={t('editor.table.addColumn')}
            >
              <IconColumnInsertRight size={16} stroke={1.5} />
            </RichTextEditor.Control>
            <RichTextEditor.Control onClick={() => editor.chain().focus().deleteRow().run()} aria-label={t('editor.table.deleteRow')} title={t('editor.table.deleteRow')}>
              <IconRowRemove size={16} stroke={1.5} />
            </RichTextEditor.Control>
            <RichTextEditor.Control
              onClick={() => editor.chain().focus().deleteColumn().run()}
              aria-label={t('editor.table.deleteColumn')}
              title={t('editor.table.deleteColumn')}
            >
              <IconColumnRemove size={16} stroke={1.5} />
            </RichTextEditor.Control>
            <RichTextEditor.Control onClick={() => editor.chain().focus().deleteTable().run()} aria-label={t('editor.table.delete')} title={t('editor.table.delete')}>
              <IconTableOff size={16} stroke={1.5} />
            </RichTextEditor.Control>
          </>
        )}
      </RichTextEditor.ControlsGroup>
      <MarkdownHelp />
    </RichTextEditor.Toolbar>
  );
}
