const fs = require('fs');
const p = 'client/src/components/DraftEditor.jsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(/<div className="editor-footer">[\s\S]+?\{changeSummary !== null && hasChanges && \(/, 
`<div className="editor-footer">
              <span className="char-count">
                {charCount} ký tự / {wordCount} từ
              </span>
              <div className="editor-actions">
                <button className="btn-secondary" onClick={handleCancel}>
                  <X size={16} />
                  Hủy
                </button>
                {onSaveAsTemplate && (
                  <button 
                    className="btn-warning"
                    onClick={() => {
                      const content = editor.getHTML();
                      onSaveAsTemplate({ content, draftName: draft.title });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: '#10b981',
                      color: 'white'
                    }}
                    title="Lưu văn bản này thành một Mẫu tuỳ chỉnh (Custom Template) để dùng cho lần sau"
                  >
                    <Save size={16} />
                    Lưu thành Mẫu
                  </button>
                )}
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                >
                  <Save size={16} />
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>

            {changeSummary !== null && hasChanges && (`);

fs.writeFileSync(p, c);
