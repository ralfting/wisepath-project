'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ActionIcon, Button, Group, Kbd, Popover, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowBackUp,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconGripHorizontal,
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { youTubeId } from '../extensions';
import { LOAD_TIMEOUT_MS, PLAYING, embedUrl, loadYouTubeApi } from './youtubeApi';
import type { YouTubePlayer } from './youtubeApi';
import { addNote, formatTime, noteAt, notesAfter, setActiveNote } from './timestamps';
import type { VideoNote } from './timestamps';
import { registerVideo } from './videos';
import classes from './VideoBlock.module.css';

/**
 * VideoBlock
 * A YouTube video to take notes on. "Note at" (N on the video, ⌥N while
 * writing below it) pauses it and asks for a line; Enter puts "[01:25] the
 * line" in the list below the video, in time order, and the video goes on. A
 * time in the text plays it from there. Scrolled away while playing, the video
 * floats small in a corner, dragged to whichever suits; fullscreen shows it
 * large with its notes beside it. The note for what is playing is marked.
 *
 * Keys pressed inside YouTube's frame never reach the page, so a click on the
 * video hands the focus back to the block, which then answers YouTube's own
 * keys (Space or K, ← →, F) as well as N.
 */

/** The video most recently used, which N reaches when the focus is on the page itself */
let lastUsed: object | null = null;

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNER_KEY = 'wp-video-corner';
/** Where the floating video went last time, for this viewer */
function savedCorner(): Corner {
  try {
    const c = localStorage.getItem(CORNER_KEY);
    return c === 'tl' || c === 'tr' || c === 'bl' || c === 'br' ? c : 'br';
  } catch {
    return 'br';
  }
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function VideoBlock({ node, editor, getPos }: NodeViewProps) {
  const videoId = youTubeId(node.attrs.src ?? '');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const self = useRef({}).current;
  const [ready, setReady] = useState(false);
  // YouTube didn't answer (offline, blocked): the notes can't follow the video, and the block says so
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [inView, setInView] = useState(true);
  const inViewRef = useRef(true);
  const [dismissed, setDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  // Opened from the page's text (⌥N), the cursor goes back there when the note is done
  const [composer, setComposer] = useState<{ seconds: number; resume: boolean; fromText: boolean } | null>(null);
  const [corner, setCorner] = useState<Corner>('br');
  useEffect(() => setCorner(savedCorner()), []);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const hasKeyboard = useMediaQuery('(hover: hover) and (pointer: fine)', true);
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

  // The player, attached to the iframe once the API is in. Neither the API nor the video answering in time
  // counts as failed; Retry reloads both
  useEffect(() => {
    let cancelled = false;
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (attempt > 0) iframe.src = src;
    const timer = setTimeout(() => !cancelled && setFailed(true), LOAD_TIMEOUT_MS + 3000);
    const fail = () => {
      if (cancelled) return;
      clearTimeout(timer);
      setFailed(true);
    };
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(iframe, {
        events: {
          onReady: () => {
            clearTimeout(timer);
            setFailed(false);
            setReady(true);
          },
          onStateChange: (event) => {
            setPlaying(event.data === PLAYING);
            if (event.data === PLAYING) lastUsed = self;
            setTime(player.current?.getCurrentTime() ?? 0);
          },
        },
      });
    }, fail);
    // Let go without destroy(), which takes the iframe out of the page: the block owns it
    return () => {
      cancelled = true;
      clearTimeout(timer);
      player.current = null;
    };
  }, [self, attempt, src]);

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


  // Out of view while playing: it floats in the corner, until it is back in view or closed
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      inViewRef.current = entry.isIntersecting;
      if (entry.isIntersecting) setDismissed(false);
    }, { threshold: 0.35 });
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);
  // Paused for a note it stays afloat, so the popup shows where the video is
  const floating = (playing || !!composer?.resume) && !inView && !dismissed && !fullscreen;

  // The corners are those of the area the text is in (the page beside the sidebar, or the drawer), not the
  // window's. The drawer moves what is fixed inside it to its own box, so that offset comes off
  const [place, setPlace] = useState<CSSProperties>({});
  useEffect(() => {
    if (!floating) return;
    const measure = () => {
      const stage = stageRef.current;
      const slot = slotRef.current;
      const area = slot?.closest('.mantine-Drawer-content, .mantine-AppShell-main')?.getBoundingClientRect();
      if (!stage || !slot || !area) return;
      const bottomOf = (selector: string, within: ParentNode = document) => within.querySelector(selector)?.getBoundingClientRect().bottom ?? 0;
      // What of the area is on screen: past the sidebar, below the top bar and the editor's toolbar that stays up
      const visible = {
        left: Math.max(area.left, document.querySelector('.mantine-AppShell-navbar')?.getBoundingClientRect().right ?? 0, 0),
        right: Math.min(area.right, window.innerWidth),
        top: Math.max(area.top, 0, bottomOf('.mantine-AppShell-header'), bottomOf('.mantine-RichTextEditor-toolbar', slot.closest('.mantine-RichTextEditor-root') ?? document)),
        bottom: Math.min(area.bottom, window.innerHeight),
      };
      // Fixed inside the drawer means fixed to the drawer's box, not the window's
      const box = stage.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const gap = 16;
      setPlace({
        ...(corner[0] === 't' ? { top: visible.top + gap - box.top } : { bottom: box.bottom - visible.bottom + gap }),
        ...(corner[1] === 'l' ? { left: visible.left + gap - box.left } : { right: box.right - visible.right + gap }),
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [floating, corner]);

  // Our own fullscreen: the video with its notes, which the browser's video-only fullscreen can't show
  useEffect(() => {
    const onChange = () => {
      const on = !!stageRef.current && document.fullscreenElement === stageRef.current;
      setFullscreen(on);
      // The button that opened it goes away: the video takes the focus, so its keys work from the start
      if (on) {
        lastUsed = self;
        stageRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [self]);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen();
  };
  const toggleFullscreenRef = useRef(toggleFullscreen);
  toggleFullscreenRef.current = toggleFullscreen;

  // The floating video moves with the pointer, then settles in the nearest corner
  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    const start = { x: event.clientX, y: event.clientY };
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => setDrag({ x: e.clientX - start.x, y: e.clientY - start.y });
    const end = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      const box = stageRef.current?.getBoundingClientRect();
      setDrag(null);
      if (!box || (Math.abs(e.clientX - start.x) < 4 && Math.abs(e.clientY - start.y) < 4)) return;
      const next: Corner = `${box.top + box.height / 2 < window.innerHeight / 2 ? 't' : 'b'}${box.left + box.width / 2 < window.innerWidth / 2 ? 'l' : 'r'}`;
      setCorner(next);
      try {
        localStorage.setItem(CORNER_KEY, next);
      } catch {
        // Private mode: the corner holds for this page only
      }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const openComposer = useCallback((fromText = false) => {
    const p = player.current;
    if (!p) return;
    const resume = p.getPlayerState() === PLAYING;
    if (resume) p.pauseVideo();
    lastUsed = self;
    // Paused out of view, nothing floats: bring the video to where the note is written
    if (!resume && !inViewRef.current) slotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setDraft('');
    setComposer({ seconds: p.getCurrentTime(), resume, fromText });
  }, [self]);

  useEffect(
    () => registerVideo(editor, { getPos: position, seek, openNote: () => openComposer(true) }),
    [editor, position, seek, openComposer],
  );

  const closeComposer = (save: boolean) => {
    if (!composer) return;
    const pos = position();
    // Nothing written, nothing added: an Enter by mistake leaves the list as it was
    if (save && pos !== undefined && draft.trim()) addNote(editor, pos, composer.seconds, draft);
    if (composer.resume) player.current?.playVideo();
    const { fromText } = composer;
    setComposer(null);
    // Back where the note was asked for: the text, or the video itself, where its keys (← →, Space, N) work again
    requestAnimationFrame(() => (fromText ? editor.commands.focus() : stageRef.current?.focus({ preventScroll: true })));
  };

  // A click on the video puts the focus inside YouTube's frame, where keys never reach the page: hand it back
  // to the block, which answers YouTube's keys itself
  useEffect(() => {
    const onBlur = () =>
      setTimeout(() => {
        if (document.activeElement !== iframeRef.current) return;
        lastUsed = self;
        stageRef.current?.focus({ preventScroll: true });
      }, 250);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [self]);

  // YouTube's keys on the block. Listened to on the element itself, ahead of the editor, which would move
  // its cursor on the arrows
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onKey = (event: KeyboardEvent) => {
      const p = player.current;
      const target = event.target as HTMLElement;
      if (!p || event.metaKey || event.ctrlKey || event.altKey) return;
      // On the video or any of its buttons (the notes beside it in fullscreen too); a field keeps its keys
      if (!stage.contains(target) || target.closest('input, textarea, select') || target.isContentEditable) return;
      const key = event.key.toLowerCase();
      // Space on a button presses it; K always plays and pauses
      if (key === ' ' && target !== stage) return;
      if (key === ' ' || key === 'k') {
        if (p.getPlayerState() === PLAYING) p.pauseVideo();
        else p.playVideo();
      } else if (key === 'arrowleft' || key === 'arrowright') {
        const to = Math.max(0, p.getCurrentTime() + (key === 'arrowleft' ? -5 : 5));
        p.seekTo(to, true);
        setTime(to);
      } else if (key === 'f') {
        toggleFullscreenRef.current();
      } else {
        return;
      }
      event.preventDefault();
    };
    stage.addEventListener('keydown', onKey);
    return () => stage.removeEventListener('keydown', onKey);
  }, []);

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

  // The popup sits by whichever "Note" button is on screen: the bar, the fullscreen column or the floating video
  const anchor = fullscreen ? 'side' : floating ? 'float' : 'bar';
  const notePopover = (where: typeof anchor, target: ReactNode) => (
    <Popover
      opened={composer !== null && anchor === where}
      onChange={(open) => !open && closeComposer(false)}
      position="bottom-start"
      shadow="md"
      radius="md"
      width={360}
      trapFocus
      withinPortal={false}
    >
      <Popover.Target>{target}</Popover.Target>
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
  const noteButton = (
    <Tooltip label={<>Pause and write a note <Kbd size="xs">N</Kbd></>} disabled={composer !== null}>
      <Button
        ref={addRef}
        size="compact-sm"
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() => openComposer()}
        disabled={!ready}
        onMouseDown={(event) => event.preventDefault()}
      >
        Note at {formatTime(composer?.seconds ?? time)}
      </Button>
    </Tooltip>
  );
  const alt = isMac() ? '⌥' : 'Alt+';
  const mod = isMac() ? '⌘' : 'Ctrl+';

  return (
    <NodeViewWrapper className={classes.block} data-youtube-video>
      <div ref={slotRef} className={classes.slot} contentEditable={false}>
        <div
          ref={stageRef}
          tabIndex={-1}
          aria-label="Video. Space or K plays and pauses, the arrows skip 5 seconds, F is fullscreen, N takes a note"
          className={classes.stage}
          data-floating={floating || undefined}
          data-corner={floating ? corner : undefined}
          data-dragging={drag ? true : undefined}
          data-fullscreen={fullscreen || undefined}
          data-notes={(fullscreen && showNotes) || undefined}
          style={floating ? ({ ...place, ...(drag ? { '--drag-x': `${drag.x}px`, '--drag-y': `${drag.y}px` } : {}) } as CSSProperties) : undefined}
        >
          {floating && (
            <div className={classes.handle} onPointerDown={startDrag} title="Drag to another corner">
              <IconGripHorizontal size={16} className={classes.grip} aria-hidden />
              {notePopover(
                'float',
                <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={() => openComposer()}>
                  Note at {formatTime(composer?.seconds ?? time)}
                </Button>,
              )}
              <Group gap={2} wrap="nowrap" ml="auto">
                <Tooltip label="Back to the video">
                  <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Back to the video" onClick={() => slotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
                    <IconArrowBackUp size={15} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Stop floating the video" onClick={() => setDismissed(true)}>
                  <IconX size={15} />
                </ActionIcon>
              </Group>
            </div>
          )}
          <div className={classes.screen}>
            <iframe
              ref={iframeRef}
              src={src}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className={classes.iframe}
            />
          </div>
          {fullscreen && (
            <aside className={classes.side} aria-label="Notes on this video">
              <Group justify="space-between" wrap="nowrap" gap="xs" className={classes.sideHead}>
                {notePopover('side', noteButton)}
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
      {!fullscreen && failed && !ready && (
        <Group gap="xs" mt={8} className={classes.bar} contentEditable={false} role="status">
          <Text size="sm" c="dimmed">
            Video notes unavailable: YouTube didn&apos;t load.
          </Text>
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </Button>
        </Group>
      )}
      {!fullscreen && !(failed && !ready) && (
        <Group gap="xs" mt={8} className={classes.bar} contentEditable={false}>
          {notePopover('bar', noteButton)}
          <Tooltip label="Fullscreen, with the notes">
            <ActionIcon variant="subtle" color="gray" onClick={toggleFullscreen} aria-label="Fullscreen, with the notes" disabled={!ready}>
              <IconArrowsMaximize size={17} />
            </ActionIcon>
          </Tooltip>
          {/* The keys, where there is a keyboard: N needs the focus on the video, ⌥N works while writing */}
          {hasKeyboard && ready && (
            <Text size="xs" c="dimmed" className={classes.keys}>
              <Kbd size="xs">N</Kbd> note · <Kbd size="xs">{alt}N</Kbd> while writing · <Kbd size="xs">{mod}↵</Kbd> plays a line&apos;s time
            </Text>
          )}
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
