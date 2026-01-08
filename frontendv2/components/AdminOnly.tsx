'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminOnlyProps {
  children: ReactNode;
}

const AdminOnly: React.FC<AdminOnlyProps> = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return <>{children}</>;
};

export default AdminOnly;