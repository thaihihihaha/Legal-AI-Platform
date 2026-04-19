import { useState, useEffect, useRef } from 'react';
import {
  Tags, FolderTree, Plus, Pencil, Trash2, Check, X, RefreshCw, Tag,
} from 'lucide-react';
import CategoryTree from '../components/shared/CategoryTree.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
  '#6366f1', '#84cc16',
];

function getToken() {
  return localStorage.getItem('longpl_token');
}

// ─── Tag management panel ──────────────────────────────────────────────────────
function TagsPanel() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const newInputRef = useRef(null);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/tags`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreating(false);
        setNewName('');
        setNewColor(TAG_COLORS[0]);
        fetchTags();
      } else {
        alert(data.error || 'Không thể tạo tag');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[0]);
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        fetchTags();
      } else {
        alert(data.error || 'Không thể cập nhật tag');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Xóa tag "${tag.name}"? Tag sẽ bị gỡ khỏi tất cả tài liệu.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/tags/${tag.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchTags();
      } else {
        alert(data.error || 'Không thể xóa tag');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ctm-panel">
      <div className="ctm-panel-header">
        <h3 className="ctm-panel-title">
          <Tag size={16} />
          Quản lý Tags
        </h3>
        <div className="ctm-panel-actions">
          <button className="ctm-refresh-btn" onClick={fetchTags} title="Làm mới">
            <RefreshCw size={14} />
          </button>
          <button
            className="ctm-add-btn"
            onClick={() => { setCreating(true); setTimeout(() => newInputRef.current?.focus(), 50); }}
          >
            <Plus size={14} /> Tạo Tag
          </button>
        </div>
      </div>

      {creating && (
        <div className="ctm-create-form">
          <div className="ctm-create-row">
            <input
              ref={newInputRef}
              className="ctm-input"
              placeholder="Tên tag..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
            />
            <button className="ctm-btn ctm-btn--ok" onClick={handleCreate} disabled={busy}>
              <Check size={13} /> Tạo
            </button>
            <button className="ctm-btn" onClick={() => { setCreating(false); setNewName(''); }}>
              <X size={13} /> Hủy
            </button>
          </div>
          <div className="ctm-color-row">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`ctm-color-dot${newColor === c ? ' ctm-color-dot--active' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="ctm-loading">Đang tải...</p>
      ) : tags.length === 0 ? (
        <div className="ctm-empty">
          <Tag size={32} className="ctm-empty-icon" />
          <p>Chưa có tag nào</p>
          <button className="ctm-add-btn" onClick={() => setCreating(true)}>
            <Plus size={14} /> Tạo tag đầu tiên
          </button>
        </div>
      ) : (
        <div className="ctm-tag-grid">
          {tags.map((tag) => (
            <div key={tag.id} className="ctm-tag-card">
              {editingId === tag.id ? (
                <div className="ctm-tag-edit">
                  <input
                    className="ctm-input ctm-input--sm"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(tag.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <div className="ctm-color-row ctm-color-row--sm">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`ctm-color-dot${editColor === c ? ' ctm-color-dot--active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <div className="ctm-tag-edit-actions">
                    <button className="ctm-btn ctm-btn--ok ctm-btn--xs" onClick={() => handleSaveEdit(tag.id)} disabled={busy}>
                      <Check size={11} /> Lưu
                    </button>
                    <button className="ctm-btn ctm-btn--xs" onClick={() => setEditingId(null)}>
                      <X size={11} /> Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ctm-tag-card-inner">
                  <span
                    className="ctm-tag-pill"
                    style={{ '--tag-color': tag.color || '#94a3b8' }}
                  >
                    {tag.name}
                  </span>
                  <div className="ctm-tag-card-actions">
                    <button className="ctm-icon-btn" title="Chỉnh sửa" onClick={() => startEdit(tag)}>
                      <Pencil size={13} />
                    </button>
                    <button className="ctm-icon-btn ctm-icon-btn--danger" title="Xóa" onClick={() => handleDelete(tag)} disabled={busy}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categories panel ──────────────────────────────────────────────────────────
const RESOURCE_TABS = [
  { key: 'contract', label: 'Hợp Đồng', emoji: '⚖️' },
  { key: 'document', label: 'Tài Liệu', emoji: '📄' },
  { key: 'template', label: 'Mẫu Văn Bản', emoji: '📋' },
];

function CategoriesPanel() {
  const [activeResource, setActiveResource] = useState('contract');

  return (
    <div className="ctm-panel">
      <div className="ctm-panel-header">
        <h3 className="ctm-panel-title">
          <FolderTree size={16} />
          Quản lý Danh mục
        </h3>
      </div>

      <div className="ctm-resource-tabs">
        {RESOURCE_TABS.map((rt) => (
          <button
            key={rt.key}
            type="button"
            className={`ctm-resource-tab${activeResource === rt.key ? ' ctm-resource-tab--active' : ''}`}
            onClick={() => setActiveResource(rt.key)}
          >
            <span>{rt.emoji}</span>
            <span>{rt.label}</span>
          </button>
        ))}
      </div>

      <div className="ctm-cat-tree-wrap">
        <CategoryTree
          key={activeResource}
          resourceType={activeResource}
          selectedId={null}
          onSelect={() => {}}
        />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function CategoryTagsManagement() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="management-page ctm-page">
      {/* Page title */}
      <div className="ctm-hero">
        <div className="ctm-hero-icon">🗂️</div>
        <div>
          <h1 className="ctm-hero-title">Danh mục &amp; Tags</h1>
          <p className="ctm-hero-sub">Tổ chức và phân loại văn bản theo danh mục và nhãn</p>
        </div>
      </div>

      {/* Top-level tabs */}
      <div className="ctm-tabs">
        <button
          type="button"
          className={`ctm-tab${activeTab === 'categories' ? ' ctm-tab--active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree size={15} />
          Danh mục
        </button>
        <button
          type="button"
          className={`ctm-tab${activeTab === 'tags' ? ' ctm-tab--active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <Tags size={15} />
          Tags
        </button>
      </div>

      {/* Panel content */}
      {activeTab === 'categories' ? <CategoriesPanel /> : <TagsPanel />}
    </div>
  );
}
