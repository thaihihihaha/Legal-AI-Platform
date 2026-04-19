import React, { useState, useEffect } from 'react';
import { Search, Filter, Zap, Star, ChevronRight, Copy, X, FileText } from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import { CopyPlus } from 'lucide-react';
import DraftEditor from '../components/DraftEditor';
import DraftListModal from '../components/DraftListModal';
import { fetchWithAuth } from '../utils/fetchWithAuth';

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
  }
};

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState([]);
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
  
  // Draft Editor states
  const [editingDraft, setEditingDraft] = useState(null);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [showDraftList, setShowDraftList] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftValidation, setDraftValidation] = useState({});

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('longpl_token');
        const response = await fetch(`${API_URL}/v1/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
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

  const categories = [
    { value: 'all', label: '📋 Tất cả' },
    { value: 'official', label: '📄 Công văn' },
    { value: 'decision', label: '📋 Quyết định' },
    { value: 'notice', label: '📌 Thông báo' },
    { value: 'service', label: '🤝 Hợp đồng dịch vụ' },
    { value: 'employment', label: '👨‍💼 Hợp đồng lao động' },
  ];

  return (
    <div className="management-page">
      <PageHero
        icon={<CopyPlus size={32} />}
        title="Quản lý Mẫu Văn Bản"
        subtitle="Thư viện mẫu sẵn sàng để tạo và xuất tài liệu pháp lý chuyên nghiệp"
        pills={[`${templates.length} mẫu`, `${favorites.size} yêu thích`]}
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

        <button 
          className="btn btn--secondary"
          onClick={() => setShowDraftList(true)}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <FileText size={16} />
          Xem Drafts
        </button>

        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`category-btn ${filterCategory === cat.value ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="management-empty">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="management-empty">
          <CopyPlus size={48} />
          <h3>{templates.length === 0 ? 'Chưa có mẫu' : 'Không tìm thấy mẫu'}</h3>
          <p>
            {templates.length === 0
              ? 'Mẫu sẽ được thêm từ backend'
              : 'Thử thay đổi tiêu chí tìm kiếm'}
          </p>
        </div>
      ) : (
        <div className="templates-grid">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <div className="template-icon">{template.icon || '📄'}</div>
                <button
                  type="button"
                  className={`favorite-btn ${favorites.has(template.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(template.id)}
                  title="Thêm vào yêu thích"
                >
                  <Star size={16} />
                </button>
              </div>

              <div className="template-content">
                <h3>{template.name || 'Mẫu không tên'}</h3>
                <p className="template-desc">{template.description || 'Mô tả chưa sẵn sàng'}</p>

                {template.tags && template.tags.length > 0 && (
                  <div className="template-tags">
                    {template.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="template-stats">
                  {template.usage_count && (
                    <span className="stat">
                      <Zap size={12} />
                      {template.usage_count} lần sử dụng
                    </span>
                  )}
                </div>
              </div>

              <div className="template-actions">
                <button 
                  type="button" 
                  className="template-btn template-btn--primary"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <Copy size={14} />
                  Tạo từ mẫu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            />
          </div>
        </div>
      )}

      {/* Draft List Modal */}
      {showDraftList && (
        <DraftListModal
          templateId={selectedTemplate?.id}
          onSelectDraft={handleOpenDraft}
          onClose={() => setShowDraftList(false)}
        />
      )}
    </div>
  );
}
