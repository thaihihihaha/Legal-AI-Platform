# 🔧 CODE FIXES & IMPROVEMENTS

**Date**: April 18, 2026  
**Priority**: Address these before production deployment

---

## Issue #1: Document Type Filter Mismatch 🐛

### Problem
Word/Document filter doesn't work - users select "Word" but get 0 results

**Why**: 
- Filter value: `"docx"`
- Actual MIME type: `"application/vnd.openxmlformats-officedocument.wordprocessingml.document"`
- The string `"docx"` is NOT found in the MIME type using `.includes()`

### Location
File: `d:\Project\longpl\client\src\pages\DocumentsManagement.jsx`  
Lines: ~146-149

### Current Code
```javascript
const filteredDocuments = documents
  .filter((doc) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.mime_type?.includes(filterType); // ❌ BUG HERE
    return matchesSearch && matchesType;
  })
```

### Fix  
**Option 1**: Update filter to check file extension instead
```javascript
const getFileExtension = (name) => name?.split('.').pop()?.toLowerCase() || '';

const filteredDocuments = documents
  .filter((doc) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const typeMatch = {
      'all': true,
      'pdf': getFileExtension(doc.name) === 'pdf',
      'docx': getFileExtension(doc.name) === 'docx' || getFileExtension(doc.name) === 'doc',
      'text': getFileExtension(doc.name) === 'txt' || getFileExtension(doc.name) === 'md',
      'image': ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(getFileExtension(doc.name))
    };
    
    const matchesType = typeMatch[filterType] || filterType === 'all';
    return matchesSearch && matchesType;
  })
```

**Option 2**: Update MIME type patterns (better for internationalization)
```javascript
const mimeTypePatterns = {
  all: null,
  pdf: /pdf/i,
  docx: /wordprocessing|msword/i,  // Matches .doc and .docx MIME types
  text: /text|plain/i,
  image: /image/i
};

const filteredDocuments = documents
  .filter((doc) => {
    const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const pattern = mimeTypePatterns[filterType];
    const matchesType = !pattern || pattern.test(doc.mime_type || '');
    return matchesSearch && matchesType;
  })
```

### Testing After Fix
```bash
# Test with Word filter
# Expected: Template-Contract.docx should appear (mime_type contains 'wordprocessing')
# Verify: 1 document shown

# Test with Text filter  
# Expected: All .txt files appear
# Verify: legal-Document-001.txt, test.txt, test-upload.txt, from-browser-... shown

# Test with PDF filter
# Expected: Policy-Guide-2026.pdf shown
# Verify: 1 document shown
```

---

## Issue #2: AI Document Analysis not in UI 🔨

### Problem
AI analysis endpoint exists on backend but no UI to trigger it

**Backend Status**: ✅ Ready at `/v1/documents/:id/analyze`  
**Frontend Status**: ❌ No UI button or modal

### What's Missing
1. Detail view drawer/modal for individual documents
2. "Analyze" / "Phân tích AI" button
3. UI to display analysis results

### Implementation Guide

#### Step 1: Create Document Detail Modal
File: `d:\Project\longpl\client\src\components/DocumentDetailModal.jsx`

```jsx
import { X, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function DocumentDetailModal({ document, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!document?.id) return;
    
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('longpl_token');
      
      const response = await fetch(`${API_URL}/v1/documents/${document.id}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else {
        setError('Phân tích thất bại, vui lòng thử lại');
      }
    } catch (err) {
      setError('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-detail" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{document?.name}</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="detail-group">
            <label>Loại tập tin</label>
            <p>{document?.mime_type || 'Không rõ'}</p>
          </div>
          
          <div className="detail-group">
            <label>Kích thước</label>
            <p>{(document?.file_size / 1024).toFixed(1)} KB</p>
          </div>

          <div className="detail-group">
            <label>Ngày tải</label>
            <p>{document?.created_at ? new Date(document.created_at).toLocaleDateString('vi-VN') : '-'}</p>
          </div>

          <div className="detail-group">
            <label>Ghi chú</label>
            <p>{document?.notes || 'Không có'}</p>
          </div>

          {/* Analysis Section */}
          <div className="detail-group">
            <label>Phân tích AI</label>
            {!analysis ? (
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader size={16} className="spin" /> Đang phân tích...
                  </>
                ) : (
                  'Phân tích tài liệu'
                )}
              </button>
            ) : (
              <div className="analysis-result">
                <pre>{JSON.stringify(analysis, null, 2)}</pre>
              </div>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Đóng</button>
        </div>
      </div>
    </div>
  );
}
```

#### Step 2: Update DocumentsManagement.jsx
File: `d:\Project\longpl\client\src\pages\DocumentsManagement.jsx`

Add this import at top:
```javascript
import DocumentDetailModal from '../components/DocumentDetailModal';
```

Add state for detail modal:
```javascript
const [selectedDoc, setSelectedDoc] = useState(null);
const [showDetailModal, setShowDetailModal] = useState(false);
```

Update the View button handler:
```javascript
// OLD CODE:
onClick={() => window.open(doc.file_url, '_blank')}

