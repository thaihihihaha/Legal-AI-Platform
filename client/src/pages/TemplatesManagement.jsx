import React, { useState, useEffect } from 'react';
import { Search, Filter, Zap, Star, ChevronRight, Copy } from 'lucide-react';
import PageHero from '../components/ui/PageHero';
import { CopyPlus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [favorites, setFavorites] = useState(new Set());

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

      {/* Search & Filter Bar */}
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
                <button type="button" className="template-btn template-btn--primary">
                  <Copy size={14} />
                  Tạo từ mẫu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
