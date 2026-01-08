import PlacementsPage from '@/components/PlacementsPage';
import ProtectedRoute from '@/components/ProtectedRoute';

const Placements = () => {
  return (
    <ProtectedRoute adminOnly={true}>
      <PlacementsPage />
    </ProtectedRoute>
  );
};

export default Placements;