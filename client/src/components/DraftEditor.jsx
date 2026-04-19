import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useEffect } from 'react';
import { Save, X, Download, AlertCircle } from 'lucide-react';
import '../styles/draft-editor.css';

export default function DraftEditor({ 
  draft, 
  onSave, 
  onCancel, 
  onExport,
  validationResult = {} 
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'draft-paragraph',
          },
        },
      }),
      CharacterCount.configure({
        limit: 50000,
      }),
    ],
    content: draft?.content || '',
    onUpdate: ({ editor }) => {
      setHasChanges(true);
    },
  });

  const handleSave = async () => {
    if (!editor) return;
    
    setIsSaving(true);
    try {
      const content = editor.getHTML();
      await onSave({
        content,
        changeSummary: changeSummary || 'Manual edit',
      });
      setHasChanges(false);
      setChangeSummary('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('Bạn có chắc chắn muốn hủy? Các thay đổi sẽ không được lưu.');
      if (!confirmed) return;
    }
    onCancel?.();
  };

  const charCount = editor?.storage.characterCount.characters() || 0;
  const wordCount = editor?.storage.characterCount.words() || 0;

  const isValid = validationResult.valid !== false;
  const errors = validationResult.errors || [];
  const warnings = validationResult.warnings || [];
  const suggestions = validationResult.suggestions || [];

  return (
    <div className="draft-editor-container">
      <div className="draft-editor-header">
        <h2 className="draft-title">{draft?.title || 'Mẫu văn bản'}</h2>
        <div className="draft-header-actions">
          <button 
            className="btn-icon"
            onClick={() => onExport?.('docx')}
            title="Xuất DOCX"
          >
            <Download size={18} />
            DOCX
          </button>
          <button 
            className="btn-icon"
            onClick={() => onExport?.('pdf')}
            title="Xuất PDF"
          >
            <Download size={18} />
            PDF
          </button>
        </div>
      </div>

      <div className="draft-editor-main">
        {/* Editor Panel */}
        <div className="editor-panel">
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                disabled={!editor?.can().chain().focus().toggleBold().run()}
                className={editor?.isActive('bold') ? 'active' : ''}
                title="Đậm (Ctrl+B)"
              >
                <strong>B</strong>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                disabled={!editor?.can().chain().focus().toggleItalic().run()}
                className={editor?.isActive('italic') ? 'active' : ''}
                title="Nghiêng (Ctrl+I)"
              >
                <em>I</em>
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                disabled={!editor?.can().chain().focus().toggleStrike().run()}
                className={editor?.isActive('strike') ? 'active' : ''}
                title="Gạch ngang (Ctrl+Shift+X)"
              >
                <s>S</s>
              </button>
            </div>

            <div className="toolbar-group">
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''}
                title="Tiêu đề 2"
              >
                H2
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                className={editor?.isActive('heading', { level: 3 }) ? 'active' : ''}
                title="Tiêu đề 3"
              >
                H3
              </button>
            </div>

            <div className="toolbar-group">
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={editor?.isActive('bulletList') ? 'active' : ''}
                title="Danh sách"
              >
                ●
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={editor?.isActive('orderedList') ? 'active' : ''}
                title="Danh sách số"
              >
                1.
              </button>
            </div>

            <div className="toolbar-group">
              <button
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().chain().focus().undo().run()}
                title="Hoàn tác"
              >
                ↶
              </button>
              <button
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().chain().focus().redo().run()}
                title="Làm lại"
              >
                ↷
              </button>
            </div>
          </div>

          <EditorContent 
            editor={editor} 
            className="editor-content"
          />

          <div className="editor-footer">
            <span className="char-count">
              {charCount} ký tự / {wordCount} từ
            </span>
            <div className="editor-actions">
              <button 
                className="btn-secondary"
                onClick={handleCancel}
              >
                <X size={16} />
                Hủy
              </button>
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

          {changeSummary !== null && hasChanges && (
            <div className="change-summary">
              <input
                type="text"
                placeholder="Mô tả thay đổi (tùy chọn)"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="summary-input"
              />
            </div>
          )}
        </div>

        {/* Validation Panel */}
        <div className="validation-panel">
          <h3 className="panel-title">
            {isValid ? '✓ Hợp lệ' : '⚠ Cần kiểm tra'}
          </h3>

          {errors.length > 0 && (
            <div className="validation-section errors">
              <h4 className="section-title error-title">
                <AlertCircle size={16} />
                Lỗi ({errors.length})
              </h4>
              <ul className="error-list">
                {errors.map((error, idx) => (
                  <li key={idx} className="error-item">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="validation-section warnings">
              <h4 className="section-title warning-title">
                ⚠ Cảnh báo ({warnings.length})
              </h4>
              <ul className="warning-list">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="warning-item">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="validation-section suggestions">
              <h4 className="section-title suggestion-title">
                💡 Đề xuất ({suggestions.length})
              </h4>
              <ul className="suggestion-list">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="suggestion-item">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errors.length === 0 && warnings.length === 0 && suggestions.length === 0 && (
            <div className="validation-empty">
              <p>Văn bản đã được kiểm tra</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
