import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Eye, Grid3x3, List, ChevronUp, ChevronDown, X, FileText, UploadCloud, Scale } from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import '../components/modal.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const CONTRACT_TYPE_LABELS = {
  hop_dong_lao_dong: 'Lao động',
  hop_dong_dich_vu: 'Dịch vụ',
  hop_dong_thuong_mai: 'Thương mại',
  hop_dong_mua_ban: 'Mua bán',
  hop_dong_thue: 'Thuê',
  hop_dong_bao_hiem: 'Bảo hiểm',
  hop_dong_bao_mat: 'Bảo mật (NDA)',
  other: 'Hợp đồng',
};

export default function DocumentsManagement() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('list');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('longpl_token');
      const response = await fetch(`${API_URL}/v1/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setLoadedOnce(true);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError('Vui lòng chọn một file');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      const token = localStorage.getItem('longpl_token');

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('notes', uploadNotes);
      formData.append('workflow_status', 'draft');

      const response = await fetch(`${API_URL}/v1/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadNotes('');
        await fetchDocuments();
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Upload thất bại');
      }
    } catch (error) {
      setUploadError('Lỗi khi upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docIds) => {
    // Kiểm tra nếu có document liên kết hợp đồng
    const linkedDocs = docIds
      .map((id) => documents.find((d) => d.id === id))
      .filter((d) => d?.source_contract_id);

    let confirmMsg = `Bạn chắc chắn muốn xóa ${docIds.length} tài liệu?`;
    if (linkedDocs.length > 0) {
      confirmMsg =
        `⚠️ Trong số này có ${linkedDocs.length} tài liệu là HỢP ĐỒNG:\n` +
        linkedDocs.map((d) => `• ${d.name}`).join('\n') +
        `\n\nXóa tài liệu này sẽ XÓA LUÔN hợp đồng liên kết trong Quản lý Hợp đồng.\n\nBạn có chắc chắn muốn tiếp tục?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('longpl_token');
      let deleted = 0;

      for (const docId of docIds) {
        const response = await fetch(`${API_URL}/v1/documents/${docId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) deleted++;
      }

      if (deleted > 0) {
        setSelectedItems(new Set());
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const fetchFileBlob = async (docId) => {
    const token = localStorage.getItem('longpl_token');
    const response = await fetch(`${API_URL}/v1/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Không thể truy cập file');
    }
    return response.blob();
  };

  const handleView = async (doc) => {
    const newTab = window.open('', '_blank');
    if (!newTab) {
      alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup từ trang này và thử lại.');
      return;
    }
    try {
      const blob = await fetchFileBlob(doc.id);
      const url = URL.createObjectURL(blob);
      newTab.location.href = url;
    } catch (err) {
      newTab.close();
      alert(err.message);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await fetchFileBlob(doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        filterType === 'all' ||
        (filterType === 'contract' && !!doc.source_contract_id) ||
        (filterType === 'document' && !doc.source_contract_id) ||
        doc.mime_type?.includes(filterType);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'size-asc': return (a.file_size || 0) - (b.file_size || 0);
        case 'size-desc': return (b.file_size || 0) - (a.file_size || 0);
        case 'date-asc': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'date-desc':
        default: return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  const toggleSelectItem = (id) => {
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };

  const toggleSelectAll = () => {
    setSelectedItems(
      selectedItems.size === filteredDocuments.length
        ? new Set()
        : new Set(filteredDocuments.map((d) => d.id))
    );
  };

  const formatMimeType = (mime) => {
    if (!mime) return '—';
    const map = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'text/plain': 'TXT',
      'text/markdown': 'MD',
    };
    if (map[mime]) return map[mime];
    return mime.split('/').pop().toUpperCase().slice(0, 10);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const contractCount = documents.filter((d) => d.source_contract_id).length;
  const docOnlyCount = documents.length - contractCount;

  return (
    <div className="management-page">
      <PageHero
        icon={<FileText size={32} />}
        title="Quản lý Tài Liệu"
        subtitle="Kho văn bản tổng hợp — bao gồm tài liệu thông thường và hợp đồng đã upload"
        pills={[
          `${loading && !loadedOnce ? '...' : documents.length} tài liệu`,
          `${contractCount} hợp đồng`,
          `${docOnlyCount} tài liệu khác`,
        ]}
      />

      {/* Action Bar */}
      <div className="management-actions">
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={() => setShowUploadModal(true)}
        >
          <UploadCloud size={16} />
          Upload tài liệu
        </button>
        {selectedItems.size > 0 && (
          <>
            <button
              type="button"
              className="action-btn action-btn--tertiary"
              onClick={() => {
                selectedItems.forEach((id) => {
                  const doc = documents.find((d) => d.id === id);
                  if (doc) handleDownload(doc);
                });
              }}
            >
              <Download size={16} />
              Tải xuống ({selectedItems.size})
            </button>
            <button
              type="button"
              className="action-btn action-btn--danger"
              onClick={() => handleDelete(Array.from(selectedItems))}
            >
              <Trash2 size={16} />
              Xóa ({selectedItems.size})
            </button>
          </>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="management-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
            <option value="all">Tất cả loại</option>
            <option value="contract">Hợp đồng</option>
            <option value="document">Tài liệu thông thường</option>
            <option value="pdf">PDF</option>
            <option value="docx">Word</option>
            <option value="text">Text</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="date-desc">Mới nhất</option>
            <option value="date-asc">Cũ nhất</option>
            <option value="name-asc">Tên (A-Z)</option>
            <option value="name-desc">Tên (Z-A)</option>
            <option value="size-desc">Kích thước lớn đến nhỏ</option>
            <option value="size-asc">Kích thước nhỏ đến lớn</option>
          </select>

          <div className="view-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Danh sách"
            >
              <List size={16} />
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Lưới"
            >
              <Grid3x3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Documents View */}
      {loading ? (
        <div className="management-empty">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="management-empty">
          <FileText size={48} />
          <h3>{documents.length === 0 ? 'Chưa có tài liệu' : 'Không tìm thấy tài liệu'}</h3>
          <p>
            {documents.length === 0
              ? 'Upload tài liệu hoặc hợp đồng để bắt đầu'
              : 'Thử thay đổi tiêu chí tìm kiếm'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="management-table-container">
          <table className="management-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Tên tài liệu</th>
                <th>Loại</th>
                <th>Kích thước</th>
                <th>
                  <div className="th-sortable" onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}>
                    Ngày upload
                    {sortBy === 'date-desc' && <ChevronDown size={14} />}
                    {sortBy === 'date-asc' && <ChevronUp size={14} />}
                  </div>
                </th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className={doc.source_contract_id ? 'row-contract-linked' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(doc.id)}
                      onChange={() => toggleSelectItem(doc.id)}
                    />
                  </td>
                  <td className="col-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="doc-name">{doc.name || 'Không có tên'}</span>
                      {doc.source_contract_id && (
                        <span
                          className="wf-badge"
                          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={`Hợp đồng: ${CONTRACT_TYPE_LABELS[doc.source_contract?.contract_type] || 'Hợp đồng'}`}
                        >
                          <Scale size={10} />
                          {CONTRACT_TYPE_LABELS[doc.source_contract?.contract_type] || 'Hợp đồng'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{formatMimeType(doc.mime_type)}</td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td className="col-date">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td className="col-actions">
                    <button type="button" className="icon-btn" title="Xem" onClick={() => handleView(doc)}>
                      <Eye size={16} />
                    </button>
                    <button type="button" className="icon-btn" title="Tải xuống" onClick={() => handleDownload(doc)}>
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      title={doc.source_contract_id ? 'Xóa (sẽ xóa hợp đồng liên kết)' : 'Xóa'}
                      onClick={() => handleDelete([doc.id])}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="management-grid">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className={`doc-card${doc.source_contract_id ? ' doc-card--contract' : ''}`}>
              <div className="doc-card-header">
                <input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)} />
                {doc.source_contract_id && (
                  <span
                    style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  >
                    <Scale size={9} />
                    {CONTRACT_TYPE_LABELS[doc.source_contract?.contract_type] || 'Hợp đồng'}
                  </span>
                )}
              </div>
              <div className="doc-card-content">
                {doc.source_contract_id ? <Scale size={28} style={{ color: '#a5b4fc' }} /> : <FileText size={28} />}
                <h4>{doc.name || 'Không có tên'}</h4>
                <p className="doc-type">{formatMimeType(doc.mime_type)}</p>
                <p className="doc-size">{formatFileSize(doc.file_size)}</p>
              </div>
              <div className="doc-card-footer">
                <span className="doc-date">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '-'}</span>
                <div className="doc-actions">
                  <button type="button" className="icon-btn" title="Xem" onClick={() => handleView(doc)}>
                    <Eye size={14} />
                  </button>
                  <button type="button" className="icon-btn" title="Tải" onClick={() => handleDownload(doc)}>
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    title={doc.source_contract_id ? 'Xóa (sẽ xóa hợp đồng liên kết)' : 'Xóa'}
                    onClick={() => handleDelete([doc.id])}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="custom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}>
          <div className="custom-modal-box" style={{ maxWidth: '480px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="custom-modal-title" style={{ margin: 0 }}>Upload Tài Liệu</h3>
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadError(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9fb3db', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {uploadError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#d8e8ff', fontSize: '0.9rem' }}>
                Chọn file
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.pptx"
                onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setUploadError(''); }}
                style={{ width: '100%', padding: '8px', border: '1px solid rgba(141,180,246,0.3)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#d8e8ff', boxSizing: 'border-box' }}
              />
              {uploadFile && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#9fb3db' }}>
                  {uploadFile.name} &mdash; {(uploadFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#d8e8ff', fontSize: '0.9rem' }}>
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Mô tả tài liệu..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(141,180,246,0.3)', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: '#d8e8ff', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div className="custom-modal-actions">
              <button
                type="button"
                className="custom-modal-btn cancel"
                onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadError(''); }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="custom-modal-btn confirm"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                style={{ opacity: uploading || !uploadFile ? 0.6 : 1, cursor: uploading || !uploadFile ? 'not-allowed' : 'pointer' }}
              >
                {uploading ? 'Đang upload...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
