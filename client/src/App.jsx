import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Scale,
  Settings,
  Search,
  AlertTriangle,
  Key,
  BarChart3,
  UploadCloud,
  CopyPlus,
  FolderOpen,
} from 'lucide-react';
import Modal from './components/Modal';
import ExplorerSidebar from './components/workspace/ExplorerSidebar';
import EditorTabs from './components/workspace/EditorTabs';
import StatusBar from './components/workspace/StatusBar';
import PageHero from './components/ui/PageHero';
import StatCard from './components/ui/StatCard';
import ContractsManagement from './pages/ContractsManagement';
import DocumentsManagement from './pages/DocumentsManagement';
import TemplatesManagement from './pages/TemplatesManagement';
import CategoryTagsManagement from './pages/CategoryTagsManagement';
import LegalSearchPage from './pages/LegalSearchPage';
import AdminPanel from './pages/AdminPanel';
import UserProfile from './pages/UserProfile';
import { fetchWithAuth, logout } from './utils/fetchWithAuth.js';
import { TokenStorage, validateStoredTokens } from './utils/tokenUtils.js';
import { setUser as setReduxUser, clearAuth } from './store/slices/authSlice.js';
import './App.css';
import './styles/management-pages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function AuthScreen({ form, setForm, onSubmit, pending }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Đăng nhập hệ thống</h1>
        <p>Kết nối vào Legal workspace để quản lý hợp đồng và tra cứu pháp lý.</p>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@company.vn"
            />
          </div>
          <div className="auth-field">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="********"
            />
          </div>

          <button className="auth-submit" disabled={pending} type="submit">
            {pending ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
          Liên hệ quản trị viên để được cấp tài khoản.
        </p>
      </div>
    </div>
  );
}

