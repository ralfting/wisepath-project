'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/useCases/auth';
import { useTakePath } from '@/useCases/paths';
import { loginHref, mapHref, signupHref } from '@/shared/routes';

/**
 * Taking a path to study it, which needs an account: a learner adds it to their paths and opens it; a visitor is sent
 * to sign up or log in and comes back to the address they read it at
 */
export function useStudyThisPath(pathId: string, readingHref: string) {
  const router = useRouter();
  const session = useSession();
  const take = useTakePath();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const study = async () => {
    setBusy(true);
    const failed = await take(pathId);
    setBusy(false);
    if (failed) return setError(failed);
    router.push(mapHref(pathId));
  };

  return {
    state: {
      signedIn: session.status === 'signedIn',
      loginHref: loginHref(readingHref),
      signupHref: signupHref(readingHref),
      error,
      busy,
    },
    operations: { study },
  };
}
