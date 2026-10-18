'use client';

import { useState } from 'react';
import { useDecidePublication } from '@/useCases/paths';

/** One request's view model: approving or declining it, and what went wrong; the page reads the queue again after */
export function usePublicationRow(pathId: string) {
  const decide = useDecidePublication();
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDecide = async (approve: boolean) => {
    setBusy(approve ? 'approve' : 'decline');
    setError(await decide(pathId, approve));
    setBusy(null);
  };

  return { state: { busy, error }, operations: { approve: () => handleDecide(true), decline: () => handleDecide(false) } };
}
