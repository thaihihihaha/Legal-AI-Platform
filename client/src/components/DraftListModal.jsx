import { useState, useEffect } from 'react';
import { X, Trash2, Edit, FileText, Clock, User } from 'lucide-react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import '../styles/draft-list.css';

export default function DraftListModal({ 
  templateId, 
  onSelectDraft, 
  onClose 
}) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchDrafts();
  }, [templateId]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`/v1/drafts${templateId ? `?templateId=${templateId}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải danh sách drafts');
      }

      const data = await response.json();
      setDrafts(data.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa draft này?')) {
      return;
    }

    try {
      setDeleting(draftId);
      const response = await fetchWithAuth(`/v1/drafts/${draftId}`, { 
        method: 'DELETE' 
      });

      if (!response.ok) {
        throw new Error('Không thể xóa draft');
      }

      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Bản nháp', color: 'draft' },
      review: { label: 'Chờ duyệt', color: 'review' },
      approved: { label: 'Đã duyệt', color: 'approved' },
      signed: { label: 'Đã ký', color: 'signed' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <span className={`status-badge status-${config.color}`}>{config.label}</span>;
  };

  return (
    <div className="draft-list-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Danh sách Drafts</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <p>Đang tải...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-message">{error}</p>
              <button 
                className="btn-retry"
                onClick={fetchDrafts}
              >
                Thử lại
              </button>
            </div>
          ) : drafts.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-icon" />
              <p className="empty-title">Chưa có draft nào</p>
              <p className="empty-text">Hãy tạo draft mới để bắt đầu</p>
            </div>
          ) : (
            <div className="drafts-list">
              {drafts.map((draft) => (
                <div key={draft.id} className="draft-item">
                  <div className="draft-item-content">
                    <h3 className="draft-item-title">{draft.title}</h3>
                    
                    <div className="draft-item-meta">
                      <span className="meta-item">
                        <Clock size={14} />
                        {formatDate(draft.created_at)}
                      </span>
                      <span className="meta-item version">
                        v{draft.version}
                      </span>
                      {getStatusBadge(draft.status)}
                    </div>
                  </div>

                  <div className="draft-item-actions">
                    <button
                      className="btn-action btn-edit"
                      onClick={() => onSelectDraft(draft.id)}
                      title="Mở để chỉnh sửa"
                    >
                      <Edit size={18} />
                      Sửa
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(draft.id)}
                      disabled={deleting === draft.id}
                      title="Xóa draft"
                    >
                      <Trash2 size={18} />
                      {deleting === draft.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
