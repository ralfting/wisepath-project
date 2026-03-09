'use client';

/**
 * useAuthSession - Hook for session restoration on mount
 * Extracted from AuthContext useEffect for separation of concerns
 */

import { useEffect } from 'react';
import { AuthService } from '../services/auth.service';
import type { User } from '../types/auth.types';

interface UseAuthSessionOptions {
  onSessionRestored: (user: User | null) => void;
  onLoadingComplete: () => void;
}

export function useAuthSession({ onSessionRestored, onLoadingComplete }: UseAuthSessionOptions) {
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await AuthService.getMe();
        onSessionRestored(user);
      } catch (error) {
        console.error('Failed to restore session:', error);
        onSessionRestored(null);
      } finally {
        onLoadingComplete();
      }
    };

    restoreSession();
  }, [onSessionRestored, onLoadingComplete]);
}
