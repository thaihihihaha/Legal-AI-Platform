const fs = require('fs');
const p = 'client/src/pages/TemplatesManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(
  /<DraftEditor[\s\S]*?validationResult=\{draftValidation\}\n\s*\/>/,
  (match) => match.replace(
    'validationResult={draftValidation}',
    'validationResult={draftValidation}\n              onSaveAsTemplate={handleSaveAsTemplate}'
  )
);

// add handleSaveAsTemplate
const handleSaveAsTemplateStr = `
  const handleSaveAsTemplate = ({ content, draftName }) => {
    // Đóng draft editor
    setShowDraftEditor(false);
    
    // Xác định category nếu có
    const originalTemplate = templates.find((t) => t.id === editingDraft.template_id);
    
    // Mở popup tạo mẫu với nội dung đã được điền sẵn
    setEditingTemplate({
      name: \`Mẫu từ: \${draftName || 'Văn bản không tên'}\`,
      category: originalTemplate ? originalTemplate.category : 'other',
      description: 'Mẫu được tạo từ văn bản đã soạn thảo',
      content: content,
    });
    setShowCreateTemplate(true);
  };
`;

c = c.replace(
  /const handleSaveDraft = async \(\{ content, changeSummary \}\) => \{/,
  handleSaveAsTemplateStr + '\n  const handleSaveDraft = async ({ content, changeSummary }) => {'
);

fs.writeFileSync(p, c);
