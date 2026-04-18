import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Trash2, Eye, Grid3x3, List, ChevronUp, ChevronDown, X } from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import { FileText, UploadCloud } from 'lucide-react';
import Modal from '../components/Modal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function DocumentsManagement() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch documents
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
      } else {
        console.error('Failed to fetch documents:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Upload document
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
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // Delete documents
  const handleDelete = async (docIds) => {
    if (!confirm('Bạn chắc chắn muốn xóa?')) return;

    try {
      const token = localStorage.getItem('longpl_token');
      let deleted = 0;

      for (const docId of docIds) {
        const response = await fetch(`${API_URL}/v1/documents/${docId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          deleted++;
        }
      }

      if (deleted > 0) {
        setSelectedItems(new Set());
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Download document
  const handleDownload = (doc) => {
    if (doc.file_url) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || doc.mime_type?.includes(filterType);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'size-asc':
          return (a.file_size || 0) - (b.file_size || 0);
        case 'size-desc':
          return (b.file_size || 0) - (a.file_size || 0);
        case 'date-asc':
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        case 'date-desc':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  const toggleSelectItem = (id) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredDocuments.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="management-page">
      <PageHero
        icon={<FileText size={32} />}
        title="Quản lý Tài Liệu"
        subtitle="Lưu trữ, tìm kiếm và quản lý toàn bộ tài liệu hỗ trợ pháp lý"
        pills={[`${documents.length} tài liệu`, `${(documents.reduce((sum, d) => sum + (d.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`]}
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
                selectedItems.forEach(id => {
                  const doc = documents.find(d => d.id === id);
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
            <option value="pdf">PDF</option>
            <option value="docx">Word</option>
            <option value="text">Text</option>
            <option value="image">Hình ảnh</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="date-desc">Mới nhất</option>
            <option value="date-asc">Cũ nhất</option>
            <option value="name-asc">Tên (A-Z)</option>
            <option value="name-desc">Tên (Z-A)</option>
            <option value="size-desc">Kích thước (Lớn đến nhỏ)</option>
            <option value="size-asc">Kích thước (Nhỏ đến lớn)</option>
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
              ? 'Upload tài liệu hỗ trợ để bắt đầu'
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
                <tr key={doc.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(doc.id)}
                      onChange={() => toggleSelectItem(doc.id)}
                    />
                  </td>
                  <td className="col-name">
                    <span className="doc-name">{doc.name || 'Không có tên'}</span>
                  </td>
                  <td>{doc.mime_type || 'Không rõ'}</td>
                  <td>{formatFileSize(doc.file_size)}</td>
                  <td className="col-date">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td className="col-actions">
                    <button 
                      type="button" 
                      className="icon-btn" 
                      title="Xem"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="icon-btn" 
                      title="Tải xuống"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="icon-btn icon-btn--danger" 
                      title="Xóa"
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
            <div key={doc.id} className="doc-card">
              <div className="doc-card-header">
                <input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)} />
              </div>
              <div className="doc-card-content">
                <FileText size={32} />
                <h4>{doc.name || 'Không có tên'}</h4>
                <p className="doc-type">{doc.mime_type || 'Không rõ'}</p>
                <p className="doc-size">{formatFileSize(doc.file_size)}</p>
              </div>
              <div className="doc-card-footer">
                <span className="doc-date">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : '-'}</span>
                <div className="doc-actions">
                  <button type="button" className="icon-btn" title="Xem">
                    <Eye size={14} />
                  </button>
                  <button type="button" className="icon-btn" title="Tải">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Tài Liệu">
        <div className="modal-content" style={{ minWidth: '400px' }}>
          {uploadError && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px' }}>
              {uploadError}
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Chọn file
            </label>
            <input
              type="file"
              onChange={(e) => {
                setUploadFile(e.target.files?.[0] || null);
                setUploadError('');
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
              }}
            />
            {uploadFile && (
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                📄 {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="Mô tả tài liệu..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !uploadFile}
              style={{
                padding: '8px 16px',
                background: uploading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? 'Đang upload...' : 'Upload'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
