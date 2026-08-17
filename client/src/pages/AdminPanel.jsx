import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Shield,
  AlertCircle,
  Loader,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Trash2,
  Archive,
} from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';
import PageHero from '../components/ui/PageHero';
import './admin-panel.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [orphanedAssets, setOrphanedAssets] = useState({ documents: [], contracts: [], drafts: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'audit') loadAuditLogs();
    else if (activeTab === 'orphaned') loadOrphanedAssets();
  }, [activeTab, filterRole, filterStatus]);

  const showNotification = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 5000);
    } else {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
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
      } else if (action === 'delete') {
        url = endpoint;
        method = 'DELETE';
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      showNotification(`Thao tác thành công`);

      setShowModal(false);
      loadUsers();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      showNotification('Tạo người dùng thành công');
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

  // ─── Orphaned Assets ───────────────────────────────────────────────────────
  const loadOrphanedAssets = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/orphaned-assets`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrphanedAssets(data);
    } catch (err) {
      showNotification(`Lỗi tải tài liệu lưu trữ: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReassignAssets = async (assetType, assetIds, newUserId) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/orphaned-assets/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetType, assetIds, newUserId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      showNotification('Chuyển nhượng tài liệu thành công');
      loadOrphanedAssets();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssets = async (assetType, assetIds) => {
    setActionLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/orphaned-assets`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetType, assetIds }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      showNotification('Đã xóa tài liệu thành công');
      loadOrphanedAssets();
    } catch (err) {
      showNotification(`Lỗi: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = { admin: '#ef4444', member: '#3b82f6' };
    return colors[role] || '#6b7280';
  };

  const getRoleLabel = (role) => {
    const labels = { admin: 'Quản trị viên', member: 'Thành viên' };
    return labels[role] || role;
  };

  // ─── Users Tab ─────────────────────────────────────────────────────────────
  const renderUsersTab = () => (
    <div className="admin-tab-content">
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
          <option value="admin">Quản trị viên</option>
          <option value="member">Thành viên</option>
        </select>

        <button className="btn-action" onClick={loadUsers} disabled={loading}>
          {loading ? <Loader size={18} /> : <RefreshCw size={18} />}
        </button>

        <button className="btn-primary" onClick={() => setShowModal('create-user')}>
          <Plus size={16} />
          Thêm người dùng
        </button>
      </div>

      {loading ? (
        <div className="loading-state"><Loader size={32} /><p>Đang tải...</p></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><Users size={48} /><p>Không tìm thấy người dùng</p></div>
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
                    {user.totp_enabled
                      ? <CheckCircle size={18} style={{ color: '#10b981' }} />
                      : <XCircle size={18} style={{ color: '#9ca3af' }} />}
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
                    <UserActionMenu
                      user={user}
                      onAction={handleUserAction}
                      setSelected={setSelectedUser}
                      setShowModal={setShowModal}
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── Audit Logs Tab ────────────────────────────────────────────────────────
  const renderAuditTab = () => (
    <div className="admin-tab-content">
      <div className="audit-controls">
        <button className="btn-action" onClick={loadAuditLogs} disabled={loading}>
          {loading ? <Loader size={18} /> : <RefreshCw size={18} />}
        </button>
      </div>

      {loading ? (
        <div className="loading-state"><Loader size={32} /><p>Đang tải...</p></div>
      ) : auditLogs.length === 0 ? (
        <div className="empty-state"><AlertCircle size={48} /><p>Chưa có hoạt động</p></div>
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

  // ─── Orphaned Assets Tab ───────────────────────────────────────────────────
  const renderOrphanedAssetsTab = () => (
    <OrphanedAssetsTab
      loading={loading}
      orphanedAssets={orphanedAssets}
      activeUsers={users.filter(u => u.is_active)}
      onLoad={loadOrphanedAssets}
      onReassign={handleReassignAssets}
      onDelete={handleDeleteAssets}
      actionLoading={actionLoading}
    />
  );

  return (
    <div className="management-page admin-panel">
      {successMessage && <div className="notification success">{successMessage}</div>}
      {errorMessage && <div className="notification error">{errorMessage}</div>}

      <PageHero
        icon={<Shield size={32} />}
        title="Quản lý người dùng"
        subtitle="Quản lý người dùng, lịch sử hoạt động và tài liệu lưu trữ của người dùng đã xóa"
        pills={[]}
      />

      <div className="management-toolbar admin-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'transparent', border: 'none', padding: 0 }}>
        <button
          className={`action-btn ${activeTab === 'users' ? 'action-btn--primary' : 'action-btn--secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Người dùng</span>
        </button>
        <button
          className={`action-btn ${activeTab === 'audit' ? 'action-btn--primary' : 'action-btn--secondary'}`}
          onClick={() => setActiveTab('audit')}
        >
          <AlertCircle size={16} />
          <span>Lịch sử hoạt động</span>
        </button>
        <button
          className={`action-btn ${activeTab === 'orphaned' ? 'action-btn--primary' : 'action-btn--secondary'}`}
          onClick={() => setActiveTab('orphaned')}
        >
          <Archive size={16} />
          <span>Tài liệu lưu trữ</span>
        </button>
      </div>

      <div className="management-table-container admin-tab-content-wrapper" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '16px' }}>
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {activeTab === 'orphaned' && renderOrphanedAssetsTab()}
      </div>

      {showModal && (
        <AdminModal
          type={showModal}
          onClose={() => setShowModal(false)}
          user={selectedUser}
          onSubmit={(data) => {
            if (showModal === 'create-user') {
              handleCreateUser(data);
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

// ─── Orphaned Assets Tab Component ────────────────────────────────────────────
function OrphanedAssetsTab({ loading, orphanedAssets, activeUsers, onLoad, onReassign, onDelete, actionLoading }) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reassignUserId, setReassignUserId] = useState('');

  const { documents = [], contracts = [] } = orphanedAssets;
  const totalAssets = documents.length + contracts.length;

  const handleSelect = (type, id) => {
    if (selectedType && selectedType !== type) {
      setSelectedType(type);
      setSelectedItems([id]);
    } else {
      setSelectedType(type);
      setSelectedItems((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    }
  };

  const handleSelectAll = (type, items) => {
    if (selectedType === type && selectedItems.length === items.length) {
      setSelectedItems([]);
      setSelectedType(null);
    } else {
      setSelectedType(type);
      setSelectedItems(items.map((i) => i.id));
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setSelectedType(null);
    setReassignUserId('');
  };

  if (loading) {
    return <div className="loading-state"><Loader size={32} /><p>Đang tải...</p></div>;
  }

  return (
    <div className="admin-tab-content">
      <div className="orphaned-header">
        <div className="orphaned-summary">
          <span className="summary-badge accent">{totalAssets} tài liệu chưa có chủ sở hữu</span>
          {totalAssets > 0 && (
            <span className="summary-badge" style={{ fontSize: '12px', color: '#64748b' }}>
              Chuyển quyền sở hữu hoặc xóa vĩnh viễn
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedItems.length > 0 && (
            <>
              <span className="selected-count">{selectedItems.length} đã chọn</span>
              <select
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
                className="reassign-select"
              >
                <option value="">-- Chọn người nhận --</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                disabled={!reassignUserId || actionLoading}
                onClick={() => onReassign(selectedType, selectedItems, reassignUserId).then(clearSelection)}
              >
                {actionLoading ? <Loader size={14} /> : 'Chuyển quyền sở hữu'}
              </button>
              <button
                className="btn-danger"
                disabled={actionLoading}
                onClick={() => {
                  if (window.confirm(`Xóa vĩnh viễn ${selectedItems.length} tài liệu? Không thể hoàn tác.`)) {
                    onDelete(selectedType, selectedItems).then(clearSelection);
                  }
                }}
              >
                <Trash2 size={14} />
                Xóa vĩnh viễn
              </button>
              <button className="btn-cancel" onClick={clearSelection}>Bỏ chọn</button>
            </>
          )}
          <button className="btn-action" onClick={onLoad} disabled={loading}>
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {totalAssets === 0 ? (
        <div className="empty-state">
          <Archive size={48} />
          <p>Không có tài liệu nào chưa có chủ sở hữu</p>
          <small>Khi xóa người dùng, tài liệu của họ sẽ xuất hiện ở đây để chờ xử lý</small>
        </div>
      ) : (
        <div className="orphaned-sections">
          {documents.length > 0 && (
            <AssetSection
              title="Tài liệu"
              type="document"
              items={documents}
              selectedType={selectedType}
              selectedItems={selectedItems}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
            />
          )}
          {contracts.length > 0 && (
            <AssetSection
              title="Hợp đồng"
              type="contract"
              items={contracts}
              selectedType={selectedType}
              selectedItems={selectedItems}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AssetSection({ title, type, items, selectedType, selectedItems, onSelect, onSelectAll }) {
  const isThisType = selectedType === type;
  const allSelected = isThisType && selectedItems.length === items.length;

  return (
    <div className="asset-section">
      <div className="asset-section-header">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onSelectAll(type, items)}
          />
          <h3 style={{ margin: 0 }}>{title} ({items.length})</h3>
        </label>
      </div>
      <div className="asset-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Tên</th>
              <th>Chủ sở hữu cũ</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isChecked = isThisType && selectedItems.includes(item.id);
              return (
                <tr key={item.id} className={isChecked ? 'row-selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onSelect(type, item.id)}
                    />
                  </td>
                  <td>{item.name || item.title || '-'}</td>
                  <td style={{ color: '#94a3b8', fontStyle: 'italic' }}>Người dùng đã xóa</td>
                  <td className="date-cell">{new Date(item.created_at).toLocaleDateString('vi-VN')}</td>
                  <td><span className="status-badge inactive">{item.status || '-'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSubmit, loading }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const generateRandom = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const all = upper + lower + digits + special;
    const pwd =
      upper[Math.floor(Math.random() * upper.length)] +
      lower[Math.floor(Math.random() * lower.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      special[Math.floor(Math.random() * special.length)] +
      Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]).join('');
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
    setError('');
    onSubmit({ newPassword });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Đặt lại mật khẩu</h2>
        <p>Đặt mật khẩu mới cho <strong>{user?.email}</strong></p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mật khẩu mới</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn-cancel" onClick={generateRandom} style={{ whiteSpace: 'nowrap' }}>
                Ngẫu nhiên
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="checkbox" id="rp-show" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
            <label htmlFor="rp-show" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>Hiện mật khẩu</label>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Admin Modal ───────────────────────────────────────────────────────────────
function AdminModal({ type, user, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    role: ['admin', 'member'].includes(user?.role) ? user.role : 'member',
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    password: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (type === 'reset-password') {
    return <ResetPasswordModal user={user} onClose={onClose} onSubmit={onSubmit} loading={loading} />;
  }

  if (type === 'create-user') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Thêm người dùng mới</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label>Họ và Tên *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nhập họ tên"
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu (để trống → mặc định: Abc@12345)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Để trống để dùng mật khẩu mặc định"
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div className="form-group">
              <label>Vai trò</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="member">Thành viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (type === 'edit') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Cập nhật thông tin người dùng</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>Họ và Tên</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nhập họ tên"
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div className="form-group">
              <label>Vai trò</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="member">Thành viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const getActionName = () => {
    switch (type) {
      case 'reset-password': return 'Đặt lại mật khẩu';
      case 'disable': return 'Vô hiệu hóa';
      case 'enable': return 'Kích hoạt';
      case 'disable-2fa': return 'Tắt 2FA';
      case 'delete': return 'Xóa người dùng';
      default: return type;
    }
  };

  const isDelete = type === 'delete';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Xác nhận hành động</h2>
        <p>
          Bạn chắc chắn muốn <strong>{getActionName()}</strong> cho người dùng{' '}
          <strong>{user?.email}</strong>?
        </p>
        {isDelete && (
          <p className="delete-warning">
            Tài liệu của người dùng này sẽ được giữ lại trong kho lưu trữ để admin xử lý.
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
          <button
            type="button"
            className={isDelete ? 'btn-danger' : 'btn-primary'}
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

// ─── User Action Menu ──────────────────────────────────────────────────────────
function UserActionMenu({ user, onAction, setSelected, setShowModal, openMenuId, setOpenMenuId }) {
  const isOpen = openMenuId === user.id;
  const menuRef = useRef(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 220);
    }

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setOpenMenuId]);

  const actions = [
    { label: 'Cập nhật', action: 'edit', condition: true },
    { label: 'Đặt lại mật khẩu', action: 'reset-password', condition: true },
    { label: user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt', action: user.is_active ? 'disable' : 'enable', condition: true },
    { label: 'Tắt 2FA', action: 'disable-2fa', condition: user.totp_enabled },
    { label: 'Xóa người dùng', action: 'delete', condition: true, danger: true },
  ];

  return (
    <div className="action-menu" ref={menuRef}>
      <button className="menu-btn" onClick={() => setOpenMenuId(isOpen ? null : user.id)}>
        <MoreVertical size={18} />
      </button>
      {isOpen && (
        <div className={`dropdown${dropUp ? ' dropdown--up' : ''}`}>
          {actions.filter((a) => a.condition).map((a) => (
            <button
              key={a.action}
              className={`dropdown-item${a.danger ? ' dropdown-item--danger' : ''}`}
              onClick={() => {
                setSelected(user);
                setShowModal(a.action);
                setOpenMenuId(null);
              }}
            >
              {a.danger && <Trash2 size={13} style={{ marginRight: 4 }} />}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
