'use client';

/**
 * LogoutButton - Button component for user logout
 * Handles logout action and loading state
 */

import { Button } from '@mantine/core';
import { useAuth } from '../hooks/useAuth';

export function LogoutButton() {
  const { logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  return (
    <Button onClick={handleLogout} variant="default" loading={loading}>
      Log out
    </Button>
  );
}
