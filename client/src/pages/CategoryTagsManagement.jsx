import React, { useState, useEffect, useRef } from 'react';
import {
  Tags, FolderTree, Plus, Pencil, Trash2, Check, X, RefreshCw, Tag,
} from 'lucide-react';
import CategoryTree from '../components/shared/CategoryTree.jsx';
import PageHero from '../components/ui/PageHero';

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
    <div className="management-table-container" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <Tag size={18} />
          Quản lý Nhãn (Tags)
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="action-btn action-btn--tertiary" onClick={fetchTags} title="Làm mới">
            <RefreshCw size={16} /> Làm mới
          </button>
          <button
            className="action-btn action-btn--primary"
            onClick={() => { setCreating(true); setTimeout(() => newInputRef.current?.focus(), 50); }}
          >
            <Plus size={16} /> Tạo Tag mới
          </button>
        </div>
      </div>

      {creating && (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              ref={newInputRef}
              className="search-box"
              style={{ flex: 1, padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }}
              placeholder="Tên tag..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
            />
            <button className="action-btn action-btn--primary" onClick={handleCreate} disabled={busy}>
              <Check size={16} /> {busy ? 'Đang tạo' : 'Tạo mới'}
            </button>
            <button className="action-btn action-btn--tertiary" onClick={() => { setCreating(false); setNewName(''); }}>
              <X size={16} /> Hủy
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '0.5rem', lineHeight: '24px' }}>Màu sắc: </span>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', background: c, border: newColor === c ? '3px solid #fff' : 'none',
                  boxShadow: newColor === c ? `0 0 0 2px ${c}` : '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'all 0.2s',
                  transform: newColor === c ? 'scale(1.1)' : 'scale(1)'
                }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="management-empty"><p>Đang tải danh sách Tag...</p></div>
      ) : tags.length === 0 ? (
        <div className="management-empty">
          <Tag size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'inline-block' }} />
          <p>Chưa có nhãn (tag) nào được tạo.</p>
          <button className="action-btn action-btn--secondary" style={{ marginTop: '1rem' }} onClick={() => setCreating(true)}>
            <Plus size={16} /> Tạo Tag đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {tags.map((tag) => (
            <div key={tag.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              {editingId === tag.id ? (
                <div style={{ padding: '1rem' }}>
                  <input
                    style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '0.75rem', outline: 'none' }}
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(tag.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{
                          width: '18px', height: '18px', borderRadius: '50%', background: c, border: editColor === c ? '2px solid #fff' : 'none',
                          boxShadow: editColor === c ? `0 0 0 2px ${c}` : 'none', cursor: 'pointer'
                        }}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="action-btn action-btn--primary" style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px', flex: 1 }} onClick={() => handleSaveEdit(tag.id)} disabled={busy}>
                      <Check size={12} /> Lưu
                    </button>
                    <button className="action-btn action-btn--tertiary" style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px', flex: 1 }} onClick={() => setEditingId(null)}>
                      <X size={12} /> Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{ background: tag.color ? `${tag.color}15` : '#f1f5f9', color: tag.color || '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color || '#94a3b8' }} />
                    {tag.name}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="action-btn action-btn--tertiary" style={{ padding: '6px', height: '28px', borderRadius: '6px', minWidth: 'auto' }} title="Chỉnh sửa" onClick={() => startEdit(tag)}>
                      <Pencil size={14} />
                    </button>
                    <button className="action-btn action-btn--danger" style={{ padding: '6px', height: '28px', borderRadius: '6px', minWidth: 'auto' }} title="Xóa" onClick={() => handleDelete(tag)} disabled={busy}>
                      <Trash2 size={14} />
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
    <div className="management-table-container" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <FolderTree size={18} />
          Quản lý Cấu trúc Danh mục
        </h3>
      </div>

      <div className="resource-tabs" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {RESOURCE_TABS.map((rt) => (
          <button
            key={rt.key}
            type="button"
            className={`action-btn ${activeResource === rt.key ? 'action-btn--primary' : 'action-btn--secondary'}`}
            onClick={() => setActiveResource(rt.key)}
            style={{ borderRadius: '10px' }}
          >
            <span>{rt.emoji}</span>
            <span>{rt.label}</span>
          </button>
        ))}
      </div>

      <div className="category-tree-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
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
    <div className="management-page">
      <PageHero
        icon={<FolderTree size={32} />}
        title="Danh mục & Tags"
        subtitle="Tổ chức và phân loại văn bản theo danh mục và nhãn"
        pills={[]}
      />

      {/* Top-level tabs */}
      <div className="management-toolbar templates-toolbar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`action-btn ${activeTab === 'categories' ? 'action-btn--primary' : 'action-btn--secondary'}`}
          onClick={() => setActiveTab('categories')}
        >
          <FolderTree size={16} />
          Danh mục
        </button>
        <button
          type="button"
          className={`action-btn ${activeTab === 'tags' ? 'action-btn--primary' : 'action-btn--secondary'}`}
          onClick={() => setActiveTab('tags')}
        >
          <Tags size={16} />
          Tags quản lý
        </button>
      </div>

      {/* Panel content */}
      {activeTab === 'categories' ? <CategoriesPanel /> : <TagsPanel />}
    </div>
  );
}
