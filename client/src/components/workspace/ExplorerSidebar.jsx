import { useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  CopyPlus,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  Scale,
  Tags,
  UserCircle,
} from 'lucide-react';

export default function ExplorerSidebar({ contracts, expanded, toggle, navigate, user }) {
  const location = useLocation();
  const recentContracts = contracts.slice(0, 5);

  const isActive = (path) => location.pathname.startsWith(path);
  const isManagementActive =
    isActive('/contracts-management') ||
    isActive('/documents-management') ||
    isActive('/templates-management') ||
    isActive('/category-tags-management');
  const isSettingsActive = isActive('/settings') || isActive('/admin') || isActive('/profile');

  return (
    <nav className="sidebar-explorer" aria-label="Điều hướng chính">
      {/* Header */}
      <div className="explorer-header">
        <div className="workspace-brand">⚖️ AI LEGAL WORKSPACE</div>
        <div className="workspace-subtitle">Legal Ops Platform</div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-nav">
        {/* Dashboard */}
        <button
          type="button"
          className={`sidebar-nav-item${isActive('/dashboard') ? ' active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        {/* Quản lý Văn bản - collapsible parent */}
        <button
          type="button"
          className={`sidebar-nav-item sidebar-nav-parent${isManagementActive ? ' active' : ''}`}
          onClick={() => toggle('management')}
          aria-expanded={expanded.management}
        >
          <FolderOpen size={16} />
          <span>Quản lý Văn bản</span>
          <span className="sidebar-nav-arrow">
            {expanded.management ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </button>

        {expanded.management && (
          <div className="sidebar-subnav">
            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/contracts-management') ? ' active' : ''}`}
              onClick={() => navigate('/contracts-management')}
            >
              <Scale size={14} />
              <span>Quản lý Hợp Đồng</span>
              {contracts.length > 0 && (
                <span className="nav-badge">{contracts.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/documents-management') ? ' active' : ''}`}
              onClick={() => navigate('/documents-management')}
            >
              <FileText size={14} />
              <span>Quản lý Tài Liệu</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/templates-management') ? ' active' : ''}`}
              onClick={() => navigate('/templates-management')}
            >
              <CopyPlus size={14} />
              <span>Quản lý Mẫu Văn Bản</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/category-tags-management') ? ' active' : ''}`}
              onClick={() => navigate('/category-tags-management')}
            >
              <Tags size={14} />
              <span>Danh mục &amp; Tags</span>
            </button>
          </div>
        )}

        {/* Tra cứu luật */}
        <button
          type="button"
          className={`sidebar-nav-item${isActive('/legal-search') ? ' active' : ''}`}
          onClick={() => navigate('/legal-search')}
        >
          <Search size={16} />
          <span>Tra cứu luật</span>
        </button>

        {/* Cài đặt - collapsible parent */}
        <button
          type="button"
          className={`sidebar-nav-item sidebar-nav-parent${isSettingsActive ? ' active' : ''}`}
          onClick={() => toggle('settings')}
          aria-expanded={expanded.settings}
        >
          <Settings size={16} />
          <span>Cài đặt</span>
          <span className="sidebar-nav-arrow">
            {expanded.settings ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        </button>

        {expanded.settings && (
          <div className="sidebar-subnav">
            {user?.role === 'admin' && (
              <button
                type="button"
                className={`sidebar-nav-item sidebar-nav-sub${isActive('/admin') ? ' active' : ''}`}
                onClick={() => navigate('/admin')}
                title="Quản lý người dùng"
              >
                <Shield size={14} />
                <span>Quản lý người dùng</span>
              </button>
            )}
            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/profile') ? ' active' : ''}`}
              onClick={() => navigate('/profile')}
            >
              <UserCircle size={14} />
              <span>Hồ sơ cá nhân</span>
            </button>
            <button
              type="button"
              className={`sidebar-nav-item sidebar-nav-sub${isActive('/settings') ? ' active' : ''}`}
              onClick={() => navigate('/settings')}
            >
              <Settings size={14} />
              <span>Cài đặt chung</span>
            </button>
          </div>
        )}
      </div>

      {/* Recent contracts */}
      {recentContracts.length > 0 && (
        <div className="explorer-section">
          <div className="section-title section-title-static">
            <span>📌 GẦN ĐÂY</span>
          </div>
          <div className="explorer-items">
            {recentContracts.map((contract, index) => (
              <button
                key={`${contract.id}-${index}`}
                type="button"
                className="nav-item nav-item-recent nav-item-btn"
                title={contract.name}
                onClick={() => navigate('/contracts-management')}
              >
                <span className="contract-icon">📄</span>
                <span className="contract-text">{contract.name || `Hợp đồng ${index + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer is empty or can be removed completely */}
      <div className="sidebar-footer">
      </div>
    </nav>
  );
}
