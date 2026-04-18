import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Folder, FolderOpen, X, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#6366f1',
];

function getToken() {
  return localStorage.getItem('longpl_token');
}

/** Single node in the tree */
function CategoryNode({ node, depth, selectedId, onSelect, onCreated, onDeleted, onRenamed }) {
  const [open, setOpen] = useState(depth === 0);
  const [addingChild, setAddingChild] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [busy, setBusy] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleAddChild = async () => {
    if (!inputVal.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: inputVal.trim(),
          parent_id: node.id,
          resource_type: node.resource_type,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOpen(true);
        setAddingChild(false);
        setInputVal('');
        onCreated?.();
      } else {
        alert(data.error || 'Không thể tạo danh mục');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    if (!inputVal.trim() || inputVal.trim() === node.name) {
      setEditing(false);
      setInputVal('');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/categories/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: inputVal.trim() }),
      });
      if (res.ok) {
        setEditing(false);
        setInputVal('');
        onRenamed?.();
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Xóa danh mục "${node.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/categories/${node.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) {
        onDeleted?.();
      } else {
        alert(data.error || 'Không thể xóa danh mục');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const dotColor = node.color || '#94a3b8';

  return (
    <div className="cat-node" style={{ '--depth': depth }}>
      <div className={`cat-node-row${isSelected ? ' cat-node-row--selected' : ''}`}>
        {/* expand toggle */}
        <button
          type="button"
          className="cat-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="toggle"
        >
          {hasChildren ? (
            open ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span style={{ width: 14 }} />
          )}
        </button>

        {/* icon + label */}
        <button
          type="button"
          className="cat-label"
          onClick={() => onSelect?.(isSelected ? null : node.id)}
          title={node.name}
        >
          <span className="cat-dot" style={{ background: dotColor }} />
          {open && hasChildren ? (
            <FolderOpen size={14} style={{ color: dotColor, flexShrink: 0 }} />
          ) : (
            <Folder size={14} style={{ color: dotColor, flexShrink: 0 }} />
          )}
          {editing ? (
            <input
              className="cat-inline-input"
              value={inputVal}
              autoFocus
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditing(false); setInputVal(''); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="cat-name">{node.name}</span>
          )}
        </button>

        {/* action buttons (shown on hover via CSS) */}
        <div className="cat-actions">
          {editing ? (
            <>
              <button type="button" className="cat-act-btn" onClick={handleRename} disabled={busy}><Check size={12} /></button>
              <button type="button" className="cat-act-btn" onClick={() => { setEditing(false); setInputVal(''); }}><X size={12} /></button>
            </>
          ) : (
            <>
              {depth < 2 && (
                <button type="button" className="cat-act-btn" title="Thêm danh mục con" onClick={(e) => { e.stopPropagation(); setAddingChild(true); setOpen(true); }}><Plus size={12} /></button>
              )}
              <button type="button" className="cat-act-btn" title="Đổi tên" onClick={(e) => { e.stopPropagation(); setEditing(true); setInputVal(node.name); }}><Pencil size={12} /></button>
              <button type="button" className="cat-act-btn cat-act-btn--danger" title="Xóa" onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={busy}><Trash2 size={12} /></button>
            </>
          )}
        </div>
      </div>

      {/* inline add-child form */}
      {addingChild && (
        <div className="cat-inline-add" style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}>
          <input
            className="cat-inline-input"
            placeholder="Tên danh mục..."
            value={inputVal}
            autoFocus
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChild();
              if (e.key === 'Escape') { setAddingChild(false); setInputVal(''); }
            }}
          />
          <button type="button" className="cat-act-btn" onClick={handleAddChild} disabled={busy}><Check size={12} /></button>
          <button type="button" className="cat-act-btn" onClick={() => { setAddingChild(false); setInputVal(''); }}><X size={12} /></button>
        </div>
      )}

      {/* children */}
      {open && hasChildren && (
        <div className="cat-children">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreated={onCreated}
              onDeleted={onDeleted}
              onRenamed={onRenamed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * CategoryTree
 * Props:
 *   resourceType  — 'contract' | 'document' | 'template'
 *   selectedId    — currently filtered category id (null = all)
 *   onSelect(id)  — called when user clicks a category; id=null means "all"
 */
export default function CategoryTree({ resourceType = 'contract', selectedId, onSelect }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootInput, setRootInput] = useState('');
  const [rootColor, setRootColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/categories/${resourceType}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTree(data.categories || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTree(); }, [resourceType]);

  const handleAddRoot = async () => {
    if (!rootInput.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/v1/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: rootInput.trim(), resource_type: resourceType, color: rootColor }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddingRoot(false);
        setRootInput('');
        fetchTree();
      } else {
        alert(data.error || 'Không thể tạo danh mục');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setBusy(false);
    }
  };

  const totalCount = (nodes) => nodes.reduce((s, n) => s + 1 + (n.children ? totalCount(n.children) : 0), 0);

  return (
    <div className="cat-tree">
      {/* Header */}
      <div className="cat-tree-header">
        <span className="cat-tree-title">Danh mục</span>
        <button type="button" className="cat-add-root-btn" onClick={() => setAddingRoot((v) => !v)} title="Thêm danh mục">
          <Plus size={14} />
        </button>
      </div>

      {/* All item */}
      <button
        type="button"
        className={`cat-all-btn${!selectedId ? ' cat-all-btn--active' : ''}`}
        onClick={() => onSelect?.(null)}
      >
        <Folder size={13} />
        <span>Tất cả</span>
        <span className="cat-count">{totalCount(tree)}</span>
      </button>

      {/* Add root form */}
      {addingRoot && (
        <div className="cat-add-root-form">
          <input
            className="cat-inline-input"
            placeholder="Tên danh mục..."
            value={rootInput}
            autoFocus
            onChange={(e) => setRootInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoot();
              if (e.key === 'Escape') { setAddingRoot(false); setRootInput(''); }
            }}
          />
          <div className="cat-color-row">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`cat-color-dot${rootColor === c ? ' cat-color-dot--active' : ''}`}
                style={{ background: c }}
                onClick={() => setRootColor(c)}
              />
            ))}
          </div>
          <div className="cat-add-root-actions">
            <button type="button" className="cat-act-btn" onClick={handleAddRoot} disabled={busy}><Check size={12} /> Thêm</button>
            <button type="button" className="cat-act-btn" onClick={() => { setAddingRoot(false); setRootInput(''); }}><X size={12} /> Hủy</button>
          </div>
        </div>
      )}

      {/* Tree */}
      {loading ? (
        <p className="cat-loading">Đang tải...</p>
      ) : tree.length === 0 ? (
        <p className="cat-empty">Chưa có danh mục</p>
      ) : (
        <div className="cat-tree-nodes">
          {tree.map((node) => (
            <CategoryNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreated={fetchTree}
              onDeleted={fetchTree}
              onRenamed={fetchTree}
            />
          ))}
        </div>
      )}
    </div>
  );
}
