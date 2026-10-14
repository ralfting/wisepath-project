'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ActionIcon, Button, Group, Kbd, Popover, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowsMaximize, IconArrowsMinimize, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconPlus, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { youTubeId } from '../extensions';
import { PLAYING, embedUrl, loadYouTubeApi } from './youtubeApi';
import type { YouTubePlayer } from './youtubeApi';
import { addNote, formatTime, noteAt, notesAfter, setActiveNote } from './timestamps';
import type { VideoNote } from './timestamps';
import { registerVideo } from './videos';
import classes from './VideoBlock.module.css';

/**
 * VideoBlock
 * A YouTube video to take notes on. "Add note" (or N) pauses it and asks for a
 * line; Enter puts "[01:25] the line" in the list below the video, in time
 * order, and the video goes on. A time in the text plays it from there. Scrolled
 * away while playing, the video floats small in the corner; fullscreen shows it
 * large with its notes beside it. The note for what is playing is marked.
 */

/** The video most recently used, which N reaches when the focus is on the page itself */
let lastUsed: object | null = null;

export function VideoBlock({ node, editor, getPos }: NodeViewProps) {
  const videoId = youTubeId(node.attrs.src ?? '');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const self = useRef({}).current;
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [inView, setInView] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [composer, setComposer] = useState<{ seconds: number; resume: boolean } | null>(null);
  const [draft, setDraft] = useState('');
  // The embed address is fixed once: changing it would reload the video
  const [src] = useState(() => (videoId ? embedUrl(videoId, Number(node.attrs.start) || 0) : ''));

  const position = useCallback(() => (typeof getPos === 'function' ? getPos() : undefined), [getPos]);
  const [notes, setNotes] = useState<VideoNote[]>([]);
  // The notes follow the text as it changes
  useEffect(() => {
    const read = () => {
      const pos = position();
      setNotes(pos === undefined ? [] : notesAfter(editor.state.doc, pos));
    };
    read();
    editor.on('update', read);
    return () => {
      editor.off('update', read);
    };
  }, [editor, position]);

  // The player, attached to the iframe once the API is in
  useEffect(() => {
    let cancelled = false;
    const iframe = iframeRef.current;
    if (!iframe) return;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(iframe, {
        events: {
          onReady: () => setReady(true),
          onStateChange: (event) => {
            setPlaying(event.data === PLAYING);
            if (event.data === PLAYING) lastUsed = self;
            setTime(player.current?.getCurrentTime() ?? 0);
          },
        },
      });
    });
    // Let go without destroy(), which takes the iframe out of the page: the block owns it
    return () => {
      cancelled = true;
      player.current = null;
    };
  }, [self]);

  // The clock, while playing: for the button's time and the note to mark
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => setTime(player.current?.getCurrentTime() ?? 0), 400);
    return () => clearInterval(tick);
  }, [playing]);

  const current = playing || time > 0 ? noteAt(notes, time) : undefined;
  useEffect(() => {
    if (playing) setActiveNote(editor, current?.pos ?? null);
  }, [editor, playing, current?.pos]);

  const seek = useCallback((seconds: number) => {
    lastUsed = self;
    setDismissed(false);
    const p = player.current;
    if (!p) return;
    p.seekTo(seconds, true);
    p.playVideo();
    setTime(seconds);
  }, [self]);

  useEffect(() => registerVideo(editor, { getPos: position, seek }), [editor, position, seek]);

  // Out of view while playing: it floats in the corner, until it is back in view or closed
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) setDismissed(false);
    }, { threshold: 0.35 });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);
  const floating = playing && !inView && !dismissed && !fullscreen;

  // Our own fullscreen: the video with its notes, which the browser's video-only fullscreen can't show
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen();
  };

  const openComposer = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const resume = p.getPlayerState() === PLAYING;
    if (resume) p.pauseVideo();
    lastUsed = self;
    setDraft('');
    setComposer({ seconds: p.getCurrentTime(), resume });
  }, [self]);

  const closeComposer = (save: boolean) => {
    if (!composer) return;
    const pos = position();
    if (save && pos !== undefined) addNote(editor, pos, composer.seconds, draft);
    if (composer.resume) player.current?.playVideo();
    setComposer(null);
    // Back on the button, where N works again
    requestAnimationFrame(() => addRef.current?.focus());
  };

  // N adds a note: in fullscreen, or with the focus on the page rather than in a field or the video
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey || composer) return;
      const target = event.target as HTMLElement | null;
      // Typing somewhere (a field, the page's text) keeps the n; the block's own controls aren't editable
      if (target?.isContentEditable || target?.closest('input, textarea, select')) return;
      const inStage = !!stageRef.current && document.fullscreenElement === stageRef.current;
      if (!inStage && (document.fullscreenElement || lastUsed !== self)) return;
      event.preventDefault();
      openComposer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [composer, openComposer, self]);

  if (!videoId) return <NodeViewWrapper data-youtube-video />;

  const addButton = (
    <Popover
      opened={composer !== null}
      onChange={(open) => !open && closeComposer(false)}
      position="bottom-start"
      shadow="md"
      radius="md"
      width={360}
      trapFocus
      withinPortal={false}
    >
      <Popover.Target>
        <Tooltip label={<>Pause and write a note <Kbd size="xs">N</Kbd></>} disabled={composer !== null}>
          <Button
            ref={addRef}
            size="compact-sm"
            variant="light"
            leftSection={<IconPlus size={14} />}
            onClick={openComposer}
            disabled={!ready}
            onMouseDown={(event) => event.preventDefault()}
          >
            Note at {formatTime(composer?.seconds ?? time)}
          </Button>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <TextInput
          data-autofocus
          size="sm"
          placeholder="What happens here?"
          aria-label={`Note at ${formatTime(composer?.seconds ?? 0)}`}
          leftSection={<span className={classes.composerTime}>{formatTime(composer?.seconds ?? 0)}</span>}
          leftSectionWidth={64}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event: ReactKeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              closeComposer(true);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              closeComposer(false);
            }
          }}
        />
        <Text size="xs" c="dimmed" mt={6}>
          Enter adds it and the video goes on · Esc cancels
        </Text>
      </Popover.Dropdown>
    </Popover>
  );

  return (
    <NodeViewWrapper className={classes.block} data-youtube-video>
      <div ref={slotRef} className={classes.slot} contentEditable={false}>
        <div ref={stageRef} className={classes.stage} data-floating={floating || undefined} data-fullscreen={fullscreen || undefined} data-notes={(fullscreen && showNotes) || undefined}>
          <div className={classes.screen}>
            <iframe
              ref={iframeRef}
              src={src}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className={classes.iframe}
            />
            {floating && (
              <ActionIcon className={classes.unfloat} size="sm" radius="xl" variant="filled" color="dark" aria-label="Stop floating the video" onClick={() => setDismissed(true)}>
                <IconX size={14} />
              </ActionIcon>
            )}
          </div>
          {fullscreen && (
            <aside className={classes.side} aria-label="Notes on this video">
              <Group justify="space-between" wrap="nowrap" gap="xs" className={classes.sideHead}>
                {addButton}
                <Group gap={4} wrap="nowrap">
                  <ActionIcon variant="subtle" color="gray" onClick={() => setShowNotes((s) => !s)} aria-label={showNotes ? 'Hide notes' : 'Show notes'}>
                    {showNotes ? <IconLayoutSidebarRightCollapse size={18} /> : <IconLayoutSidebarRightExpand size={18} />}
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" onClick={toggleFullscreen} aria-label="Exit fullscreen">
                    <IconArrowsMinimize size={18} />
                  </ActionIcon>
                </Group>
              </Group>
              {showNotes && <NoteList notes={notes} current={current} onSeek={seek} />}
            </aside>
          )}
        </div>
      </div>
      {!fullscreen && (
        <Group gap="xs" mt={8} className={classes.bar} contentEditable={false}>
          {addButton}
          <Tooltip label="Fullscreen, with the notes">
            <ActionIcon variant="subtle" color="gray" onClick={toggleFullscreen} aria-label="Fullscreen, with the notes" disabled={!ready}>
              <IconArrowsMaximize size={17} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </NodeViewWrapper>
  );
}

/** The notes beside the video in fullscreen, in time order: each plays from there; the one playing now is marked */
function NoteList({ notes, current, onSeek }: { notes: ReadonlyArray<VideoNote>; current: VideoNote | undefined; onSeek: (seconds: number) => void }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[data-current]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.pos]);
  if (notes.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        No notes yet. Add one at any moment: the video waits while you write.
      </Text>
    );
  }
  return (
    <ol ref={listRef} className={classes.notes}>
      {[...notes].sort((a, b) => a.seconds - b.seconds).map((note) => (
        <li key={note.pos}>
          <UnstyledButton className={classes.note} data-current={note.pos === current?.pos || undefined} onClick={() => onSeek(note.seconds)}>
            <span className={classes.noteTime}>{note.time}</span>
            <span className={classes.noteText}>{note.text || '—'}</span>
          </UnstyledButton>
        </li>
      ))}
    </ol>
  );
}
