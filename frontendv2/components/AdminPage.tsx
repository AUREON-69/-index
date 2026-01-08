import AdminOnly from '@/components/AdminOnly';

const AdminPage = () => {
  return (
    <AdminOnly>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Upload Students</h2>
            <p>Upload a CSV file with student data</p>
            <form action="/api/admin/upload" method="post" encType="multipart/form-data">
              <input type="file" name="file" accept=".csv" required />
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded mt-2">
                Upload CSV
              </button>
            </form>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Manage Users</h2>
            <p>Add or remove admin privileges from users</p>
          </div>
        </div>
      </div>
    </AdminOnly>
  );
};

export default AdminPage;