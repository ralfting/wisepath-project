'use client';

import { useState } from 'react';
import type { Path } from '@wisepath/domain/paths';
import { useCatalog, useWithdrawPublication } from '@/useCases/paths';

/** The catalog section's view model: where the path stands, the form open or not, and withdrawing or unpublishing */
export function useCatalogSection(path: Path) {
  const state = useCatalog(path);
  const withdraw = useWithdrawPublication();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    setBusy(true);
    setError(await withdraw(path, state));
    setBusy(false);
  };

  return {
    state: { catalog: state, editing, busy, error },
    operations: { edit: () => setEditing(true), closeForm: () => setEditing(false), withdraw: handleWithdraw },
  };
}
