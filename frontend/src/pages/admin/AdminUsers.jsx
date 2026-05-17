import { useState, useEffect } from 'react';
import { userAPI, adminAPI } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', phone: '' });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (searchTerm) params.search = searchTerm;
      
      const response = await userAPI.getAll(params);
      setUsers(response.data?.data?.users || []);
      setTotalPages(response.data?.data?.pagination?.pages || 1);
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
    const target = users.find(u => u._id === userId);
    if (target?.role === 'admin') {
      showNotification('Cannot change admin account status', 'error');
      return;
    }
    if (currentUser && currentUser._id === userId) {
      showNotification('You cannot change your own account status', 'error');
      return;
    }
    try {
      if (currentStatus) {
        await userAPI.disable(userId);
        showNotification('User deactivated successfully', 'success');
      } else {
        await userAPI.enable(userId);
        showNotification('User activated successfully', 'success');
      }
      fetchUsers();
    } catch (error) {
      showNotification('Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) return;
    try {
      await userAPI.delete(userId);
      showNotification('User deleted successfully', 'success');
      fetchUsers();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'badge-danger',
      pharmacy: 'badge-primary',
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
                        {user.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleStatusToggle(user._id, user.isActive)}
                              className={`btn btn-sm ${user.isActive ? 'btn-outline' : 'btn-success'}`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                        {user._id !== currentUser?._id && (
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

      {currentUser?.role === 'admin' && (
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddAdmin(true)}>Add Admin</button>
        </div>
      )}

      {showAddAdmin && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Create New Admin</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="10-digit phone number"
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await adminAPI.createAdmin(newAdmin);
                  showNotification('Admin created successfully', 'success');
                  setShowAddAdmin(false);
                  setNewAdmin({ name: '', email: '', password: '', phone: '' });
                  fetchUsers();
                } catch (err) {
                  showNotification(err.response?.data?.message || 'Failed to create admin', 'error');
                }
              }}>Create</button>
              <button className="btn btn-outline" onClick={() => setShowAddAdmin(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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