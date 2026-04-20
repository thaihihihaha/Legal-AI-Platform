import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Star, Copy, X, FileText, PlusCircle, Trash2, Settings2, Tag, Edit } from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import { CopyPlus } from 'lucide-react';
import DraftEditor from '../components/DraftEditor';
import DraftListModal from '../components/DraftListModal';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Mapping field names từ Anh sang Việt + diễn giải
const FIELD_MAPPING = {
  // Labor Contract Basic - Hợp đồng lao động cơ bản
  company_name: {
    label: 'Tên công ty',
    description: 'Nhập tên chính thức của công ty/tổ chức',
    placeholder: 'VD: Công ty Cổ phần ABC'
  },
  employee_name: {
    label: 'Tên nhân viên',
    description: 'Nhập họ tên đầy đủ của nhân viên',
    placeholder: 'VD: Nguyễn Văn A'
  },
  position: {
    label: 'Chức vụ',
    description: 'Nhập vị trí công việc của nhân viên',
    placeholder: 'VD: Kỹ sư Phần mềm'
  },
  salary: {
    label: 'Lương tháng',
    description: 'Nhập mức lương tháng (đơn vị: VND)',
    placeholder: 'VD: 20000000'
  },
  work_location: {
    label: 'Nơi làm việc',
    description: 'Nhập địa chỉ nơi làm việc chính',
    placeholder: 'VD: Hà Nội'
  },
  start_date: {
    label: 'Ngày bắt đầu',
    description: 'Nhập ngày bắt đầu công việc (định dạng: DD/MM/YYYY)',
    placeholder: 'VD: 01/01/2024'
  },
  
  // Service Contract Basic - Hợp đồng dịch vụ cơ bản
  client_name: {
    label: 'Tên khách hàng',
    description: 'Nhập tên công ty/cá nhân đặt mua dịch vụ',
    placeholder: 'VD: Công ty XYZ'
  },
  vendor_name: {
    label: 'Tên nhà cung cấp dịch vụ',
    description: 'Nhập tên công ty/cá nhân cung cấp dịch vụ',
    placeholder: 'VD: Công ty DEF'
  },
  service_scope: {
    label: 'Phạm vi dịch vụ',
    description: 'Mô tả chi tiết các dịch vụ sẽ cung cấp',
    placeholder: 'VD: Thiết kế website, bảo trì hệ thống, hỗ trợ kỹ thuật'
  },
  fee: {
    label: 'Chi phí dịch vụ',
    description: 'Nhập tổng chi phí dịch vụ (đơn vị: VND)',
    placeholder: 'VD: 50000000'
  },
  payment_terms: {
    label: 'Điều khoản thanh toán',
    description: 'Mô tả cách thức và lịch trình thanh toán',
    placeholder: 'VD: 50% trước, 50% sau hoàn thành'
  },
  effective_date: {
    label: 'Ngày có hiệu lực',
    description: 'Nhập ngày hợp đồng có hiệu lực (định dạng: DD/MM/YYYY)',
    placeholder: 'VD: 01/01/2024'
  },
  
  // Notification Basic - Thông báo nội bộ
  issuer_name: {
    label: 'Người phát hành',
    description: 'Nhập tên người/bộ phận phát hành thông báo',
    placeholder: 'VD: Phòng Nhân sự'
  },
  notice_subject: {
    label: 'Tiêu đề thông báo',
    description: 'Nhập tiêu đề chính của thông báo',
    placeholder: 'VD: Thông báo lịch nghỉ Tết 2024'
  },
  notice_body: {
    label: 'Nội dung thông báo',
    description: 'Nhập nội dung chi tiết của thông báo',
    placeholder: 'VD: Công ty thông báo lịch nghỉ Tết 2024 từ ngày 01/02 đến 10/02...'
  },
  issue_date: {
    label: 'Ngày phát hành',
    description: 'Nhập ngày phát hành thông báo (định dạng: DD/MM/YYYY)',
    placeholder: 'VD: 15/01/2024'
  },
  
  // Legacy fields
  expiry_date: {
    label: 'Ngày hết hạn',
    description: 'Nhập ngày hợp đồng hết hạn (định dạng: DD/MM/YYYY)',
    placeholder: 'VD: 31/12/2025'
  },
  party_a_name: {
    label: 'Bên A - Tên',
    description: 'Nhập tên công ty/cá nhân bên A (bên cho thuê/chủ đầu tư)',
    placeholder: 'VD: Công ty ABC'
  },
  party_b_name: {
    label: 'Bên B - Tên',
    description: 'Nhập tên công ty/cá nhân bên B (bên thuê/bên mua)',
    placeholder: 'VD: Công ty XYZ'
  },
  contract_value: {
    label: 'Giá trị hợp đồng',
    description: 'Nhập tổng giá trị hợp đồng (đơn vị: VND)',
    placeholder: 'VD: 100000000'
  },
  
  // Official Letter - Công văn
  sender_name: {
    label: 'Tên người gửi',
    description: 'Nhập họ tên người gửi văn bản',
    placeholder: 'VD: Nguyễn Văn A'
  },
  sender_department: {
    label: 'Phòng ban trực thuộc',
    description: 'Nhập tên phòng ban gửi văn bản',
    placeholder: 'VD: Phòng Hành chính - Nhân sự'
  },
  recipient_name: {
    label: 'Tên người nhận (hoặc Cơ quan nhận)',
    description: 'Nhập tên cơ quan, tổ chức hoặc cá nhân nhận văn bản',
    placeholder: 'VD: Công ty TNHH ABC / Ông Trần Văn B'
  },
  subject: {
    label: 'Trích yếu nội dung (Tiêu đề)',
    description: 'Nhập tiêu đề khái quát nội dung của văn bản',
    placeholder: 'VD: V/v Hợp tác kinh doanh'
  },
  content: {
    label: 'Nội dung chi tiết',
    description: 'Nhập nội dung chi tiết của văn bản',
    placeholder: 'VD: Căn cứ vào biên bản ghi nhớ...'
  },
  
  // Decision - Quyết định
  issuer_position: {
    label: 'Chức vụ người ban hành',
    description: 'Nhập chức vụ của người có thẩm quyền ban hành',
    placeholder: 'VD: Giám đốc'
  },
  decision_title: {
    label: 'Tên Quyết định',
    description: 'Nhập tiêu đề hoặc tên của quyết định',
    placeholder: 'VD: Quyết định thành lập ban dự án mới'
  },
  decision_content: {
    label: 'Nội dung quyết định',
    description: 'Nhập chi tiết các điều khoản quyết định',
    placeholder: 'VD: Điều 1: Cử ông Nguyễn Văn A làm Trưởng ban...'
  },
  announcement_date: {
    label: 'Ngày công bố',
    description: 'Nhập ngày công bố quyết định (định dạng: DD/MM/YYYY)',
    placeholder: 'VD: 10/05/2024'
  },
  
  // Appointment - Bổ nhiệm
  old_position: {
    label: 'Chức vụ cũ',
    description: 'Nhập chức vụ hiện tại/cũ của nhân sự',
    placeholder: 'VD: Phó phòng Marketing'
  },
  new_position: {
    label: 'Chức vụ mới',
    description: 'Nhập chức vụ mới được bổ nhiệm',
    placeholder: 'VD: Trưởng phòng Marketing'
  },
  appointment_date: {
    label: 'Ngày bổ nhiệm',
    description: 'Nhập ngày quyết định bổ nhiệm bắt đầu có hiệu lực',
    placeholder: 'VD: 01/06/2024'
  }
};

