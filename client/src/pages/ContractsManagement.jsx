import { useState, useEffect, useRef } from 'react';
import {
  Search, Download, Trash2, Eye, Scale, UploadCloud,
  FolderOpen, X, ChevronDown, ChevronUp, AlertTriangle,
  Clock, FileText, DollarSign, Users, Tag, SlidersHorizontal,
} from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import CategoryTree from '../components/shared/CategoryTree';
import TagSelector from '../components/shared/TagSelector';
import { fetchWithAuth } from '../utils/fetchWithAuth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getToken() {
  return localStorage.getItem('longpl_token');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const WORKFLOW_LABELS = {
  draft: { label: 'Nháp', cls: 'wf-draft' },
  pending_review: { label: 'Chờ duyệt', cls: 'wf-pending' },
  approved: { label: 'Đã duyệt', cls: 'wf-approved' },
  signed: { label: 'Đã ký', cls: 'wf-signed' },
  active: { label: 'Có hiệu lực', cls: 'wf-active' },
  expired: { label: 'Hết hạn', cls: 'wf-expired' },
  terminated: { label: 'Đã chấm dứt', cls: 'wf-terminated' },
};

const CONTRACT_TYPES = [
  { value: 'hop_dong_lao_dong', label: 'Hợp đồng lao động' },
  { value: 'hop_dong_dich_vu', label: 'Hợp đồng dịch vụ' },
  { value: 'hop_dong_thuong_mai', label: 'Hợp đồng thương mại' },
  { value: 'hop_dong_mua_ban', label: 'Hợp đồng mua bán' },
  { value: 'hop_dong_thue', label: 'Hợp đồng thuê' },
  { value: 'hop_dong_bao_hiem', label: 'Hợp đồng bảo hiểm' },
  { value: 'hop_dong_bao_mat', label: 'Hợp đồng bảo mật (NDA)' },
  { value: 'other', label: 'Loại khác' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtCurrency = (v, c = 'VND') => {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v);
};

const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return null;
  const now = Date.now();
  const exp = new Date(expiryDate).getTime();
  const diff = exp - now;
  if (diff < 0) return 'expired';
  if (diff < 30 * 86400 * 1000) return 'soon'; // < 30 days
  if (diff < 60 * 86400 * 1000) return 'warning'; // < 60 days
  return 'ok';
};

const getRiskBadge = (contract) => {
  const score = contract.review_result?.risk_score;
  if (typeof score !== 'number') return { text: 'Chưa review', cls: 'risk-neutral' };
  if (score >= 70) return { text: `Rủi ro ${score}%`, cls: 'risk-danger' };
  if (score >= 40) return { text: `Rủi ro ${score}%`, cls: 'risk-warning' };
  return { text: `Rủi ro ${score}%`, cls: 'risk-safe' };
};

// ─── Upload Modal (AI Auto-fill) ──────────────────────────────────────────────
const FIELD_LABELS = {
  party_a_name: 'Bên A', party_b_name: 'Bên B', party_b_tax_code: 'MST Bên B',
  signed_date: 'Ngày ký', effective_date: 'Ngày hiệu lực', expiry_date: 'Ngày hết hạn',
  contract_value: 'Giá trị', currency: 'Tiền tệ', workflow_status: 'Trạng thái',
};

function AiBadge({ state }) {
  if (state === 'ai') return <span className="ai-badge ai-badge--filled">✦ AI điền</span>;
  if (state === 'missing') return <span className="ai-badge ai-badge--missing">⚠ Cần điền</span>;
  return null;
}

