'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationProps {
  currentPage?: string;
  userName?: string;
  userRole?: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, userName, userRole }) => {
  const { user, loading, isAuthenticated, isAdmin: isUserAdmin } = useAuth();

  if (loading) {
    return <nav className="bg-gray-800 text-white p-4">Loading...</nav>;
  }

  // Determine if user is admin (prioritize auth context over static props)
  const isAdmin = isUserAdmin || userRole === 'admin';

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex space-x-4">
          <Link href="/" className={`hover:underline ${currentPage === 'home' ? 'font-bold' : ''}`}>
            Home
          </Link>
          <Link 
            href="/students" 
            className={`hover:underline ${currentPage === 'students' ? 'font-bold' : ''}`}
          >
            Students
          </Link>
          {isAuthenticated && (
            <Link 
              href="/profile" 
              className={`hover:underline ${currentPage === 'profile' ? 'font-bold' : ''}`}
            >
              Profile
            </Link>
          )}
          {isAdmin && (
            <>
              <Link 
                href="/admin" 
                className={`hover:underline ${currentPage === 'admin' ? 'font-bold' : ''}`}
              >
                Admin
              </Link>
              <Link 
                href="/placements" 
                className={`hover:underline ${currentPage === 'placements' ? 'font-bold' : ''}`}
              >
                Placements
              </Link>
            </>
          )}
        </div>
        
        <div>
          {isAuthenticated ? (
            <span>Welcome, {user?.email}</span>
          ) : userName ? (
            <span>Welcome, {userName}</span>
          ) : (
            <Link href="/login" className="hover:underline">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;