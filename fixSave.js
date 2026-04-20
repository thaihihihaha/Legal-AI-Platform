const fs = require('fs');
const p = 'client/src/pages/TemplatesManagement.jsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(
  /setEditingDraft\(draft\.data\);\s+setShowModal\(false\);\s+setShowDraftEditor\(true\);/,
  'fetchDrafts();\n        setEditingDraft(draft.data);\n        setShowModal(false);\n        setShowDraftEditor(true);'
);

c = c.replace(
  /alert\('✓ Draft đã được lưu thành công!'\);/,
  "fetchDrafts();\n        alert('✓ Draft đã được lưu thành công!');"
);

fs.writeFileSync(p, c);
