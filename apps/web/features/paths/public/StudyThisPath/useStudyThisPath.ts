'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/useCases/auth';
import { useTakePath } from '@/useCases/paths';
import { STUDY_INTENT, loginHref, mapHref, signupHref, withStudyIntent } from '@/shared/routes';

/**
 * Taking a path to study it, which needs an account: a learner adds it to their paths and opens it; a visitor is sent
 * to sign up or log in and, back at the address they read it at with an account, has it taken without asking twice
 */
export function useStudyThisPath(pathId: string, readingHref: string) {
  const router = useRouter();
  const session = useSession();
  const take = useTakePath();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);
  const signedIn = session.status === 'signedIn';

  const study = async () => {
    setBusy(true);
    const failed = await take(pathId);
    setBusy(false);
    if (failed) return setError(failed);
    router.push(mapHref(pathId));
  };

  // The intent is read from the address, not useSearchParams, so the catalog's pages still render on the server
  useEffect(() => {
    if (!signedIn || resumed.current || !new URLSearchParams(window.location.search).has(STUDY_INTENT)) return;
    resumed.current = true;
    void study();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the visitor comes back signed in
  }, [signedIn]);

  return {
    state: {
      signedIn,
      loginHref: loginHref(withStudyIntent(readingHref)),
      signupHref: signupHref(withStudyIntent(readingHref)),
      error,
      busy,
    },
    operations: { study },
  };
}
