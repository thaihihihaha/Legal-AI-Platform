const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/TemplatesManagement.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add drafts state and showTemplateSelector
content = content.replace(
  /const \[templates, setTemplates\] = useState\(\[\]\);/,
  `const [templates, setTemplates] = useState([]);\n  const [drafts, setDrafts] = useState([]);\n  const [showTemplateSelector, setShowTemplateSelector] = useState(false);`
);

// 2. Add fetchDrafts
const fetchTemplatesMatch = content.match(/const fetchTemplates = async \(\) => {[\s\S]*?};\n/);
if (fetchTemplatesMatch) {
  content = content.replace(
    fetchTemplatesMatch[0],
    fetchTemplatesMatch[0] + `
  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(\`\${API_URL}/v1/drafts\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    }
  };
`
  );
}

// 3. Call fetchDrafts on mount
content = content.replace(
  /useEffect\(\(\) => {\n\s+fetchTemplates\(\);\n\s+}, \[\]\);/,
  `useEffect(() => {
    fetchTemplates();
    fetchDrafts();
  }, []);`
);

// 4. Update Categories
content = content.replace(
  /const categories = \[[^\]]*\];/,
  `const categories = [
  { value: 'all', label: '📋 Tất cả' },
  { value: 'official', label: '📄 Công văn' },
  { value: 'decision', label: '📋 Quyết định' },
  { value: 'notice', label: '📌 Thông báo' },
  { value: 'service', label: '🤝 Hợp đồng dịch vụ' },
  { value: 'employment', label: '👨‍💼 Hợp đồng lao động' },
];`
);

// Update filterLogic
const filterLogicMatch = content.match(/const filteredTemplates = templates\.filter\(\(template\) => {[\s\S]*?\}\);/);
if (filterLogicMatch) {
  content = content.replace(
    filterLogicMatch[0],
    `const filteredDrafts = drafts.filter((draft) => {
    const template = templates.find(t => t.id === draft.template_id);
    const category = template ? template.category : 'other';
    
    const draftName = draft.title || template?.name || 'Văn bản không tên';
    const matchesSearch = draftName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });`
  );
}

// 6. Update PageHero
content = content.replace(
  /<PageHero\s+icon=\{\<CopyPlus size=\{32\} \/>\}\s+title="Quản lý Mẫu Văn Bản"\s+subtitle="Thư viện mẫu sẵn sàng để tạo và xuất tài liệu pháp lý chuyên nghiệp"\s+pills=\{\[\`\$\{templates\.length\} mẫu\`\, \`\$\{favorites\.size\} yêu thích\`\]\}\s+\/>/,
  `<PageHero
        icon={<CopyPlus size={32} />}
        title="Quản lý Văn Bản"
        subtitle="Quản lý các văn bản đã tạo từ mẫu"
        pills={[\`\${drafts.length} văn bản\`, \`\${favorites.size} ưu tiên\`]}
      />`
);

// 7. Change buttons
content = content.replace(
  /<button\s+type="button"\s+className="action-btn action-btn--primary"\s+onClick=\{\(\) => \{ setEditingTemplate\(null\); setShowCreateTemplate\(true\); \}\}\s*>\s*<PlusCircle size=\{16\} \/> Tạo mẫu mới\s*<\/button>/,
  `<button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => setShowTemplateSelector(true)}
          >
            <PlusCircle size={16} /> Tạo văn bản mới
          </button>`
);

content = content.replace(
  /<button onClick=\{\(\) => setShowDraftList\(true\)\}>\s*<FileText size=\{16\} \/>\s*Văn bản đã tạo\s*<\/button>/,
  `<button onClick={() => { setEditingTemplate(null); setShowCreateTemplate(true); }}>
            <FileText size={16} />
            Quản lý Mẫu hệ thống
          </button>`
);

// 8. Replace templates grid with drafts grid
content = content.replace(
  /\{loading \? \([\s\S]*?<div className="templates-grid">[\s\S]*?<\/div>(\s*)<\/div>(\s*)<\/div>(\s*)<\/main>/,
  `              {loading && <div className="management-empty"><p>Đang tải dữ liệu...</p></div>}
              {!loading && filteredDrafts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
                  <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem', display: 'inline-block' }} />
                  <p>Chưa có văn bản nào trong mục này. Bấm "Tạo văn bản mới" để bắt đầu.</p>
                </div>
              ) : (
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
                          className={\`favorite-btn \${isFav ? 'active' : ''}\`}
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
                      
                      <div className="template-actions" style={{display:'flex', justifyContent:'flex-end'}}>
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
              )}
            </div>
          </div>
        </div>
      </main>`
);

// 9. Add modal for Template Selector
const modalAttachment = `
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
`;

content = content.replace(/(<\/div>\s*)$/, modalAttachment + '$1');

fs.writeFileSync(filePath, content);
console.log('✅ Refactoring done');
