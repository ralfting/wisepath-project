'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTakeSample } from '@/useCases/paths';
import { mapHref } from '@/shared/routes';

/** The first visit card's view model: taking the sample path and opening it, with its error while it can't */
export function useFirstVisit() {
  const router = useRouter();
  const takeSample = useTakeSample();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trySample = async () => {
    setBusy(true);
    const result = await takeSample();
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.push(mapHref(result.value.id));
  };

  return { state: { busy, error }, operations: { trySample } };
}
