import AdminPage from '@/components/AdminPage';
import ProtectedRoute from '@/components/ProtectedRoute';

const Admin = () => {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminPage />
    </ProtectedRoute>
  );
};

export default Admin;