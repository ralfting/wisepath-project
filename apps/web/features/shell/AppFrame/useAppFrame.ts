'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useLogout, useSession } from '@/useCases/auth';
import { SIDEBAR_WIDTH } from './AppFrame.helpers';

const COLLAPSED_KEY = 'wisepath:sidebar-collapsed';

/**
 * The app frame's view model: the phone's navigation drawer, the sidebar collapsed to a rail (remembered on this
 * device), the full sidebar floating over the content while the pointer rests on the rail, and sending a stale
 * session back to the login.
 */
export function useAppFrame() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useCollapsed();
  const [peeking, setPeeking] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();

  // A cookie that no longer opens a session: clear it, then log in again
  useEffect(() => {
    if (session.status !== 'signedOut') return;
    logout().finally(() => router.replace('/login'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  // Another page: the phone's drawer and the floating sidebar close
  useEffect(() => {
    close();
    setPeeking(false);
  }, [pathname, close]);

  // The pointer can open the sidebar from the rail and move away without ever
  // entering it, so close it once the pointer is clearly past its right side
  useEffect(() => {
    if (!peeking) return;
    const onMove = (event: PointerEvent) => {
      if (event.clientX > SIDEBAR_WIDTH + 40) setPeeking(false);
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [peeking]);

  return {
    state: { opened, collapsed, peeking },
    operations: {
      toggleNavigation: toggle,
      closeNavigation: close,
      collapse: () => setCollapsed(true),
      keepOpen: () => setCollapsed(false),
      peek: () => setPeeking(true),
      stopPeeking: () => setPeeking(false),
    },
  };
}

/** The collapsed choice, remembered on this device; storage can be unavailable */
function useCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      // Keep the sidebar open
    }
  }, []);
  const set = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // The choice lasts until reload
    }
  };
  return [collapsed, set];
}
