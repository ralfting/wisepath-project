'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

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
    <Button 
      onClick={handleLogout} 
      variant="outline"
      disabled={loading}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
