'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatTime } from '../timestamps';
import classes from './VideoBlock.module.css';
import { FloatingBar } from './FloatingBar';
import { FullscreenNotes } from './FullscreenNotes';
import { NoteButton } from './NoteButton';
import { NoteComposer } from './NoteComposer';
import { NotePopover } from './NotePopover';
import { VideoBar } from './VideoBar';
import { useVideoBlock } from './useVideoBlock';

/**
 * A YouTube video to take notes on. "Note at" (or N on the video) pauses it
 * and asks for a line; Enter puts "[01:25] the
 * line" in the list below the video, in time order, and the video goes on. A
 * time in the text plays it from there. Scrolled away while playing, the video
 * floats small in a corner, dragged to whichever suits; fullscreen shows it
 * large with its notes beside it. The note for what is playing is marked.
 *
 * A click on the video leaves the focus inside YouTube's frame, where its own
 * controls and keys work and the page's don't. Taking it back at once would
 * close YouTube's menus (settings, captions, volume), so the block takes it
 * back once one of them has done its part (the volume, the captions or the
 * speed changed; the video started or paused), or when the pointer leaves
 * the video. With the focus on the block it answers YouTube's keys (Space or
 * K, ← →, M, F) as well as N.
 */
export function VideoBlock({ node, editor, getPos }: NodeViewProps) {
  const t = useT();
  const { videoId, src, iframe, slot, stage, hasKeyboard, player, notes, floating, fullscreen, visibility } = useVideoBlock({ node, editor, getPos });
  if (!videoId) return <NodeViewWrapper data-youtube-video />;

  const { ready, failed, time } = player.state;
  const { composer, draft } = notes;
  const seconds = composer?.seconds ?? time;
  // The popup sits by whichever "Note" button is on screen: the bar, the fullscreen column or the floating video
  const anchor = fullscreen.fullscreen ? 'side' : floating.floating ? 'float' : 'bar';
  const notePopover = (where: typeof anchor, target: ReactNode) => (
    <NotePopover opened={composer !== null && anchor === where} seconds={composer?.seconds ?? 0} draft={draft} onDraft={notes.setDraft} onClose={notes.closeComposer}>
      {target}
    </NotePopover>
  );
  const noteButton = <NoteButton seconds={seconds} writing={composer !== null} ready={ready} onOpen={notes.openComposer} />;

  return (
    <NodeViewWrapper className={classes.block} data-youtube-video>
      <div ref={slot} className={classes.slot} contentEditable={false}>
        <div
          ref={stage}
          tabIndex={-1}
          aria-label={t('video.stage.label')}
          className={classes.stage}
          data-floating={floating.floating || undefined}
          data-corner={floating.floating ? floating.corner : undefined}
          data-dragging={floating.drag ? true : undefined}
          data-fullscreen={fullscreen.fullscreen || undefined}
          data-notes={(fullscreen.fullscreen && fullscreen.showNotes) || undefined}
          style={floating.style}
        >
          {floating.floating && (
            <FloatingBar
              seconds={seconds}
              onDrag={floating.startDrag}
              onNote={notes.openComposer}
              onBack={() => slot.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
              onStop={visibility.dismiss}
              notePopover={(target) => notePopover('float', target)}
            />
          )}
          <div className={classes.screen}>
            <iframe
              ref={iframe}
              src={src}
              title={t('video.stage.iframeTitle')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className={classes.iframe}
            />
          </div>
          {/* In fullscreen the note is written in the middle of the screen, over the paused picture */}
          {fullscreen.fullscreen && composer && (
            <div className={classes.centre} onMouseDown={(event) => event.target === event.currentTarget && notes.closeComposer(false)}>
              <div className={classes.centreCard} role="dialog" aria-label={t('video.note.at', { time: formatTime(composer.seconds) })}>
                <NoteComposer size="lg" seconds={composer.seconds} draft={draft} onDraft={notes.setDraft} onClose={notes.closeComposer} />
              </div>
            </div>
          )}
          {fullscreen.fullscreen && (
            <FullscreenNotes
              noteButton={noteButton}
              showNotes={fullscreen.showNotes}
              notes={notes.notes}
              current={notes.current}
              onToggleNotes={fullscreen.toggleNotes}
              onExit={fullscreen.toggle}
              onSeek={player.operations.seek}
            />
          )}
        </div>
      </div>
      {!fullscreen.fullscreen && (
        <VideoBar
          failed={failed}
          ready={ready}
          hasKeyboard={hasKeyboard}
          noteButton={notePopover('bar', noteButton)}
          onRetry={player.operations.retry}
          onFullscreen={fullscreen.toggle}
        />
      )}
    </NodeViewWrapper>
  );
}