function ShellDashboard({
  stats,
  onUploadClick,
  onOpenTemplates,
  onOpenLegalSearch,
  onOpenIntegration,
  onOpenRiskOverview,
  uploadBusy,
  contracts,
}) {
  const dashboardActions = [
    {
      key: 'upload',
      className: 'action-card action-card--featured',
      iconClass: 'action-icon action-icon-upload',
      icon: <UploadCloud />,
      title: uploadBusy ? 'Đang tải lên...' : 'Upload hợp đồng',
      description: 'Nạp hợp đồng mới vào legal vault để hệ thống trích xuất và index tự động.',
      onClick: onUploadClick,
    },
    {
      key: 'templates',
      className: 'action-card',
      iconClass: 'action-icon action-icon-template',
      icon: <CopyPlus />,
      title: 'Tạo mẫu văn bản',
      description: 'Sinh văn bản theo mẫu nghiệp vụ và xuất DOCX/PDF nhanh chóng.',
      onClick: onOpenTemplates,
    },
    {
      key: 'legal-search',
      className: 'action-card',
      iconClass: 'action-icon action-icon-search',
      icon: <Search />,
      title: 'Tra cứu luật',
      description: 'Tra cứu pháp lý theo câu hỏi tự nhiên và nhận dẫn chiếu nguồn.',
      onClick: onOpenLegalSearch,
    },
    {
      key: 'integration',
      className: 'action-card',
      iconClass: 'action-icon action-icon-integration',
      icon: <Key />,
      title: 'API & Tích hợp',
      description: 'Quản lý API keys, quota và usage metrics theo tenant.',
      onClick: onOpenIntegration,
    },
    {
      key: 'risk-overview',
      className: 'action-card',
      iconClass: 'action-icon action-icon-risk',
      icon: <BarChart3 />,
      title: 'Tổng quan rủi ro',
      description: 'Xem risk distribution theo thời gian và loại hợp đồng.',
      onClick: onOpenRiskOverview,
    },
  ];

  return (
    <div className="dashboard-content dashboard-phase3">
      <PageHero
        kicker="DASHBOARD LEGAL OPS"
        icon={<Scale size={32} />}
        title="Dashboard Pháp Lý"
        subtitle="Quản lý hợp đồng và tra cứu pháp lý cho doanh nghiệp Việt Nam"
        pills={['Đa tên miền', 'Quản lý Hợp đồng', 'Sẵn sàng Tuân thủ']}
      />

      <div className="stats-row">
        <StatCard value={stats.contracts} label="Hợp đồng" className="stat-card-primary" trend={[8, 11, 10, 16, 14, 20, 24]} footer="+12% so với tuần trước" />
        <StatCard value={stats.documents} label="Tài liệu" className="stat-card-secondary" trend={[6, 9, 7, 12, 13, 15, 18]} footer="OCR + extraction ổn định" />
        <StatCard value={stats.templates} label="Mẫu văn bản" className="stat-card-accent" trend={[5, 7, 9, 11, 10, 14, 17]} footer="Template library đang mở rộng" />
      </div>

      <div className="dashboard-stage">
        <section className="intel-panel intel-main">
          <div className="intel-headline">
            <h3>Nhịp điệu Vận hành</h3>
            <span>Tổng quan</span>
          </div>

          <div className="intel-metrics">
            <div className="metric-row">
              <div className="metric-label">
                <span>Tổng hợp đồng</span>
                <strong>{stats.contracts}</strong>
              </div>
              <div className="metric-track"><div className="metric-fill fill-blue" style={{ width: `${Math.min(100, stats.contracts * 5)}%` }} /></div>
            </div>

            <div className="metric-row">
              <div className="metric-label">
                <span>Tài liệu</span>
                <strong>{stats.documents}</strong>
              </div>
              <div className="metric-track"><div className="metric-fill fill-gold" style={{ width: `${Math.min(100, stats.documents * 5)}%` }} /></div>
            </div>

            <div className="metric-row">
              <div className="metric-label">
                <span>Mẫu văn bản</span>
                <strong>{stats.templates}</strong>
              </div>
              <div className="metric-track"><div className="metric-fill fill-red" style={{ width: `${Math.min(100, stats.templates * 5)}%` }} /></div>
            </div>
          </div>

          <div className="command-row">
            <button type="button" className="command-chip" onClick={onUploadClick}>{uploadBusy ? 'Đang upload...' : 'Nạp hợp đồng mới'}</button>
            <button type="button" className="command-chip" onClick={onOpenRiskOverview}>Mở Tổng Quan Rủi Ro</button>
            <button type="button" className="command-chip" onClick={onOpenIntegration}>Xem Sử Dụng API</button>
          </div>
        </section>

        <section className="intel-panel intel-side">
          <div className="intel-headline">
            <h3>Hợp đồng Gần đây</h3>
            <span>{contracts.length} bản ghi</span>
          </div>

          <div className="recent-contract-list">
            {contracts.length === 0 ? (
              <div className="empty-recent">
                <strong>Chưa có dữ liệu hợp đồng</strong>
                <p>Upload hợp đồng đầu tiên để bật analytics dashboard.</p>
              </div>
            ) : (
              contracts.slice(0, 5).map((contract) => (
                <div key={contract.id} className="recent-contract-item">
                  <div>
                    <h4>{contract.name}</h4>
                    <p>{contract.contract_type || 'loại khác'} • {contract.status || 'có hiệu lực'}</p>
                  </div>
                  <span className="status-badge neutral">
                    {contract.workflow_status || contract.status || 'Đang xử lý'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="action-grid">
        {dashboardActions.map((item) => (
          <button type="button" key={item.key} className={`${item.className} action-card-btn`} onClick={item.onClick}>
            <div className={item.iconClass}>{item.icon}</div>
            <div className="action-text">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


function RiskOverviewPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchWithAuth(`${API_URL}/v1/contracts/risk-summary`);

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Không thể tải tổng quan rủi ro.');
        }

        if (!ignore) {
          setPayload(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Không thể tải tổng quan rủi ro.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [token]);

  const summary = payload?.summary || {};

  return (
    <div className="dashboard-content">
      <div className="hero-header">
        <h1><AlertTriangle size={32} /> Tổng Quan Rủi Ro</h1>
        <p>Bảng tổng hợp risk score theo hợp đồng, loại hợp đồng và xu hướng theo ngày.</p>
      </div>

      {loading && (
        <div className="stat-card" style={{ textAlign: 'left' }}>
          <p style={{ textTransform: 'none', letterSpacing: 0 }}>Đang tải dữ liệu rủi ro...</p>
        </div>
      )}

      {!loading && error && (
        <div className="stat-card" style={{ textAlign: 'left' }}>
          <p style={{ textTransform: 'none', letterSpacing: 0, color: '#fda4af' }}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="stats-row">
            <div className="stat-card"><h2>{summary.total_contracts || 0}</h2><p>Tổng hợp đồng</p></div>
            <div className="stat-card"><h2 style={{ color: '#10b981' }}>{summary.reviewed_contracts || 0}</h2><p>Đã review</p></div>
            <div className="stat-card"><h2 style={{ color: '#f59e0b' }}>{summary.pending_review_contracts || 0}</h2><p>Chưa review</p></div>
            <div className="stat-card"><h2 style={{ color: '#ef4444' }}>{summary.high_risk_count || 0}</h2><p>Rủi ro cao</p></div>
          </div>

          <div className="stat-card" style={{ textAlign: 'left', marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Theo loại hợp đồng</h3>
            {Array.isArray(payload?.by_type) && payload.by_type.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {payload.by_type.map((item) => (
                  <div key={item.contract_type} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(148,163,184,0.15)', paddingBottom: 8 }}>
                    <span>{item.contract_type}</span>
                    <span style={{ color: '#94a3b8' }}>
                      {item.total_contracts} hợp đồng • Avg {item.average_risk_score}/100 • High {item.high_risk_count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textTransform: 'none', letterSpacing: 0 }}>Chưa có dữ liệu theo loại hợp đồng.</p>
            )}
          </div>

          <div className="stat-card" style={{ textAlign: 'left', marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Xu hướng theo ngày</h3>
            {Array.isArray(payload?.trend) && payload.trend.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {payload.trend.map((item) => (
                  <div key={item.date} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.date}</span>
                    <span style={{ color: '#94a3b8' }}>{item.total_requests || item.reviewed_contracts || 0} lượt • Avg {item.average_risk_score || 0}/100</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textTransform: 'none', letterSpacing: 0 }}>Chưa có dữ liệu xu hướng.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TemplatesPage({ token, openModal }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [variables, setVariables] = useState({});
  const [draft, setDraft] = useState('');
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const response = await fetchWithAuth(`${API_URL}/v1/templates`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tải templates.');
        if (!ignore) {
          setTemplates(data.templates || []);
          setSelectedTemplateId(data.templates?.[0]?.id || '');
        }
      } catch (error) {
        if (!ignore) {
          openModal('Templates', error.message || 'Không thể tải templates.');
        }
      }
    };
    run();
    return () => { ignore = true; };
  }, [token, openModal]);

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/templates/${selectedTemplateId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables }),
      });
      const data = await response.json();
      if (!response.ok) {
        setValidation(data.validation || null);
        setDraft(data.text || '');
        throw new Error(data.error || 'Dữ liệu chưa đạt yêu cầu để tạo văn bản.');
      }

      setDraft(data.text || '');
      setValidation(data.validation || null);
    } catch (error) {
      openModal('Tạo mẫu văn bản', error.message || 'Không thể tạo văn bản.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!draft.trim() || !selectedTemplateId) {
      openModal('Export', 'Bạn cần generate văn bản trước khi export.');
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_URL}/v1/templates/${selectedTemplateId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          title: selectedTemplate?.name || 'Tài liệu được Tạo',
          text: draft,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Không thể export văn bản.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${selectedTemplateId}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      openModal('Export', error.message || 'Không thể export văn bản.');
    }
  };

  return (
    <div className="dashboard-content">
      <div className="hero-header">
        <h1><CopyPlus size={32} /> Tạo Mẫu Văn Bản</h1>
        <p>Chọn template, nhập biến dữ liệu, validate pháp lý và export DOCX/PDF.</p>
      </div>

      <div className="stat-card" style={{ textAlign: 'left' }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Template</label>
        <select
          className="form-select-glass"
          value={selectedTemplateId}
          onChange={(event) => {
            setSelectedTemplateId(event.target.value);
            setDraft('');
            setValidation(null);
          }}
        >
          {templates.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div className="stat-card" style={{ textAlign: 'left', marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>{selectedTemplate.name}</h3>
          <p style={{ textTransform: 'none', letterSpacing: 0 }}>{selectedTemplate.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {(selectedTemplate.required_fields || []).map((field) => (
              <div key={field}>
                <label style={{ display: 'block', marginBottom: 6 }}>{field}</label>
                <input
                  className="form-input-glass"
                  value={variables[field] || ''}
                  onChange={(event) => setVariables((prev) => ({ ...prev, [field]: event.target.value }))}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="auth-submit" type="button" disabled={loading} onClick={handleGenerate}>
              {loading ? 'Đang tạo...' : 'Tạo'}
            </button>
            <button className="auth-submit" type="button" onClick={() => handleExport('docx')}>Xuất DOCX</button>
            <button className="auth-submit" type="button" onClick={() => handleExport('pdf')}>Xuất PDF</button>
          </div>
        </div>
      )}

      {validation && (
        <div className="stat-card" style={{ textAlign: 'left', marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Kết quả kiểm tra pháp lý</h3>
          <p style={{ color: validation.valid ? '#4ade80' : '#fda4af', textTransform: 'none', letterSpacing: 0 }}>
            {validation.valid ? 'Draft hợp lệ tối thiểu.' : 'Draft chưa đạt yêu cầu pháp lý tối thiểu.'}
          </p>
          {Array.isArray(validation.errors) && validation.errors.length > 0 && (
            <div style={{ color: '#fda4af' }}>{validation.errors.join(' | ')}</div>
          )}
          {Array.isArray(validation.warnings) && validation.warnings.length > 0 && (
            <div style={{ color: '#facc15', marginTop: 8 }}>{validation.warnings.join(' | ')}</div>
          )}
        </div>
      )}

      {draft && (
        <div className="stat-card" style={{ textAlign: 'left', marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>Bản nháp</h3>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{draft}</pre>
        </div>
      )}
    </div>
  );
}

function IntegrationPage({ token, openModal }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [usage, setUsage] = useState(null);
  const [form, setForm] = useState({ name: '', permissions: 'read,ask,review', rate_limit: 60 });
  const [newPlainKey, setNewPlainKey] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [keysResp, usageResp] = await Promise.all([
        fetchWithAuth(`${API_URL}/v1/settings/api-keys`),
        fetchWithAuth(`${API_URL}/v1/settings/usage?days=14`),
      ]);

      const keyPayload = await keysResp.json();
      const usagePayload = await usageResp.json();

      if (!keysResp.ok) throw new Error(keyPayload.error || 'Không thể tải API keys.');
      if (!usageResp.ok) throw new Error(usagePayload.error || 'Không thể tải usage dashboard.');

      setApiKeys(keyPayload.api_keys || []);
      setUsage(usagePayload || null);
    } catch (error) {
      openModal('API & Tích hợp', error.message || 'Không thể tải dữ liệu tích hợp.');
    }
  }, [token, openModal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/settings/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          permissions: form.permissions.split(',').map((item) => item.trim()).filter(Boolean),
          rate_limit: Number(form.rate_limit) || 60,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tạo API key.');
      }

      setNewPlainKey(payload.api_key?.plain_key || '');
      setForm({ name: '', permissions: 'read,ask,review', rate_limit: 60 });
      await fetchData();
    } catch (error) {
      openModal('Tạo API key', error.message || 'Không thể tạo API key.');
    }
  };

  const handleRevoke = async (id) => {
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/settings/api-keys/${id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể thu hồi API key.');
      }
      await fetchData();
    } catch (error) {
      openModal('Thu hồi API key', error.message || 'Không thể thu hồi API key.');
    }
  };

  return (
    <div className="dashboard-content">
      <div className="hero-header">
        <h1><Key size={32} /> API & Tích Hợp</h1>
        <p>Quản lý API key, rate limit theo tenant và theo dõi usage dashboard.</p>
      </div>

      <div className="stat-card" style={{ textAlign: 'left' }}>
        <h3 style={{ marginTop: 0 }}>Tạo API key mới</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: 10 }}>
          <input className="form-input-glass" placeholder="Tên key" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="form-input-glass" placeholder="quyền hạn (read,ask,review)" value={form.permissions} onChange={(e) => setForm((prev) => ({ ...prev, permissions: e.target.value }))} />
          <input className="form-input-glass" type="number" placeholder="Tỉ lệ/phút" value={form.rate_limit} onChange={(e) => setForm((prev) => ({ ...prev, rate_limit: e.target.value }))} />
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="auth-submit" type="button" onClick={handleCreate}>Tạo key</button>
        </div>
        {newPlainKey && (
          <p style={{ marginTop: 12, color: '#facc15', textTransform: 'none', letterSpacing: 0 }}>
            Key mới (chỉ hiển thị 1 lần): {newPlainKey}
          </p>
        )}
      </div>

      <div className="stat-card" style={{ textAlign: 'left', marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>API keys hiện có</h3>
        {apiKeys.length === 0 ? (
          <p style={{ textTransform: 'none', letterSpacing: 0 }}>Chưa có API key nào.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {apiKeys.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(148,163,184,0.15)', paddingBottom: 8 }}>
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: '#6b7791', fontSize: '0.85rem' }}>{item.masked_key} • limit {item.rate_limit}/phút • {item.is_active ? 'hoạt động' : 'không hoạt động'}</div>
                </div>
                <button className="auth-submit" type="button" onClick={() => handleRevoke(item.id)}>Thu hồi</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="stats-row" style={{ marginTop: 14 }}>
        <div className="stat-card"><h2>{usage?.summary?.total_requests || 0}</h2><p>Tổng request</p></div>
        <div className="stat-card"><h2 style={{ color: '#10b981' }}>{usage?.summary?.success_requests || 0}</h2><p>Success</p></div>
        <div className="stat-card"><h2 style={{ color: '#ef4444' }}>{usage?.summary?.failed_requests || 0}</h2><p>Failed</p></div>
        <div className="stat-card"><h2 style={{ color: '#38bdf8' }}>{usage?.summary?.estimated_cost_usd || 0}</h2><p>Cost USD</p></div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="dashboard-content">
      <div className="hero-header">
        <h1><Settings size={32} /> Cài Đặt</h1>
        <p>Trang placeholder cho cấu hình workspace và tích hợp trong phase tiếp theo.</p>
      </div>

      <div className="stat-card" style={{ textAlign: 'left' }}>
        <h3 style={{ marginTop: 0 }}>Trạng thái</h3>
        <p style={{ textTransform: 'none', letterSpacing: 0 }}>
          Các cài đặt nâng cao sẽ được nối sau.
        </p>
      </div>
    </div>
  );
}

function WorkspaceLayout({
  user,
  token,
  contracts,
  expanded,
  toggle,
  navigate,
  openModal,
  onLogout,
  onUploadClick,
  uploadBusy,
  stats,
  fileInputRef,
  handleFileSelected,
  modal,
  closeModal,
}) {
  const location = useLocation();
  const pageKey = location.pathname;

  let content = (
    <ShellDashboard
      stats={stats}
      onUploadClick={onUploadClick}
      onOpenTemplates={() => navigate('/templates')}
      onOpenLegalSearch={() => navigate('/legal-search')}
      onOpenIntegration={() => navigate('/integrations')}
      onOpenRiskOverview={() => navigate('/risk-overview')}
      uploadBusy={uploadBusy}
      contracts={contracts}
    />
  );

  if (pageKey.startsWith('/contracts-management')) {
    content = <ContractsManagement />;
  } else if (pageKey.startsWith('/documents-management')) {
    content = <DocumentsManagement />;
  } else if (pageKey.startsWith('/templates-management')) {
    content = <TemplatesManagement />;
  } else if (pageKey.startsWith('/category-tags-management')) {
    content = <CategoryTagsManagement />;
  } else if (pageKey.startsWith('/legal-search')) {
    content = <LegalSearchPage />;
  } else if (pageKey.startsWith('/templates')) {
    content = <TemplatesPage token={token} openModal={openModal} />;
  } else if (pageKey.startsWith('/integrations')) {
    content = <IntegrationPage token={token} openModal={openModal} />;
  } else if (pageKey.startsWith('/risk-overview')) {
    content = <RiskOverviewPage token={token} />;
  } else if (pageKey.startsWith('/settings')) {
    content = <SettingsPage />;
  } else if (pageKey.startsWith('/admin')) {
    content = <AdminPanel />;
  } else if (pageKey.startsWith('/profile')) {
    content = <UserProfile />;
  }

  return (
    <div className="ide-layout">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng, đến nội dung chính</a>
      <div className="ide-body">
        <ExplorerSidebar
          contracts={contracts}
          expanded={expanded}
          toggle={toggle}
          navigate={navigate}
          user={user}
        />

        <main id="main-content" className="main-editor" role="main">
          <EditorTabs pageKey={pageKey} user={user} onLogout={onLogout} />

          {content}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />
        </main>
      </div>

      <StatusBar pathName={location.pathname} user={user} />

      <Modal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        onConfirm={closeModal}
      />
    </div>
  );
}

function WorkspaceController() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState({ hopdong: true, tailieu: true, mau: true, management: true, recent: false, starred: false });
  const [token, setToken] = useState(localStorage.getItem('longpl_token') || '');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (user) {
      dispatch(setReduxUser(user));
    }
  }, [user, dispatch]);

  const [contracts, setContracts] = useState([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [authPending, setAuthPending] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [modal, setModal] = useState({ open: false, title: 'Thông báo', message: '' });
  const fileInputRef = useRef(null);

  const stats = {
    contracts: contracts.length,
    documents: documentCount,
    templates: templateCount,
  };

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const openModal = useCallback((title, message) => {
    setModal({ open: true, title, message });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ open: false, title: '', message: '' });
  }, []);

  useEffect(() => {
    const handleTokenExpired = (event) => {
      const message = event.detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      openModal('Phiên đăng nhập', message);
      setTimeout(() => {
        handleLogout();
      }, 2000);
    };

    window.addEventListener('token-expired', handleTokenExpired);
    return () => window.removeEventListener('token-expired', handleTokenExpired);
  }, [openModal]);

  useEffect(() => {
    validateStoredTokens()
      .then((isValid) => {
        if (isValid) {
          const currentToken = TokenStorage.getAccessToken();
          setToken(currentToken);
          setUser(TokenStorage.getUser());
        } else {
          setToken('');
          setUser(null);
        }
      })
      .catch(() => {
        setToken('');
        setUser(null);
      });
  }, []);

  const fetchContracts = async () => {
    let response;
    try {
      response = await fetchWithAuth(`${API_URL}/v1/contracts`);
    } catch {
      // fetchWithAuth only throws when auth is confirmed expired.
      // handleTokenExpiry() has already been called → redirect in progress.
      return;
    }

    if (!response.ok) {
      // Server error (500 etc.) — don't logout, just show empty state
      console.warn('Could not load contracts:', response.status);
      setContracts([]);
      return;
    }

    const payload = await response.json();
    setContracts(Array.isArray(payload.contracts) ? payload.contracts : []);
  };

  useEffect(() => {
    if (!token) return;

    fetchContracts();

    fetchWithAuth(`${API_URL}/v1/templates/count`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count != null) setTemplateCount(d.count); })
      .catch(() => {});

    fetchWithAuth(`${API_URL}/v1/documents/count`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count != null) setDocumentCount(d.count); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token && (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/')) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, token, navigate]);

  useEffect(() => {
    if (!token && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, token, navigate]);

  const handleAuthSubmit = async () => {
    const { email, password } = authForm;
    if (!email || !password) {
      openModal('Thiếu thông tin', 'Email và mật khẩu là bắt buộc.');
      return;
    }

    setAuthPending(true);
    try {
      const loginResponse = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData.token) {
        throw new Error(loginData.error || 'Đăng nhập thất bại.');
      }

      TokenStorage.setTokens(loginData.token, loginData.refresh_token);
      TokenStorage.setUser(loginData.user || null);
      setToken(loginData.token);
      setUser(loginData.user || null);
      setAuthForm({ email: '', password: '' });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      openModal('Đăng nhập', error.message || 'Không thể xác thực tài khoản.');
    } finally {
      setAuthPending(false);
    }
  };

  const handleLogout = () => {
    TokenStorage.clearTokens();
    dispatch(clearAuth());
    setToken('');
    setUser(null);
    setContracts([]);
    navigate('/login', { replace: true });
  };

  const handleUploadClick = () => {
    if (!token) {
      openModal('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để upload hợp đồng.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetchWithAuth(`${API_URL}/v1/contracts/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload hợp đồng thất bại.');
      }

      openModal('Upload thành công', `Đã xử lý file: ${data.fileName}`);
      await fetchContracts();
      navigate('/contracts');
    } catch (error) {
      openModal('Upload thất bại', error.message || 'Không thể tải file hợp đồng.');
    } finally {
      setUploadBusy(false);
      event.target.value = '';
    }
  };

  if (!token && location.pathname !== '/login' && location.pathname !== '/register') {
    return <Navigate to="/login" replace />;
  }

  if (!token) {
    return (
      <>
        <AuthScreen
          form={authForm}
          setForm={setAuthForm}
          onSubmit={handleAuthSubmit}
          pending={authPending}
        />
        <Modal
          isOpen={modal.open}
          title={modal.title}
          message={modal.message}
          onConfirm={closeModal}
        />
      </>
    );
  }

  return (
    <WorkspaceLayout
      user={user}
      token={token}
      contracts={contracts}
      expanded={expanded}
      toggle={toggle}
      navigate={navigate}
      openModal={openModal}
      onLogout={handleLogout}
      onUploadClick={handleUploadClick}
      uploadBusy={uploadBusy}
      stats={stats}
      fileInputRef={fileInputRef}
      handleFileSelected={handleFileSelected}
      modal={modal}
      closeModal={closeModal}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login/*" element={<WorkspaceController />} />
        <Route path="/register/*" element={<WorkspaceController />} />
        <Route path="/dashboard/*" element={<WorkspaceController />} />
        <Route path="/contracts" element={<Navigate to="/contracts-management" replace />} />
        <Route path="/legal-search/*" element={<WorkspaceController />} />
        <Route path="/templates/*" element={<WorkspaceController />} />
        <Route path="/risk-overview/*" element={<WorkspaceController />} />
        <Route path="/integrations/*" element={<WorkspaceController />} />
        <Route path="/settings/*" element={<WorkspaceController />} />
        <Route path="/admin/*" element={<WorkspaceController />} />
        <Route path="/profile/*" element={<WorkspaceController />} />
        <Route path="*" element={<WorkspaceController />} />
      </Routes>
    </BrowserRouter>
  );
}
