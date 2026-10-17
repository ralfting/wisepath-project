'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Path } from '@wisepath/domain/paths';
import { useSession } from '@/useCases/auth';
import { useTakePath } from '@/useCases/paths';
import { loginHref, mapHref, publicMapHref, signupHref } from '@/shared/routes';

/**
 * The public path's view model: the page being read (the main page first), and taking the path to study it, which
 * needs an account: a visitor is sent to log in and comes back here
 */
export function usePublicPath(path: Path) {
  const router = useRouter();
  const session = useSession();
  const take = useTakePath();
  const [selectedId, setSelectedId] = useState<string>(path.rootPageId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const page = path.pages.find((p) => p.id === selectedId) ?? path.pages.find((p) => p.id === path.rootPageId)!;

  const study = async () => {
    setBusy(true);
    const failed = await take(path.id);
    setBusy(false);
    if (failed) return setError(failed);
    router.push(mapHref(path.id));
  };

  return {
    state: {
      page,
      signedIn: session.status === 'signedIn',
      loginHref: loginHref(publicMapHref(path.id)),
      signupHref: signupHref(publicMapHref(path.id)),
      error,
      busy,
    },
    operations: { select: setSelectedId, study },
  };
}
