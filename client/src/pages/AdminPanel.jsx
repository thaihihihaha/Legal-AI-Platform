import React, { useState, useEffect } from 'react';
import {
  Users,
  Mail,
  Shield,
  Eye,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';
import './admin-panel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'invitations') loadInvitations();
  }, [activeTab, filterRole, filterStatus]);

  const showNotification = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // ─── Users Management ──────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterRole !== 'all') params.append('role', filterRole);
      if (filterStatus === 'active') params.append('is_active', 'true');
      else if (filterStatus === 'inactive') params.append('is_active', 'false');

      const res = await fetchWithAuth(`${API_URL}/v1/admin/users?${params}`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      showNotification(`Lỗi tải người dùng: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action, data = {}) => {
    setActionLoading(true);
    try {
      const endpoint = `${API_URL}/v1/admin/users/${userId}`;
      let url = endpoint;
      let method = 'PATCH';
      let body = data;

      if (action === 'disable' || action === 'enable') {
        url = `${endpoint}/${action}`;
        method = 'POST';
      } else if (action === 'reset-password') {
        url = `${endpoint}/reset-password`;
        method = 'POST';
      } else if (action === 'set-role') {
        url = `${endpoint}/set-role`;
        method = 'POST';
      } else if (action === 'disable-2fa') {
        url = `${endpoint}/disable-2fa`;
        method = 'POST';
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      showNotification(`${action} thành công`);
      setShowModal(false);
      loadUsers();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/audit-logs?limit=100`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      showNotification(`Lỗi tải audit logs: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Invitations ───────────────────────────────────────────────────────────
  const loadInvitations = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/invitations`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      showNotification(`Lỗi tải lời mời: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (email, role) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showNotification('Lời mời được tạo');
      setShowModal(false);
      loadInvitations();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: '#f59e0b',
      admin: '#ef4444',
      member: '#3b82f6',
      viewer: '#6b7280',
    };
    return colors[role] || '#6b7280';
  };

  const getRoleLabel = (role) => {
    const labels = {
      owner: 'Chủ sở hữu',
      admin: 'Quản trị viên',
      member: 'Thành viên',
      viewer: 'Xem',
    };
    return labels[role] || role;
  };

  // ─── Users Tab Content ─────────────────────────────────────────────────────
  const renderUsersTab = () => (
    <div className="admin-tab-content">
      {/* Filters */}
      <div className="admin-filters">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã vô hiệu hóa</option>
          <option value="all">Tất cả</option>
        </select>

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="all">Tất cả vai trò</option>
          <option value="owner">Chủ sở hữu</option>
          <option value="admin">Quản trị viên</option>
          <option value="member">Thành viên</option>
          <option value="viewer">Xem</option>
        </select>

        <button className="btn-action" onClick={loadUsers} disabled={loading}>
          {loading ? <Loader size={18} /> : <RefreshCw size={18} />}
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="loading-state">
          <Loader size={32} />
          <p>Đang tải...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Không tìm thấy người dùng</p>
        </div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Tên</th>
                <th>Vai trò</th>
                <th>Số điện thoại</th>
                <th>2FA</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="email-cell">{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>
                    <span className="role-badge" style={{ backgroundColor: getRoleColor(user.role) }}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>{user.phone_number || '-'}</td>
                  <td>
                    {user.totp_enabled ? (
                      <CheckCircle size={18} style={{ color: '#10b981' }} />
                    ) : (
                      <XCircle size={18} style={{ color: '#9ca3af' }} />
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </td>
                  <td className="date-cell">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td>
                    <UserActionMenu user={user} onAction={handleUserAction} setSelected={setSelectedUser} setShowModal={setShowModal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── Audit Logs Tab Content ────────────────────────────────────────────────
  const renderAuditTab = () => (
    <div className="admin-tab-content">
      <div className="audit-controls">
        <button className="btn-action" onClick={loadAuditLogs} disabled={loading}>
          {loading ? <Loader size={18} /> : <RefreshCw size={18} />}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader size={32} />
          <p>Đang tải...</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>Chưa có hoạt động</p>
        </div>
      ) : (
        <div className="audit-logs">
          <div className="audit-timeline">
            {auditLogs.map((log) => (
              <div key={log.id} className="audit-entry">
                <div className="audit-header">
                  <span className="action-badge">{log.action}</span>
                  <span className="actor">{log.actor?.email || 'System'}</span>
                  <span className="timestamp">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="audit-details">
                  <span>{log.resource_type}</span>
                  {log.resource_id && <span className="resource-id">{log.resource_id.substring(0, 8)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Invitations Tab Content ───────────────────────────────────────────────
  const renderInvitationsTab = () => (
    <div className="admin-tab-content">
      <div className="invitations-header">
        <button className="btn-primary" onClick={() => setShowModal('create-invitation')}>
          <Plus size={18} />
          Tạo lời mời
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader size={32} />
          <p>Đang tải...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="empty-state">
          <Mail size={48} />
          <p>Không có lời mời nào</p>
        </div>
      ) : (
        <div className="invitations-list">
          {invitations.map((invite) => (
            <div key={invite.id} className="invitation-card">
              <div className="invitation-info">
                <div className="invite-email">{invite.email}</div>
                <div className="invite-role">
                  <span className="role-badge" style={{ backgroundColor: getRoleColor(invite.role) }}>
                    {getRoleLabel(invite.role)}
                  </span>
                </div>
              </div>
              <div className="invitation-date">
                <span className="expires">Hết hạn: {new Date(invite.expires_at).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-panel">
      {/* Notifications */}
      {successMessage && <div className="notification success">{successMessage}</div>}
      {errorMessage && <div className="notification error">{errorMessage}</div>}

      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <Shield size={32} className="header-icon" />
          <div className="header-text">
            <h1>Quản lý Admin</h1>
            <p>Quản lý người dùng, lịch sử hoạt động và lời mời</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          <span>Người dùng</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <AlertCircle size={20} />
          <span>Lịch sử hoạt động</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('invitations')}
        >
          <Mail size={20} />
          <span>Lời mời</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'audit' && renderAuditTab()}
      {activeTab === 'invitations' && renderInvitationsTab()}

      {/* Modals */}
      {showModal && (
        <AdminModal
          type={showModal}
          onClose={() => setShowModal(false)}
          user={selectedUser}
          onSubmit={(data) => {
            if (showModal === 'create-invitation') {
              handleCreateInvitation(data.email, data.role);
            } else {
              handleUserAction(selectedUser.id, showModal, data);
            }
          }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// ─── User Action Menu ──────────────────────────────────────────────────────────
function UserActionMenu({ user, onAction, setSelected, setShowModal }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'Cập nhật', action: 'edit', condition: !user.is_super_admin },
    { label: 'Đặt lại mật khẩu', action: 'reset-password', condition: true },
    { label: user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt', action: user.is_active ? 'disable' : 'enable', condition: true },
    { label: 'Tắt 2FA', action: 'disable-2fa', condition: user.totp_enabled },
  ];

  return (
    <div className="action-menu">
      <button className="menu-btn" onClick={() => setOpen(!open)}>
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="dropdown">
          {actions
            .filter((a) => a.condition)
            .map((a) => (
              <button
                key={a.action}
                className="dropdown-item"
                onClick={() => {
                  setSelected(user);
                  setShowModal(a.action);
                  setOpen(false);
                }}
              >
                {a.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Modal ───────────────────────────────────────────────────────────────
function AdminModal({ type, onClose, user, onSubmit, loading }) {
  const [formData, setFormData] = useState({ email: '', role: 'member' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (type === 'create-invitation') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Tạo lời mời mới</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label>Vai trò</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="member">Thành viên</option>
                <option value="admin">Quản trị viên</option>
                <option value="owner">Chủ sở hữu</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo lời mời'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Xác nhận hành động</h2>
        <p>Bạn chắc chắn muốn {type} cho {user?.email}?</p>
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => onSubmit({})}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
