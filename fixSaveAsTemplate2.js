const fs = require('fs');
const p = 'client/src/pages/TemplatesManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(/const handleSaveAsTemplate = \(\{ content, draftName \}\) => \{[^]*?setShowCreateTemplate\(true\);\s*\};\s*/g, '');

c = c.replace(
  /const handleSaveDraft = async \(\{ content, changeSummary \}\) => \{/,
  `const handleSaveAsTemplate = ({ content, draftName }) => {
    setShowDraftEditor(false);
    const originalTemplate = templates.find((t) => t.id === editingDraft.template_id);
    setEditingTemplate({
      name: \`Mẫu từ: \${draftName || 'Văn bản không tên'}\`,
      category: originalTemplate ? originalTemplate.category : 'other',
      description: 'Mẫu được tạo từ văn bản đã soạn thảo',
      content: content,
    });
    setShowCreateTemplate(true);
  };\n  const handleSaveDraft = async ({ content, changeSummary }) => {`
);

fs.writeFileSync(p, c);
