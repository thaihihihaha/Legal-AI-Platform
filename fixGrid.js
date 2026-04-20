const fs = require('fs');
const filePath = 'client/src/pages/TemplatesManagement.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const regex = /{loading \? \([\s\S]*?<\/div>\s*\)\s*:\s*filteredTemplates\.length === 0 \? \([\s\S]*?<\/div>\s*\)\s*:\s*\(\s*<div className="templates-grid">[\s\S]*?<\/div>\s*\)\s*\}/;

const replacement = `              {loading && <div className="management-empty"><p>Đang tải dữ liệu...</p></div>}
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
              ))}`;

const matched = content.match(regex);
if (matched) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Fixed Grid!');
} else {
    console.log('Regex missed!');
}