// NEW CODE:
onClick={() => {
  setSelectedDoc(doc);
  setShowDetailModal(true);
}}
```

Add modal component before closing div:
```jsx
<DocumentDetailModal 
  document={selectedDoc} 
  isOpen={showDetailModal}
  onClose={() => setShowDetailModal(false)}
/>
```

### Testing After Implementation
```
1. Click "Xem" button on a document
2. Detail modal should open
3. Click "Phân tích tài liệu" button
4. Should show "Đang phân tích..." while loading
5. Analysis results should display as JSON
6. Close modal with X button
```

---

## Issue #3: Improve MIME Type Display 🎨

### Current Problem
Full MIME type is shown: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Solution 
Create a utility function for better display

File: `d:\Project\longpl\client\src\utils\fileUtils.js`

```javascript
export const getMimeTypeLabel = (mimeType) => {
  const typeMap = {
    'pdf': 'PDF',
    'word': 'Word Document',
    'wordprocessing': 'Word Document',
    'plain': 'Text File',
    'text': 'Text File',
    'image': 'Image File',
    'spreadsheet': 'Excel Sheet',
    'presentation': 'PowerPoint'
  };

  const lower = (mimeType || '').toLowerCase();
  for (const [key, label] of Object.entries(typeMap)) {
    if (lower.includes(key)) return label;
  }
  
  return 'Document';
};

export const getFileIcon = (mimeType) => {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('pdf')) return '📄';
  if (lower.includes('word')) return '📝';
  if (lower.includes('text')) return '📋';
  if (lower.includes('image')) return '🖼️';
  if (lower.includes('spreadsheet')) return '📊';
  return '📦';
};
```

Usage in DocumentsManagement.jsx:
```jsx
import { getMimeTypeLabel, getFileIcon } from '../utils/fileUtils';

// In table cell:
<td>
  <span>{getFileIcon(doc.mime_type)} {getMimeTypeLabel(doc.mime_type)}</span>
</td>
```

---

## ✅ Implementation Checklist

- [ ] Apply filters fix (5 min)
- [ ] Create DocumentDetailModal component (20 min)
- [ ] Update DocumentsManagement.jsx (10 min)
- [ ] Test all features after changes (15 min)
- [ ] Optional: Apply MIME type display improvement (10 min)

**Total Time**: ~50-60 minutes for complete implementation

---

## 🧪 Full Test Plan After Fixes

```javascript
// Test 1: Word Filter
- Select "Word" filter
- EXPECT: Template-Contract.docx shown
- ACTUAL: [To be verified after fix]

// Test 2: Text Filter
- Select "Text" filter
- EXPECT: All .txt files shown
- ACTUAL: [To be verified after fix]

// Test 3: AI Analysis
- Click "Xem" on Legal-Document-001.txt
- EXPECT: Detail modal opens
- Click "Phân tích tài liệu"
- EXPECT: Analysis results displayed
- ACTUAL: [To be verified after implementation]

// Test 4: Display Improvement
- EXPECT: MIME types shown as "PDF", "Word Document", "Text File"
- ACTUAL: [To be verified after implementation]
```

---

**Next Steps**: Apply these fixes and re-run full test suite to verify all issues resolved.

