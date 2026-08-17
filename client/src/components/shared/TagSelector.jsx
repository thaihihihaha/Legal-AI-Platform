import { useState, useEffect, useRef } from 'react';
import { Plus, X, Check, Tag } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const TAG_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
  '#6366f1', '#84cc16',
];

function getToken() {
  return localStorage.getItem('longpl_token');
}

/**
 * TagSelector
 * Props:
 *   selectedIds   — array of selected tag ids
 *   onChange(ids) — called with new array when selection changes
 *   compact       — bool, shows condensed pill-only view (for table cells)
 */
export default function TagSelector({ selectedIds = [], onChange, compact = false }) {
  const [allTags, setAllTags] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef(null);

  const fetchTags = async () => {
    try {
      const res = await fetch(`${API_URL}/v1/tags`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchTags(); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange?.(next);
  };

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
        await fetchTags();
        onChange?.([...selectedIds, data.tag.id]);
        setCreating(false);
        setNewName('');
        setNewColor(TAG_COLORS[0]);
      } else {
        alert(data.error || 'Không thể tạo tag');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));

  if (compact) {
    return (
      <div className="tag-pills">
        {selectedTags.map((t) => (
          <span key={t.id} className="tag-pill" style={{ '--tag-color': t.color || '#94a3b8' }}>
            {t.name}
          </span>
        ))}
        {selectedTags.length === 0 && <span className="tag-pill-empty">—</span>}
      </div>
    );
  }

  return (
    <div className="tag-selector" ref={dropRef}>
      {/* Selected pills + trigger */}
      <div className="tag-selector-trigger" onClick={() => setOpen((v) => !v)}>
        {selectedTags.length === 0 ? (
          <span className="tag-selector-placeholder">
            <Tag size={13} /> Chọn tags...
          </span>
        ) : (
          <div className="tag-pills">
            {selectedTags.map((t) => (
              <span key={t.id} className="tag-pill" style={{ '--tag-color': t.color || '#94a3b8' }}>
                {t.name}
                <button
                  type="button"
                  className="tag-pill-remove"
                  onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <span className="tag-selector-chevron">{open ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="tag-dropdown">
          {allTags.length === 0 && !creating && (
            <p className="tag-empty">Chưa có tag nào</p>
          )}
          {allTags.map((t) => {
            const selected = selectedIds.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`tag-option${selected ? ' tag-option--selected' : ''}`}
                onClick={() => toggle(t.id)}
              >
                <span className="tag-option-dot" style={{ background: t.color || '#94a3b8' }} />
                <span className="tag-option-name">{t.name}</span>
                {selected && <Check size={13} className="tag-option-check" />}
              </button>
            );
          })}

          {/* Create new tag */}
          {creating ? (
            <div className="tag-create-form">
              <input
                className="tag-create-input"
                placeholder="Tên tag..."
                value={newName}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
              />
              <div className="tag-color-row">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`tag-color-dot${newColor === c ? ' tag-color-dot--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <div className="tag-create-actions">
                <button type="button" className="tag-create-btn tag-create-btn--ok" onClick={handleCreate} disabled={busy}>
                  <Check size={12} /> Tạo
                </button>
                <button type="button" className="tag-create-btn" onClick={() => { setCreating(false); setNewName(''); }}>
                  <X size={12} /> Hủy
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="tag-create-trigger" onClick={() => setCreating(true)}>
              <Plus size={13} /> Tạo tag mới
            </button>
          )}
        </div>
      )}
    </div>
  );
}