function SmartField({ label, fieldKey, aiState, onUserEdit, required, children }) {
  return (
    <div className={`cm-field cm-field--smart${aiState === 'ai' ? ' cm-field--ai-filled' : aiState === 'missing' ? ' cm-field--ai-missing' : ''}`}>
      <label>
        {label}
        {required && <span className="req"> *</span>}
        <AiBadge state={aiState} />
      </label>
      <div onClick={onUserEdit}>{children}</div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }) {
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({
    party_a_name: '', party_b_name: '', party_b_tax_code: '',
    effective_date: '', expiry_date: '', signed_date: '',
    contract_value: '', currency: 'VND', notes: '',
    workflow_status: 'draft',
  });
  const [categoryId, setCategoryId] = useState(null);
  const [tagIds, setTagIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState('');
  const [error, setError] = useState('');
  // aiState: per-field 'ai' | 'missing' | null
  const [aiState, setAiState] = useState({});
  // Track which fields user has manually edited (clears ai badge)
  const markEdited = (k) => setAiState((s) => ({ ...s, [k]: null }));

  const set = (k, v) => {
    setFields((f) => ({ ...f, [k]: v }));
    markEdited(k);
  };

  // ── Auto-parse when file selected ────────────────────────────────────────────
  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParseMsg('');
    setAiState({});

    // Only parse formats the server can handle
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return;

    setParsing(true);
    setParseMsg('AI đang phân tích hợp đồng...');
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const token = localStorage.getItem('longpl_token');
      const res = await fetch(`${API_URL}/v1/contracts/parse-meta`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.fields) {
        setParseMsg(data.message || 'AI không trích xuất được thông tin, vui lòng điền thủ công.');
        return;
      }

      // Pre-fill extracted fields
      const newFields = { ...fields };
      const newAiState = {};

      const MAP = {
        party_a_name: 'party_a_name', party_b_name: 'party_b_name',
        party_b_tax_code: 'party_b_tax_code', signed_date: 'signed_date',
        effective_date: 'effective_date', expiry_date: 'expiry_date',
        contract_value: 'contract_value', currency: 'currency',
        workflow_status: 'workflow_status',
      };

      for (const [apiKey, stateKey] of Object.entries(MAP)) {
        if (data.fields[apiKey] !== undefined && data.fields[apiKey] !== null) {
          newFields[stateKey] = String(data.fields[apiKey]);
          newAiState[stateKey] = 'ai';
        } else if ((data.missing || []).includes(apiKey)) {
          newAiState[stateKey] = 'missing';
        }
      }

      setFields(newFields);
      setAiState(newAiState);

      const filledCount = Object.values(newAiState).filter((v) => v === 'ai').length;
      const missingCount = (data.missing || []).length;
      setParseMsg(
        `✦ AI đã điền ${filledCount} trường.${missingCount > 0 ? ` ${missingCount} trường cần bổ sung thủ công (viền vàng).` : ''}`
      );
    } catch {
      setParseMsg('Lỗi khi phân tích — vui lòng điền thủ công.');
    } finally {
      setParsing(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Vui lòng chọn file hợp đồng.'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (categoryId) fd.append('category_id', categoryId);
      if (tagIds.length) fd.append('tag_ids', JSON.stringify(tagIds));
      Object.entries(fields).forEach(([k, v]) => { if (v) fd.append(k, v); });

      const token = localStorage.getItem('longpl_token');
      const res = await fetch(`${API_URL}/v1/contracts/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        onUploaded?.();
        onClose();
      } else {
        setError(data.error || 'Upload thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setBusy(false);
    }
  };

  const missingCount = Object.values(aiState).filter((v) => v === 'missing').length;

  return (
    <div className="cm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal">
        <div className="cm-modal-header">
          <div>
            <h3>Upload hợp đồng</h3>
            {parsing && <p className="cm-parse-status cm-parse-status--loading">{parseMsg}</p>}
            {!parsing && parseMsg && (
              <p className={`cm-parse-status${missingCount > 0 ? ' cm-parse-status--warn' : ' cm-parse-status--ok'}`}>
                {parseMsg}
              </p>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form className="cm-modal-body" onSubmit={handleSubmit}>
          {/* File picker */}
          <div className="cm-field cm-field--file">
            <label>File hợp đồng <span className="req">*</span></label>
            <div
              className={`cm-file-drop${file ? ' cm-file-drop--has-file' : ''}${parsing ? ' cm-file-drop--parsing' : ''}`}
              onClick={() => !parsing && fileRef.current?.click()}
            >
              {parsing ? (
                <>
                  <span className="ai-spinner" />
                  <span>AI đang phân tích...</span>
                </>
              ) : file ? (
                <>
                  <FileText size={20} />
                  <span>{file.name}</span>
                  <span className="cm-file-size">({(file.size / 1024).toFixed(0)} KB)</span>
                </>
              ) : (
                <>
                  <UploadCloud size={20} />
                  <span>Kéo thả hoặc nhấn để chọn file</span>
                  <span className="cm-file-hint">PDF, DOCX, DOC, TXT — tối đa 20MB · AI sẽ tự điền thông tin</span>
                </>
              )}
            </div>
            <input
              ref={fileRef} type="file" hidden
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          {/* AI legend */}
          {Object.keys(aiState).length > 0 && (
            <div className="ai-legend">
              <span className="ai-badge ai-badge--filled">✦ AI điền</span> — AI trích xuất được
              &nbsp;·&nbsp;
              <span className="ai-badge ai-badge--missing">⚠ Cần điền</span> — không tìm thấy trong văn bản
            </div>
          )}

          <div className="cm-fields-grid">
            <SmartField label="Bên A (đơn vị)" fieldKey="party_a_name" aiState={aiState.party_a_name} onUserEdit={() => {}}>
              <input value={fields.party_a_name} onChange={(e) => set('party_a_name', e.target.value)} placeholder="Tên bên A..." />
            </SmartField>
            <SmartField label="Bên B (đối tác)" fieldKey="party_b_name" aiState={aiState.party_b_name} onUserEdit={() => {}}>
              <input value={fields.party_b_name} onChange={(e) => set('party_b_name', e.target.value)} placeholder="Tên bên B..." />
            </SmartField>
            <SmartField label="Mã số thuế Bên B" fieldKey="party_b_tax_code" aiState={aiState.party_b_tax_code} onUserEdit={() => {}}>
              <input value={fields.party_b_tax_code} onChange={(e) => set('party_b_tax_code', e.target.value)} placeholder="0123456789" />
            </SmartField>
            <SmartField label="Trạng thái" fieldKey="workflow_status" aiState={aiState.workflow_status} onUserEdit={() => {}}>
              <select value={fields.workflow_status} onChange={(e) => set('workflow_status', e.target.value)}>
                {Object.entries(WORKFLOW_LABELS).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </SmartField>
            <SmartField label="Ngày ký" fieldKey="signed_date" aiState={aiState.signed_date} onUserEdit={() => {}}>
              <input type="date" value={fields.signed_date} onChange={(e) => set('signed_date', e.target.value)} />
            </SmartField>
            <SmartField label="Ngày hiệu lực" fieldKey="effective_date" aiState={aiState.effective_date} onUserEdit={() => {}}>
              <input type="date" value={fields.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
            </SmartField>
            <SmartField label="Ngày hết hạn" fieldKey="expiry_date" aiState={aiState.expiry_date} onUserEdit={() => {}}>
              <input type="date" value={fields.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
            </SmartField>
            <SmartField label="Giá trị hợp đồng" fieldKey="contract_value" aiState={aiState.contract_value} onUserEdit={() => {}}>
              <div className="cm-field-inline">
                <input type="number" value={fields.contract_value} onChange={(e) => set('contract_value', e.target.value)} placeholder="0" style={{ flex: 1 }} />
                <select value={fields.currency} onChange={(e) => set('currency', e.target.value)} style={{ width: 80 }}>
                  <option>VND</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
            </SmartField>
          </div>

          {/* Category */}
          <div className="cm-field">
            <label>Danh mục</label>
            <div className="cm-upload-cat-tree">
              <CategoryTree resourceType="contract" selectedId={categoryId} onSelect={setCategoryId} />
            </div>
          </div>

          {/* Tags */}
          <div className="cm-field">
            <label>Tags</label>
            <TagSelector selectedIds={tagIds} onChange={setTagIds} />
          </div>

          {/* Notes */}
          <div className="cm-field">
            <label>Ghi chú nội bộ</label>
            <textarea rows={3} value={fields.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ghi chú..." />
          </div>

          {error && <p className="cm-error">{error}</p>}

          <div className="cm-modal-footer">
            <button type="button" className="action-btn action-btn--tertiary" onClick={onClose}>Hủy</button>
            <button type="submit" className="action-btn action-btn--primary" disabled={busy || parsing}>
              <UploadCloud size={15} />
              {busy ? 'Đang upload...' : 'Upload hợp đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ contract, onClose, onSaved }) {
  const [fields, setFields] = useState({
    name: contract.name || '',
    contract_type: contract.contract_type || 'other',
    party_a_name: contract.party_a_name || '',
    party_b_name: contract.party_b_name || '',
    party_b_tax_code: contract.party_b_tax_code || '',
    effective_date: contract.effective_date ? contract.effective_date.slice(0, 10) : '',
    expiry_date: contract.expiry_date ? contract.expiry_date.slice(0, 10) : '',
    signed_date: contract.signed_date ? contract.signed_date.slice(0, 10) : '',
    contract_value: contract.contract_value ?? '',
    currency: contract.currency || 'VND',
    workflow_status: contract.workflow_status || 'draft',
    notes: contract.notes || '',
  });
  const [tagIds, setTagIds] = useState((contract.tags || []).map((t) => t.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setFields((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, tag_ids: tagIds }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved?.();
        onClose();
      } else {
        setError(data.error || 'Cập nhật thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal">
        <div className="cm-modal-header">
          <h3>Chỉnh sửa hợp đồng</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="cm-modal-body" onSubmit={handleSubmit}>
          <div className="cm-field">
            <label>Tên hợp đồng</label>
            <input value={fields.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          <div className="cm-fields-grid">
            <div className="cm-field">
              <label>Loại hợp đồng</label>
              <select value={fields.contract_type} onChange={(e) => set('contract_type', e.target.value)}>
                {CONTRACT_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="cm-field">
              <label>Trạng thái</label>
              <select value={fields.workflow_status} onChange={(e) => set('workflow_status', e.target.value)}>
                {Object.entries(WORKFLOW_LABELS).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div className="cm-field">
              <label>Bên A</label>
              <input value={fields.party_a_name} onChange={(e) => set('party_a_name', e.target.value)} placeholder="Tên bên A..." />
            </div>
            <div className="cm-field">
              <label>Bên B</label>
              <input value={fields.party_b_name} onChange={(e) => set('party_b_name', e.target.value)} placeholder="Tên bên B..." />
            </div>
            <div className="cm-field">
              <label>MST Bên B</label>
              <input value={fields.party_b_tax_code} onChange={(e) => set('party_b_tax_code', e.target.value)} placeholder="0123456789" />
            </div>
            <div className="cm-field">
              <label>Giá trị</label>
              <div className="cm-field-inline">
                <input type="number" value={fields.contract_value} onChange={(e) => set('contract_value', e.target.value)} style={{ flex: 1 }} />
                <select value={fields.currency} onChange={(e) => set('currency', e.target.value)} style={{ width: 80 }}>
                  <option>VND</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div className="cm-field">
              <label>Ngày ký</label>
              <input type="date" value={fields.signed_date} onChange={(e) => set('signed_date', e.target.value)} />
            </div>
            <div className="cm-field">
              <label>Hiệu lực từ</label>
              <input type="date" value={fields.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
            </div>
            <div className="cm-field cm-field--span2">
              <label>Ngày hết hạn</label>
              <input type="date" value={fields.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
            </div>
          </div>

          <div className="cm-field">
            <label>Tags</label>
            <TagSelector selectedIds={tagIds} onChange={setTagIds} />
          </div>
          <div className="cm-field">
            <label>Ghi chú nội bộ</label>
            <textarea rows={3} value={fields.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {error && <p className="cm-error">{error}</p>}

          <div className="cm-modal-footer">
            <button type="button" className="action-btn action-btn--tertiary" onClick={onClose}>Hủy</button>
            <button type="submit" className="action-btn action-btn--primary" disabled={busy}>
              {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ contract, onClose, onEdit, onReview, reviewBusy }) {
  if (!contract) return null;
  const risk = getRiskBadge(contract);
  const wf = WORKFLOW_LABELS[contract.workflow_status] || { label: contract.workflow_status, cls: 'wf-draft' };
  const expiryStatus = getExpiryStatus(contract.expiry_date);

  return (
    <div className="cm-drawer">
      <div className="cm-drawer-header">
        <h3 className="cm-drawer-title">{contract.name}</h3>
        <div className="cm-drawer-header-actions">
          <button type="button" className="icon-btn" onClick={() => onEdit(contract)} title="Chỉnh sửa"><Scale size={15} /></button>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
      </div>

      <div className="cm-drawer-body">
        {/* Status badges */}
        <div className="cm-drawer-badges">
          <span className={`wf-badge ${wf.cls}`}>{wf.label}</span>
          <span className={`risk-badge ${risk.cls}`}>{risk.text}</span>
        </div>

        <div className="cm-detail-section">
          <h4><Users size={14} /> Các bên</h4>
          <div className="cm-detail-grid">
            <div><span className="cm-detail-label">Bên A</span><span>{contract.party_a_name || '—'}</span></div>
            <div><span className="cm-detail-label">Bên B</span><span>{contract.party_b_name || '—'}</span></div>
            <div><span className="cm-detail-label">MST Bên B</span><span>{contract.party_b_tax_code || '—'}</span></div>
          </div>
        </div>

        <div className="cm-detail-section">
          <h4><Clock size={14} /> Thời hạn</h4>
          <div className="cm-detail-grid">
            <div><span className="cm-detail-label">Ngày ký</span><span>{fmtDate(contract.signed_date)}</span></div>
            <div><span className="cm-detail-label">Hiệu lực từ</span><span>{fmtDate(contract.effective_date)}</span></div>
            <div>
              <span className="cm-detail-label">Hết hạn</span>
              <span className={expiryStatus === 'expired' ? 'text-danger' : expiryStatus === 'soon' ? 'text-warning' : ''}>
                {fmtDate(contract.expiry_date)}
                {expiryStatus === 'expired' && <AlertTriangle size={13} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
              </span>
            </div>
          </div>
        </div>

        <div className="cm-detail-section">
          <h4><DollarSign size={14} /> Giá trị</h4>
          <p className="cm-detail-value">{fmtCurrency(contract.contract_value, contract.currency)}</p>
        </div>

        {contract.category && (
          <div className="cm-detail-section">
            <h4><FolderOpen size={14} /> Danh mục</h4>
            <span className="cat-pill" style={{ '--cat-color': contract.category.color || '#94a3b8' }}>
              {contract.category.name}
            </span>
          </div>
        )}

        {contract.tags?.length > 0 && (
          <div className="cm-detail-section">
            <h4><Tag size={14} /> Tags</h4>
            <div className="tag-pills">
              {contract.tags.map((t) => (
                <span key={t.id} className="tag-pill" style={{ '--tag-color': t.color || '#94a3b8' }}>{t.name}</span>
              ))}
            </div>
          </div>
        )}

        {contract.notes && (
          <div className="cm-detail-section">
            <h4>Ghi chú</h4>
            <p className="cm-detail-notes">{contract.notes}</p>
          </div>
        )}

        {contract.review_result && (
          <div className="cm-detail-section">
            <h4>Kết quả AI Review</h4>
            <p className="cm-detail-notes" style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
              {typeof contract.review_result.summary === 'string'
                ? contract.review_result.summary
                : JSON.stringify(contract.review_result, null, 2)}
            </p>
          </div>
        )}
      </div>

      <div className="cm-drawer-footer">
        {contract.file_url && (
          <a
            href={contract.file_url}
            target="_blank"
            rel="noreferrer"
            className="action-btn action-btn--tertiary"
            download
          >
            <Download size={15} /> Tải file
          </a>
        )}
        <button
          type="button"
          className="action-btn action-btn--secondary"
          onClick={() => onReview(contract)}
          disabled={reviewBusy}
        >
          <Scale size={15} />
          {reviewBusy ? 'Đang review...' : 'AI Review'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContractsManagement({ onReviewClick, reviewBusy }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [search, setSearch] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [detailContract, setDetailContract] = useState(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategoryId) params.set('category_id', selectedCategoryId);
      if (workflowFilter !== 'all') params.set('workflow_status', workflowFilter);
      // Tag filter is done client-side since it's complex with multiple tags

      const res = await fetchWithAuth(`${API_URL}/v1/contracts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/tags`);
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchContracts();
    fetchTags();
  }, [selectedCategoryId, workflowFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchContracts, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Client-side tag filter + sort
  const filteredContracts = contracts
    .filter((c) => {
      if (!selectedTagIds.length) return true;
      return selectedTagIds.every((tid) => c.tags?.some((t) => t.id === tid));
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'expiry-asc': return new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999');
        case 'value-desc': return (b.contract_value || 0) - (a.contract_value || 0);
        case 'date-asc': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa hợp đồng này?')) return;
    try {
      await fetchWithAuth(`${API_URL}/v1/contracts/${id}`, {
        method: 'DELETE',
      });
      fetchContracts();
      if (detailContract?.id === id) setDetailContract(null);
    } catch { /* ignore */ }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Xóa ${selectedIds.size} hợp đồng?`)) return;
    await Promise.all([...selectedIds].map((id) =>
      fetchWithAuth(`${API_URL}/v1/contracts/${id}`, {
        method: 'DELETE',
      })
    ));
    setSelectedIds(new Set());
    fetchContracts();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContracts.length && filteredContracts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContracts.map((c) => c.id)));
    }
  };

  const stats = {
    total: contracts.length,
    reviewed: contracts.filter((c) => c.review_result?.risk_score != null).length,
    expiringSoon: contracts.filter((c) => ['soon', 'warning'].includes(getExpiryStatus(c.expiry_date))).length,
    expired: contracts.filter((c) => getExpiryStatus(c.expiry_date) === 'expired').length,
  };

  return (
    <div className="cm-page">
      <PageHero
        icon={<FolderOpen size={32} />}
        title="Quản lý Hợp Đồng"
        subtitle="Tổ chức, theo dõi và quản lý toàn bộ hợp đồng theo danh mục và trạng thái"
        pills={[
          `${stats.total} hợp đồng`,
          `${stats.reviewed} đã review`,
          stats.expiringSoon > 0 && `${stats.expiringSoon} sắp hết hạn`,
          stats.expired > 0 && `${stats.expired} đã hết hạn`,
        ].filter(Boolean)}
      />

      <div className="cm-layout">
        {/* ── Left sidebar (HIDDEN) ── */}
        <aside className="cm-sidebar" style={{ display: 'none' }}>
          <CategoryTree
            resourceType="contract"
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />

          {/* Tag filter */}
          <div className="cm-sidebar-section">
            <span className="cm-sidebar-section-title">Lọc theo Tags</span>
            {allTags.length === 0 ? (
              <p className="cat-empty">Chưa có tag</p>
            ) : (
              <div className="cm-tag-filter-list">
                {allTags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`cm-tag-filter-item${selectedTagIds.includes(t.id) ? ' cm-tag-filter-item--active' : ''}`}
                    onClick={() => {
                      setSelectedTagIds((prev) =>
                        prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                      );
                    }}
                  >
                    <span className="tag-option-dot" style={{ background: t.color || '#94a3b8' }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="cm-main">
          {/* Action bar */}
          <div className="management-actions">
            <button type="button" className="action-btn action-btn--primary" onClick={() => setShowUpload(true)}>
              <UploadCloud size={16} /> Upload hợp đồng
            </button>
            <button type="button" className="action-btn action-btn--secondary" disabled={reviewBusy}>
              <Scale size={16} /> {reviewBusy ? 'Đang review...' : 'AI Review được chọn'}
            </button>
            {selectedIds.size > 0 && (
              <button type="button" className="action-btn action-btn--danger" onClick={handleBulkDelete}>
                <Trash2 size={16} /> Xóa ({selectedIds.size})
              </button>
            )}
            <button
              type="button"
              className={`action-btn action-btn--tertiary${showFilters ? ' action-btn--active' : ''}`}
              onClick={() => setShowFilters((v) => !v)}
              style={{ marginLeft: 'auto' }}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
          </div>

          {/* Toolbar */}
          <div className="management-toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Tìm theo tên, bên A, bên B, MST..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="filter-group">
                <select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="filter-select">
                  <option value="all">Tất cả trạng thái</option>
                  {Object.entries(WORKFLOW_LABELS).map(([v, { label }]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                  <option value="date-desc">Mới nhất</option>
                  <option value="date-asc">Cũ nhất</option>
                  <option value="name-asc">Tên (A-Z)</option>
                  <option value="name-desc">Tên (Z-A)</option>
                  <option value="expiry-asc">Hết hạn sớm nhất</option>
                  <option value="value-desc">Giá trị cao nhất</option>
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="management-empty"><p>Đang tải dữ liệu...</p></div>
          ) : filteredContracts.length === 0 ? (
            <div className="management-empty">
              <FolderOpen size={48} />
              <h3>{contracts.length === 0 ? 'Chưa có hợp đồng' : 'Không có kết quả'}</h3>
              <p>{contracts.length === 0 ? 'Nhấn "Upload hợp đồng" để bắt đầu' : 'Thử thay đổi bộ lọc'}</p>
            </div>
          ) : (
            <div className={`cm-table-wrapper${detailContract ? ' cm-table-wrapper--narrow' : ''}`}>
              <div className="management-table-container">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredContracts.length && filteredContracts.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Tên hợp đồng</th>
                      {!detailContract && <th>Bên B</th>}
                      <th>Trạng thái</th>
                      <th>
                        <div className="th-sortable" onClick={() => setSortBy(sortBy === 'expiry-asc' ? 'date-desc' : 'expiry-asc')}>
                          Hết hạn {sortBy === 'expiry-asc' && <ChevronUp size={13} />}
                        </div>
                      </th>
                      {!detailContract && <th>Giá trị</th>}
                      {!detailContract && <th>Tags</th>}
                      <th>Rủi ro</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((c) => {
                      const risk = getRiskBadge(c);
                      const wf = WORKFLOW_LABELS[c.workflow_status] || { label: c.workflow_status, cls: 'wf-draft' };
                      const exp = getExpiryStatus(c.expiry_date);
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={`${isSelected ? 'row-selected' : ''}${detailContract?.id === c.id ? ' row-active' : ''}`}
                        >
                          <td><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} /></td>
                          <td className="col-name">
                            <button
                              type="button"
                              className="cm-contract-name-btn"
                              onClick={() => setDetailContract(detailContract?.id === c.id ? null : c)}
                            >
                              <FileText size={14} className="cm-file-icon" />
                              <span className="contract-name">{c.name}</span>
                              {c.category && (
                                <span className="cat-mini-pill" style={{ '--cat-color': c.category.color || '#94a3b8' }}>
                                  {c.category.name}
                                </span>
                              )}
                            </button>
                          </td>
                          {!detailContract && (
                            <td className="col-party">
                              <span className="cm-party-name">{c.party_b_name || '—'}</span>
                              {c.party_b_tax_code && <span className="cm-tax-code">{c.party_b_tax_code}</span>}
                            </td>
                          )}
                          <td><span className={`wf-badge ${wf.cls}`}>{wf.label}</span></td>
                          <td className="col-date">
                            {c.expiry_date ? (
                              <span className={`cm-expiry${exp === 'expired' ? ' cm-expiry--expired' : exp === 'soon' ? ' cm-expiry--soon' : exp === 'warning' ? ' cm-expiry--warning' : ''}`}>
                                {exp === 'expired' && <AlertTriangle size={12} />}
                                {exp === 'soon' && <Clock size={12} />}
                                {fmtDate(c.expiry_date)}
                              </span>
                            ) : '—'}
                          </td>
                          {!detailContract && (
                            <td className="col-value">{fmtCurrency(c.contract_value, c.currency)}</td>
                          )}
                          {!detailContract && (
                            <td>
                              <div className="tag-pills">
                                {(c.tags || []).map((t) => (
                                  <span key={t.id} className="tag-pill" style={{ '--tag-color': t.color || '#94a3b8' }}>{t.name}</span>
                                ))}
                                {!c.tags?.length && <span className="tag-pill-empty">—</span>}
                              </div>
                            </td>
                          )}
                          <td><span className={`risk-badge ${risk.cls}`}>{risk.text}</span></td>
                          <td className="col-actions">
                            <button type="button" className="icon-btn" title="Xem chi tiết" onClick={() => setDetailContract(detailContract?.id === c.id ? null : c)}>
                              <Eye size={15} />
                            </button>
                            <button type="button" className="icon-btn" title="Chỉnh sửa" onClick={() => setEditingContract(c)}>
                              <Scale size={15} />
                            </button>
                            <button type="button" className="icon-btn icon-btn--danger" title="Xóa" onClick={() => handleDelete(c.id)}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail drawer ── */}
        {detailContract && (
          <DetailDrawer
            contract={detailContract}
            onClose={() => setDetailContract(null)}
            onEdit={(c) => { setEditingContract(c); setDetailContract(null); }}
            onReview={(c) => onReviewClick?.(c)}
            reviewBusy={reviewBusy}
          />
        )}
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchContracts(); fetchTags(); }}
        />
      )}
      {editingContract && (
        <EditModal
          contract={editingContract}
          onClose={() => setEditingContract(null)}
          onSaved={() => {
            fetchContracts();
            if (detailContract?.id === editingContract.id) setDetailContract(null);
          }}
        />
      )}
    </div>
  );
}
