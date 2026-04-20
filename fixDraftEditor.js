const fs = require('fs');
const p = 'client/src/components/DraftEditor.jsx';
let c = fs.readFileSync(p, 'utf-8');

c = c.replace(
  /                  \}\)\s*<\/div>\s*\{changeSummary !== null && hasChanges && \(/,
  `                  )}
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

            {changeSummary !== null && hasChanges && (`
);

fs.writeFileSync(p, c);
