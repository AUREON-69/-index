'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PlacementDrive {
  id: number;
  company: string;
  status: string;
  start_date: string;
  end_date: string;
  package: number | null;
  description: string | null;
}

const PlacementsPage = () => {
  const [placements, setPlacements] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchPlacements = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/placements`);
        const data = await response.json();
        setPlacements(data);
      } catch (error) {
        console.error('Error fetching placements:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchPlacements();
    }
  }, [isAuthenticated]);

  if (loading) {
    return <div className="container mx-auto p-4">Loading placements...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Placement Drives</h1>
      
      {isAdmin && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h2 className="text-lg font-semibold mb-2">Admin: Add New Placement Drive</h2>
          <form 
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              
              const newPlacement = {
                company: formData.get('company') as string,
                status: formData.get('status') as string,
                package: formData.get('package') ? parseInt(formData.get('package') as string) : null,
                description: formData.get('description') as string,
                start_date: formData.get('start_date') as string || null,
                end_date: formData.get('end_date') as string || null,
              };
              
              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/placements`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Include auth token
                  },
                  body: JSON.stringify(newPlacement),
                });
                
                if (response.ok) {
                  const newPlacement = await response.json(); // Get the newly created placement
                  setPlacements(prev => [...prev, newPlacement]); // Add the new placement to the list
                  
                  // Reset form
                  (e.target as HTMLFormElement).reset();
                } else {
                  console.error('Failed to add placement');
                }
              } catch (error) {
                console.error('Error adding placement:', error);
              }
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input 
                type="text" 
                name="company"
                className="w-full p-2 border rounded"
                placeholder="Company name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" className="w-full p-2 border rounded">
                <option value="starting_soon">Starting Soon</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input 
                type="date" 
                name="start_date"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input 
                type="date" 
                name="end_date"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Package (INR)</label>
              <input 
                type="number" 
                name="package"
                className="w-full p-2 border rounded"
                placeholder="Package amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                name="description"
                className="w-full p-2 border rounded"
                placeholder="Description"
              />
            </div>
            
            <button 
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add Placement Drive
            </button>
          </form>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {placements.map((placement) => (
          <div key={placement.id} className="border rounded p-4 shadow">
            <h3 className="font-bold text-lg">{placement.company}</h3>
            <p className="text-gray-600">{placement.description}</p>
            <div className="mt-2">
              <span className={`inline-block px-2 py-1 text-xs rounded ${
                placement.status === 'ongoing' ? 'bg-green-100 text-green-800' : 
                placement.status === 'completed' ? 'bg-gray-100 text-gray-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {placement.status}
              </span>
              {placement.package && (
                <p className="mt-1">Package: ₹{placement.package}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacementsPage;