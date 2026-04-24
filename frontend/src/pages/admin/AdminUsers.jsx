import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (searchTerm) params.search = searchTerm;
      
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      showNotification('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await adminAPI.updateUserStatus(userId, !currentStatus);
      showNotification('User status updated', 'success');
      fetchUsers();
    } catch (error) {
      showNotification('Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      showNotification('User deleted', 'success');
      fetchUsers();
    } catch (error) {
      showNotification('Failed to delete user', 'error');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'badge-danger',
      pharmacy: 'badge-primary',
      customer: 'badge-success',
    };
    return `badge ${colors[role] || 'badge-secondary'}`;
  };

  return (
    <div className="admin-users-page">
      <div className="page-header">
        <h1>Users Management</h1>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="role-filter"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="pharmacy">Pharmacy Owners</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>
                      <span className={getRoleBadge(user.role)}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleStatusToggle(user._id, user.isActive)}
                          className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-success'}`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-outline"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminUsers;