const TEMPLATE_CATEGORIES = [
  { value: 'hop_dong_lao_dong', label: 'Hợp đồng lao động' },
  { value: 'hop_dong_dich_vu', label: 'Hợp đồng dịch vụ' },
  { value: 'hop_dong_thuong_mai', label: 'Hợp đồng thương mại' },
  { value: 'hop_dong_mua_ban', label: 'Hợp đồng mua bán' },
  { value: 'thong_bao', label: 'Thông báo nội bộ' },
  { value: 'cong_van', label: 'Công văn' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'bien_ban', label: 'Biên bản' },
  { value: 'bao_cao', label: 'Báo cáo' },
  { value: 'other', label: 'Khác' },
];

// ─── Toolbar nhỏ cho template editor ─────────────────────────────────────────
function MiniToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div className="template-editor-toolbar">
      {[
        { label: 'B', cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Đậm' },
        { label: <em>I</em>, cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Nghiêng' },
        { label: <span style={{ textDecoration: 'underline' }}>U</span>, cmd: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: 'Gạch chân' },
      ].map((btn, i) => (
        <button key={i} type="button" className={btn.active ? 'active' : ''} onClick={btn.cmd} title={btn.title}>{btn.label}</button>
      ))}
      <span className="toolbar-sep" />
      {['H1','H2','H3'].map((h, i) => (
        <button key={h} type="button" className={editor.isActive('heading', { level: i+1 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: i+1 }).run()} title={`Tiêu đề ${i+1}`}>{h}</button>
      ))}
      <span className="toolbar-sep" />
      <button type="button" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Danh sách">●</button>
      <button type="button" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Danh sách số">1.</button>
      <span className="toolbar-sep" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} title="Hoàn tác">↶</button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} title="Làm lại">↷</button>
    </div>
  );
}

