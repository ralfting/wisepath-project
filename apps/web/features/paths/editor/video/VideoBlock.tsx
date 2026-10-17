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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { youTubeId } from '../youtube';
import { LOAD_TIMEOUT_MS, PAUSED, PLAYING, embedUrl, loadYouTubeApi } from './youtubeApi';
import type { YouTubePlayer } from './youtubeApi';
import { addNote, formatTime, noteAt, notesAfter, setActiveNote } from './timestamps';
import type { VideoNote } from './timestamps';
import { pauseOthers, registerVideo } from './videos';
import classes from './VideoBlock.module.css';

/**
 * VideoBlock
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

export function VideoBlock({ node, editor, getPos }: NodeViewProps) {
  const t = useT();
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
  const [composer, setComposer] = useState<{ seconds: number; resume: boolean } | null>(null);
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

  // The focus out of YouTube's frame, where keys never reach the page, and onto the block, which answers them
  const reclaimFocus = useCallback(() => {
    if (document.activeElement !== iframeRef.current) return;
    lastUsed = self;
    stageRef.current?.focus({ preventScroll: true });
  }, [self]);

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
            if (event.data === PLAYING) {
              lastUsed = self;
              pauseOthers(editor, controlRef.current);
            }
            setTime(player.current?.getCurrentTime() ?? 0);
            // Played or paused from YouTube's own controls: no menu of its is open, so N can work again
            if (event.data === PLAYING || event.data === PAUSED) reclaimFocus();
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
  }, [self, attempt, src, reclaimFocus]);

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

  const seek = useCallback((seconds: number, fullscreen = false) => {
    lastUsed = self;
    setDismissed(false);
    const p = player.current;
    if (!p) return;
    p.seekTo(seconds, true);
    p.playVideo();
    setTime(seconds);
    // In fullscreen, a time picked from the notes hands the focus to the video, where the arrows move it on
    const stage = stageRef.current;
    if (stage && document.fullscreenElement === stage) requestAnimationFrame(() => stage.focus({ preventScroll: true }));
    // Asked for in fullscreen (⇧⌘↵, ⇧-click): the browser allows it only now, while the key or click is going on
    else if (stage && fullscreen) void stage.requestFullscreen();
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

  const openComposer = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const resume = p.getPlayerState() === PLAYING;
    if (resume) p.pauseVideo();
    lastUsed = self;
    // Paused out of view, nothing floats: bring the video to where the note is written
    if (!resume && !inViewRef.current) slotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setDraft('');
    setComposer({ seconds: p.getCurrentTime(), resume });
  }, [self]);

  const control = useMemo(() => ({ getPos: position, seek, pause: () => player.current?.pauseVideo() }), [position, seek]);
  const controlRef = useRef(control);
  controlRef.current = control;
  useEffect(() => registerVideo(editor, control), [editor, control]);

  const closeComposer = (save: boolean) => {
    if (!composer) return;
    const pos = position();
    // Nothing written, nothing added: an Enter by mistake leaves the list as it was
    if (save && pos !== undefined && draft.trim()) addNote(editor, pos, composer.seconds, draft);
    if (composer.resume) player.current?.playVideo();
    setComposer(null);
    // Back to the video, where its keys (← →, Space, N) work again
    requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
  };

  // One of YouTube's controls has done its part: the volume, the captions or the speed changed. Its frame says
  // so in the messages it sends the API; a while after the last one (a volume being dragged sends many), the
  // block takes the focus back
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || typeof event.data !== 'string') return;
      let data: { event?: string; info?: Record<string, unknown> };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      // Captions turned on may load YouTube's captions module, which it reports
      let changed = data.event === 'apiInfoDelivery';
      // The volume and the speed come on their own when they change; the speed also rides along with the time
      // in every report while playing, which isn't a change
      if (data.event === 'infoDelivery' && data.info) {
        const { info } = data;
        if ('volume' in info || 'muted' in info || ('playbackRate' in info && !('currentTime' in info))) changed = true;
      }
      if (!changed) return;
      clearTimeout(timer);
      timer = setTimeout(reclaimFocus, 700);
    };
    window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, [reclaimFocus]);

  // The pointer back on the page after using YouTube's controls: N, and the block's keys, work again
  useEffect(() => {
    const onMove = () => reclaimFocus();
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [reclaimFocus]);

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
      } else if (key === 'm') {
        if (p.isMuted()) p.unMute();
        else p.mute();
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
      <Popover.Dropdown p="xs">{composerFields('sm')}</Popover.Dropdown>
    </Popover>
  );
  // The note's field and its keys, in the popup or, in fullscreen, a card in the middle of the screen
  function composerFields(size: 'sm' | 'lg') {
    return (
      <>
        <TextInput
          data-autofocus
          autoFocus={size === 'lg'}
          size={size}
          placeholder={t('video.note.placeholder')}
          aria-label={t('video.note.at', { time: formatTime(composer?.seconds ?? 0) })}
          leftSection={<span className={classes.composerTime} data-size={size}>{formatTime(composer?.seconds ?? 0)}</span>}
          leftSectionWidth={size === 'lg' ? 84 : 64}
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
          {t('video.note.hint')}
        </Text>
      </>
    );
  }
  const noteButton = (
    <Tooltip label={<>{t('video.note.tooltip')} <Kbd size="xs">N</Kbd></>} disabled={composer !== null}>
      <Button
        ref={addRef}
        size="compact-sm"
        variant="light"
        leftSection={<IconPlus size={14} />}
        onClick={() => openComposer()}
        disabled={!ready}
        onMouseDown={(event) => event.preventDefault()}
      >
        {t('video.note.at', { time: formatTime(composer?.seconds ?? time) })}
      </Button>
    </Tooltip>
  );

  return (
    <NodeViewWrapper className={classes.block} data-youtube-video>
      <div ref={slotRef} className={classes.slot} contentEditable={false}>
        <div
          ref={stageRef}
          tabIndex={-1}
          aria-label={t('video.stage.label')}
          className={classes.stage}
          data-floating={floating || undefined}
          data-corner={floating ? corner : undefined}
          data-dragging={drag ? true : undefined}
          data-fullscreen={fullscreen || undefined}
          data-notes={(fullscreen && showNotes) || undefined}
          style={floating ? ({ ...place, ...(drag ? { '--drag-x': `${drag.x}px`, '--drag-y': `${drag.y}px` } : {}) } as CSSProperties) : undefined}
        >
          {floating && (
            <div className={classes.handle} onPointerDown={startDrag} title={t('video.floating.drag')}>
              <IconGripHorizontal size={16} className={classes.grip} aria-hidden />
              {notePopover(
                'float',
                <Button size="compact-xs" variant="light" leftSection={<IconPlus size={12} />} onClick={() => openComposer()}>
                  {t('video.note.at', { time: formatTime(composer?.seconds ?? time) })}
                </Button>,
              )}
              <Group gap={2} wrap="nowrap" ml="auto">
                <Tooltip label={t('video.floating.back')}>
                  <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('video.floating.back')} onClick={() => slotRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
                    <IconArrowBackUp size={15} />
                  </ActionIcon>
                </Tooltip>
                <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t('video.floating.stop')} onClick={() => setDismissed(true)}>
                  <IconX size={15} />
                </ActionIcon>
              </Group>
            </div>
          )}
          <div className={classes.screen}>
            <iframe
              ref={iframeRef}
              src={src}
              title={t('video.stage.iframeTitle')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className={classes.iframe}
            />
          </div>
          {/* In fullscreen the note is written in the middle of the screen, over the paused picture */}
          {fullscreen && composer && (
            <div className={classes.centre} onMouseDown={(event) => event.target === event.currentTarget && closeComposer(false)}>
              <div className={classes.centreCard} role="dialog" aria-label={t('video.note.at', { time: formatTime(composer.seconds) })}>
                {composerFields('lg')}
              </div>
            </div>
          )}
          {fullscreen && (
            <aside className={classes.side} aria-label={t('video.fullscreen.notes')}>
              <Group justify="space-between" wrap="nowrap" gap="xs" className={classes.sideHead}>
                {noteButton}
                <Group gap={4} wrap="nowrap">
                  <ActionIcon variant="subtle" color="gray" onClick={() => setShowNotes((s) => !s)} aria-label={showNotes ? t('video.fullscreen.hideNotes') : t('video.fullscreen.showNotes')}>
                    {showNotes ? <IconLayoutSidebarRightCollapse size={18} /> : <IconLayoutSidebarRightExpand size={18} />}
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="gray" onClick={toggleFullscreen} aria-label={t('video.fullscreen.exit')}>
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
            {t('video.failed')}
          </Text>
          <Button
            size="compact-sm"
            variant="subtle"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {t('common.actions.retry')}
          </Button>
        </Group>
      )}
      {!fullscreen && !(failed && !ready) && (
        <Group gap="xs" mt={8} className={classes.bar} contentEditable={false}>
          {notePopover('bar', noteButton)}
          {/* The key, where there is a keyboard: N needs the focus on the video. The one that plays a line's
              time shows on the line itself, in the cursor's rail */}
          <Group gap="xs" wrap="nowrap" ml="auto">
            {hasKeyboard && ready && (
              <Text size="xs" c="dimmed" className={classes.keys}>
                <Kbd size="xs">N</Kbd> {t('video.note.key')}
              </Text>
            )}
            <Tooltip label={t('video.fullscreen.enter')}>
              <ActionIcon variant="subtle" color="gray" onClick={toggleFullscreen} aria-label={t('video.fullscreen.enter')} disabled={!ready}>
                <IconArrowsMaximize size={17} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      )}
    </NodeViewWrapper>
  );
}

/** The notes beside the video in fullscreen, in time order: each plays from there; the one playing now is marked */
function NoteList({ notes, current, onSeek }: { notes: ReadonlyArray<VideoNote>; current: VideoNote | undefined; onSeek: (seconds: number) => void }) {
  const t = useT();
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('[data-current]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [current?.pos]);
  if (notes.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        {t('video.fullscreen.empty')}
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
