'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean; // If true, only allows admin users
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login'); // Redirect to login if not authenticated
      } else if (adminOnly && !isAdmin) {
        router.push('/'); // Redirect to home if trying to access admin page without admin privileges
      }
    }
  }, [isAuthenticated, isAdmin, loading, router, adminOnly]);

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Only render children if authenticated (and admin if adminOnly is true)
  if (isAuthenticated && (!adminOnly || (adminOnly && isAdmin))) {
    return <>{children}</>;
  }

  return null; // Render nothing if not authorized
};

export default ProtectedRoute;