// ─── Modal tạo / chỉnh sửa mẫu văn bản ──────────────────────────────────────
function CreateTemplateModal({ template, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    category: template?.category || 'other',
    description: template?.description || '',
  });
  const [variables, setVariables] = useState(
    Array.isArray(template?.variables) ? template.variables : []
  );
  const [newVar, setNewVar] = useState({ key: '', label: '', placeholder: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!template?.id;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: template?.content || '<p>Nhập nội dung mẫu văn bản tại đây...</p>',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const insertVariable = (key) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`{{${key}}}`).run();
  };

  const addVariable = () => {
    if (!newVar.key.trim()) return;
    const key = newVar.key.trim().replace(/\s+/g, '_').toLowerCase();
    if (variables.find((v) => v.key === key)) return;
    setVariables((prev) => [...prev, { key, label: newVar.label || key, placeholder: newVar.placeholder || '' }]);
    setNewVar({ key: '', label: '', placeholder: '' });
  };

  const removeVariable = (key) => {
    setVariables((prev) => prev.filter((v) => v.key !== key));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Tên mẫu là bắt buộc.'); return; }
    setBusy(true);
    setError('');
    try {
      const body = {
        ...form,
        content: editor?.getHTML() || '',
        variables,
      };
      const url = isEdit ? `/v1/templates/${template.id}` : '/v1/templates';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { /* non-JSON response */ }
      if (res.ok) {
        onSaved?.();
        onClose();
      } else {
        setError(data.error || text || 'Lưu thất bại.');
      }
    } catch (err) {
      setError('Lỗi kết nối server: ' + (err?.message || ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal create-template-modal">
        <div className="cm-modal-header">
          <h3>{isEdit ? 'Chỉnh sửa mẫu văn bản' : 'Tạo mẫu văn bản mới'}</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form className="create-template-body" onSubmit={handleSubmit}>
          {/* Left: metadata + variables */}
          <div className="create-template-sidebar">
            <div className="cm-field">
              <label>Tên mẫu <span className="req">*</span></label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="VD: Hợp đồng lao động thử việc" required />
            </div>

            <div className="cm-field">
              <label>Danh mục</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {TEMPLATE_CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="cm-field">
              <label>Mô tả ngắn</label>
              <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả mục đích của mẫu..." />
            </div>

            {/* Variables manager */}
            <div className="template-vars-section">
              <h4 className="template-vars-title"><Tag size={14} /> Biến điền vào</h4>
              <p className="template-vars-hint">
                Thêm các trường biến để người dùng điền khi tạo văn bản.
                Nhấn tên biến để chèn vào nội dung.
              </p>

              {variables.map((v) => (
                <div key={v.key} className="template-var-row">
                  <button type="button" className="template-var-chip" onClick={() => insertVariable(v.key)} title="Nhấn để chèn vào nội dung">
                    {`{{${v.key}}}`}
                  </button>
                  <span className="template-var-label">{v.label}</span>
                  <button type="button" className="icon-btn" onClick={() => removeVariable(v.key)}><X size={12} /></button>
                </div>
              ))}

              <div className="template-var-add">
                <input
                  placeholder="tên_biến (không dấu, gạch_dưới)"
                  value={newVar.key}
                  onChange={(e) => setNewVar((s) => ({ ...s, key: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <input
                  placeholder="Nhãn hiển thị (VD: Tên công ty)"
                  value={newVar.label}
                  onChange={(e) => setNewVar((s) => ({ ...s, label: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <button type="button" className="action-btn action-btn--tertiary" onClick={addVariable}>
                  <PlusCircle size={14} /> Thêm
                </button>
              </div>
            </div>
          </div>

          {/* Right: TipTap editor */}
          <div className="create-template-editor">
            <div className="create-template-editor-label">
              <Settings2 size={14} /> Thiết kế nội dung mẫu
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 8 }}>
                Dùng {`{{tên_biến}}`} để đánh dấu chỗ điền
              </span>
            </div>
            <MiniToolbar editor={editor} />
            <EditorContent editor={editor} className="create-template-editor-content" />
          </div>
        </form>

        {error && <p style={{ color: '#dc2626', padding: '0 1.5rem', margin: 0, fontSize: '0.82rem' }}>{error}</p>}

        <div className="cm-modal-footer">
          <button type="button" className="action-btn action-btn--tertiary" onClick={onClose}>Hủy</button>
          <button type="button" className="action-btn action-btn--primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo mẫu văn bản'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [favorites, setFavorites] = useState(new Set());
  
  // Modal states
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [variables, setVariables] = useState({});
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState(null);
  const [draftError, setDraftError] = useState(null);
  
  // Template create/edit
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [fetchError, setFetchError] = useState('');

  // Draft Editor states
  const [editingDraft, setEditingDraft] = useState(null);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [showDraftList, setShowDraftList] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftValidation, setDraftValidation] = useState({});

  const fetchTemplates = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        const data = await response.json().catch(() => ({}));
        setFetchError(data.error || `Lỗi ${response.status}: Không thể tải danh sách mẫu.`);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setFetchError('Không thể kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/v1/drafts`);
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    }
  };

  const handleDeleteCustomTemplate = async (templateId) => {
    if (!window.confirm('Xóa mẫu văn bản này?')) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/templates/${templateId}`, { method: 'DELETE' });
      if (res.ok) fetchTemplates();
    } catch { /* ignore */ }
  };

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
    fetchDrafts();
  }, []);

  const filteredDrafts = drafts.filter((draft) => {
    const template = templates.find(t => t.id === draft.template_id);
    const category = template ? template.category : 'other';
    
    const draftName = draft.title || template?.name || 'Văn bản không tên';
    const matchesSearch = draftName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const handleCreateFromTemplate = (template) => {
    setSelectedTemplate(template);
    setVariables({});
    setDraftError(null);
    setDraftResult(null);
    setShowModal(true);
  };

  const handleVariableChange = (field, value) => {
    setVariables(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateDraft = async () => {
    if (!selectedTemplate) return;

    setGeneratingDraft(true);
    setDraftError(null);
    
    try {
      // Create draft via API - this will generate AI-powered content
      const response = await fetchWithAuth('/v1/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          variables,
          withResearch: true, // Fetch latest legal templates
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Không thể tạo nháp';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          errorMessage = `HTTP ${response.status}: Lỗi từ server`;
        }
        throw new Error(errorMessage);
      }

      let draft;
      try {
        draft = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse draft response:', jsonError);
        throw new Error('Server trả về dữ liệu không hợp lệ');
      }

      if (!draft || !draft.data) {
        throw new Error('Response từ server không chứa dữ liệu draft');
      }

      // Open the draft in editor immediately
      fetchDrafts();
        fetchDrafts();
        setEditingDraft(draft.data);
        setShowModal(false);
        setShowDraftEditor(true);
    } catch (error) {
      console.error('Error generating draft:', error);
      setDraftError(error.message || 'Lỗi không xác định');
    } finally {
      setGeneratingDraft(false);
    }
  };

  
  const handleSaveAsTemplate = ({ content, draftName }) => {
    setShowDraftEditor(false);
    const originalTemplate = templates.find((t) => t.id === editingDraft.template_id);
    setEditingTemplate({
      name: `Mẫu từ: ${draftName || 'Văn bản không tên'}`,
      category: originalTemplate ? originalTemplate.category : 'other',
      description: 'Mẫu được tạo từ văn bản đã soạn thảo',
      content: content,
    });
    setShowCreateTemplate(true);
  };
  const handleSaveDraft = async ({ content, changeSummary }) => {
    if (!editingDraft) return;

    setSavingDraft(true);
    try {
      const response = await fetchWithAuth(`/v1/drafts/${editingDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          changeSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi lưu draft');
      }

      const updated = await response.json();
      setEditingDraft(updated.data);
      
      // Show success message
      fetchDrafts();
        fetchDrafts();
        alert('✓ Draft đã được lưu thành công!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('❌ Lỗi: ' + error.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleExportDraft = async (format) => {
    if (!editingDraft) return;

    try {
      const response = await fetchWithAuth(
        `/v1/drafts/${editingDraft.id}/export?format=${format}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`Lỗi khi xuất ${format.toUpperCase()}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replaceAll('"', '')
        : `draft.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('❌ ' + error.message);
    }
  };

  const handleValidateDraft = async () => {
    if (!editingDraft) return;

    try {
      const response = await fetchWithAuth(
        `/v1/drafts/${editingDraft.id}/validate`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Lỗi khi kiểm tra');
      }

      const validation = await response.json();
      setDraftValidation(validation.data);
    } catch (error) {
      console.error('Error validating draft:', error);
    }
  };

  const handleOpenDraft = async (draftId) => {
    try {
      const response = await fetchWithAuth(`/v1/drafts/${draftId}`);

      if (!response.ok) {
        throw new Error('Không thể tải draft');
      }

      const draft = await response.json();
      setEditingDraft(draft.data);
      setShowDraftList(false);
      setShowDraftEditor(true);
      
      // Auto-validate
      handleValidateDraft();
    } catch (error) {
      alert('❌ Lỗi: ' + error.message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
    setVariables({});
    setDraftResult(null);
    setDraftError(null);
  };

  const handleDeleteDraft = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa văn bản này?')) return;
    try {
      const res = await fetchWithAuth(API_URL + '/v1/drafts/' + id, { method: 'DELETE' });
      if (res.success) setDrafts(prev => prev.filter(d => d.id !== id));
      else alert('Lỗi xóa: ' + (res.error || 'Unknown'));
    } catch (err) { alert('Lỗi hệ thống: ' + err.message); }
  };

  const handleRenameDraft = async (id, currentTitle) => {
    const newTitle = prompt('Nhập tên mới cho văn bản:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      const res = await fetchWithAuth(API_URL + '/v1/drafts/' + id, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle })
      });
      if (res.success) {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
      } else alert('Lỗi đổi tên: ' + (res.error || 'Unknown'));
    } catch (err) { alert('Lỗi hệ thống: ' + err.message); }
  };

  return (
    <div className="management-page">
      <PageHero
        icon={<CopyPlus size={32} />}
        title="Quản lý Văn Bản"
        subtitle="Quản lý các văn bản đã tạo từ mẫu"
        pills={[`${drafts.length} văn bản`, `${favorites.size} ưu tiên`]}
      />

      {/* Search & Filter Bar + Draft List Button */}
      <div className="management-toolbar templates-toolbar">
        

        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm mẫu văn bản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="create-cta-box" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => setShowTemplateSelector(true)}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          >
            <PlusCircle size={20} /> TẠO VĂN BẢN MỚI
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{ margin: '0 0 1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: '0.85rem' }}>
          ⚠ {fetchError}
        </div>
      )}

      {/* Templates Grid */}
                    {loading && <div className="management-empty"><p>Đang tải dữ liệu...</p></div>}
              {!loading && filteredDrafts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
                  <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'inline-block' }} />
                  <p>Chưa có văn bản nào trong mục này. Bấm "Tạo văn bản mới" để bắt đầu.</p>
                </div>
              ) : (!loading && (
                <div className="templates-grid">
                {filteredDrafts.map((draft) => {
                  const template = templates.find((t) => t.id === draft.template_id);
                  const draftName = draft.title || template?.name || 'Văn bản không tên';
                  const isFav = favorites.has(draft.id);
                  
                  return (
                    <div key={draft.id} className="template-card">
                      <div className="template-header">
                        <div className="template-icon">{template?.icon || '📝'}</div>
                        <button
                          type="button"
                          className={`favorite-btn ${isFav ? 'active' : ''}`}
                          onClick={() => {
                            const next = new Set(favorites);
                            if (next.has(draft.id)) next.delete(draft.id);
                            else next.add(draft.id);
                            setFavorites(next);
                          }}
                        >
                          <Star size={16} />
                        </button>
                      </div>
                      
                      <div className="template-content">
                        <h3>{draftName}</h3>
                        <p className="template-desc" style={{ marginBottom: '10px' }}>Từ mẫu: <strong>{template?.name || 'Tuỳ chỉnh'}</strong></p>
                        
                        <div style={{display:'flex', gap:'5px'}}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#e0e7ff', color: '#1d4ed8', borderRadius: '12px' }}>
                            {draft.status === 'draft' ? '📝 Bản nháp' : draft.status === 'review' ? '👀 Chờ duyệt' : draft.status === 'approved' ? '✅ Đã duyệt' : draft.status === 'signed' ? '✍️ Đã ký' : draft.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#ffedd5', color: '#c2410c', borderRadius: '12px' }}>
                            v{draft.version || 1}
                          </span>
                        </div>
                      </div>
                      
                      <div className="template-actions" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '1rem'}}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRenameDraft(draft.id, draftName); }}
                              title="Đổi tên"
                              style={{ color: '#475569', background: '#f1f5f9', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.id); }}
                              title="Xóa"
                              style={{ color: '#ef4444', background: '#fef2f2', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        <button
                          type="button"
                          className="template-btn template-btn--primary-gradient"
                          onClick={() => handleOpenDraft(draft.id)}
                        >
                           Mở văn bản
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              ))}

      {/* Modal: Create from Template */}
      {showModal && selectedTemplate && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tạo từ mẫu: {selectedTemplate.name}</h2>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {!draftResult ? (
              <div className="modal-body">
                <div className="form-section">
                  <h3>Điền thông tin bắt buộc:</h3>
                  {selectedTemplate.required_fields && selectedTemplate.required_fields.length > 0 ? (
                    <div className="form-group">
                      {selectedTemplate.required_fields.map((field) => {
                        const fieldInfo = FIELD_MAPPING[field] || {
                          label: field.replace(/_/g, ' ').toUpperCase(),
                          description: `Nhập ${field}`,
                          placeholder: `Nhập ${field}`
                        };
                        return (
                          <div key={field} className="form-field">
                            <label>
                              <strong>{fieldInfo.label}</strong>
                              <span style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginTop: '2px', fontWeight: 'normal' }}>
                                {fieldInfo.description}
                              </span>
                            </label>
                            <input
                              type="text"
                              placeholder={fieldInfo.placeholder}
                              value={variables[field] || ''}
                              onChange={(e) => handleVariableChange(field, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="info-text">Mẫu này không có trường bắt buộc</p>
                  )}
                </div>

                {draftError && (
                  <div className="alert alert-error">
                    <strong>Lỗi:</strong> {draftError}
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn btn--secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button 
                    className="btn btn--primary"
                    onClick={handleGenerateDraft}
                    disabled={generatingDraft}
                  >
                    {generatingDraft ? 'Đang tạo...' : 'Tạo nháp'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <div className="draft-result">
                  <div className="alert alert-success">
                    <strong>✓ Tạo nháp thành công!</strong>
                  </div>

                  {draftResult.validation && (
                    <div className="validation-section">
                      <h4>Kiểm tra pháp lý:</h4>
                      {draftResult.validation.errors && draftResult.validation.errors.length > 0 && (
                        <div className="errors">
                          <strong>Lỗi:</strong>
                          <ul>
                            {draftResult.validation.errors.map((err, idx) => (
                              <li key={idx}>⚠️ {err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {draftResult.validation.warnings && draftResult.validation.warnings.length > 0 && (
                        <div className="warnings">
                          <strong>Khuyến nghị:</strong>
                          <ul>
                            {draftResult.validation.warnings.map((warn, idx) => (
                              <li key={idx}>💡 {warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="draft-content">
                    <h4>Nội dung nháp:</h4>
                    <textarea 
                      readOnly 
                      value={draftResult.text || ''}
                      rows="10"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn--secondary" onClick={() => setDraftResult(null)}>
                    Chỉnh sửa
                  </button>
                  <button className="btn btn--primary" onClick={closeModal}>
                    Lưu & Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draft Editor Modal */}
      {showDraftEditor && editingDraft && (
        <div className="modal-overlay" onClick={() => setShowDraftEditor(false)}>
          <div className="modal-full" onClick={(e) => e.stopPropagation()}>
            <DraftEditor
              draft={editingDraft}
              onSave={handleSaveDraft}
              onCancel={() => setShowDraftEditor(false)}
              onExport={handleExportDraft}
              validationResult={draftValidation}
              onSaveAsTemplate={handleSaveAsTemplate}
            />
          </div>
        </div>
      )}

      {/* Draft List Modal */}

      {/* Create / Edit Template Modal */}
      {showCreateTemplate && (
        <CreateTemplateModal
          template={editingTemplate}
          onClose={() => { setShowCreateTemplate(false); setEditingTemplate(null); }}
          onSaved={() => { fetchTemplates(); }}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="modal-overlay" onClick={() => setShowTemplateSelector(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chọn biểu mẫu để tạo</h2>
              <button className="close-btn" onClick={() => setShowTemplateSelector(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', background: '#f8fafc', padding: '1.5rem' }}>
              <div className="templates-grid">
                {templates.map((template) => (
                  <div key={template.id} className="template-card">
                    <div className="template-header">
                      <div className="template-icon">{template.icon || '📄'}</div>
                    </div>
                    
                    <div className="template-content">
                      <h3>{template.name}</h3>
                      <p className="template-desc">{template.description}</p>
                    </div>
                    
                    <div className="template-actions">
                      <button
                        type="button"
                        className="template-btn template-btn--primary"
                        onClick={() => {
                          setShowTemplateSelector(false);
                          handleCreateFromTemplate(template);
                        }}
                      >
                         Tạo từ mẫu này
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
