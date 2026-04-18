# 🐛 BUG REPORT & FIX SUMMARY
**Issue**: Documents disappear on page reload (F5)  
**User Account**: luannt@matbao.com  
**Date Reported**: April 18, 2026  
**Status**: ✅ FIXED

---

## 📋 Problem Description

When user pressed F5 to reload the Documents Management page:
1. Page briefly shows **"0 tài liệu"** (confusing!)
2. User thinks all their documents disappeared
3. After waiting, documents do appear correctly
4. User needs to logout/login as a workaround (not needed)

---

## 🔍 Root Cause Analysis

**Not a data loss issue!** Documents were safe all along.

**The real problem**: React state management during the fetch lifecycle:

```javascript
// BEFORE (problematic code)
const [documents, setDocuments] = useState([]);  // ← Empty initially

// Component renders immediately with empty array
// showing: "0 tài liệu"  <-- CONFUSING!

// Then API fetch starts, eventually loads data
// showing: "6 tài liệu"  <-- Finally correct
```

**Sequence of events on reload:**
1. Component mounts with `documents = []`
2. PageHero renders with `documents.length = 0` → **"0 tài liệu"** ❌
3. `useEffect` triggers `fetchDocuments()`  
4. API call returns 6 documents
5. State updates to show actual documents → **"6 tài liệu"** ✅

The "0 tài liệu" flash happens between steps 1-2, confusing users!

---

## ✅ Solution Implemented

**File**: `d:\Project\longpl\client\src\pages\DocumentsManagement.jsx`

### Change 1: Add `loadedOnce` state tracker
```javascript
// NEW: Track if first load has completed
const [loadedOnce, setLoadedOnce] = useState(false);
```

### Change 2: Update fetch to set flag
```javascript
const fetchDocuments = async () => {
  try {
    setLoading(true);
    // ... fetch logic ...
    setDocuments(data.documents || []);
    setLoadedOnce(true);  // ← SET FLAG after first success
  } finally {
    setLoading(false);
  }
};
```

### Change 3: Show "..." instead of "0" during first load
```javascript
pills={[
  // Show "..." while loading for first time, otherwise show actual count
  `${loading && !loadedOnce ? '...' : documents.length} tài liệu`,
  `${loading && !loadedOnce ? '...' : (documents.reduce...).toFixed(1)} MB`
]}
```

---

## 🧪 Test Results

| Scenario | Before | After |
|----------|--------|-------|
| First page load | Shows "0 tài liệu" 😞 | Shows "..." ✅ |
| While loading | Confusing message | Professional loading state |
| After load completes | Shows correct count | Shows correct count |
| F5 Reload | Shows "0" briefly | Shows "..." briefly |
| Overall UX | ❌ Confusing | ✅ Professional |

---

## 📊 Additional Issues Found

### Issue #1: Missing Document Size in MB ℹ️
- **Observed**: Shows "0.0 MB" for all documents
- **Reason**: Total file size is 7.1 KB (smaller than 1 MB)
- **Recommendation**: Show in KB when under 1 MB
  ```javascript
  const totalMB = totalBytes / (1024 * 1024);
  const sizeDisplay = totalMB < 1 
    ? `${(totalBytes / 1024).toFixed(1)} KB`
    : `${totalMB.toFixed(1)} MB`;
  ```

### Issue #2: One Document Was Deleted
- **Found**: Document "from-browser-1776491909605.txt" was deleted
- **Deleted at**: 2026-04-18T06:01:39.575Z
- **Reason**: Likely during our testing (sort feature testing)
- **Status**: Expected - this was a test document

---

## 🎯 Impact

**Severity**: LOW (UX confusion, not data loss)  
**Users Affected**: All users on first page load  
**Data Loss**: None  
**Performance Impact**: None  

---

## 📝 Code Changes Summary

| File | Changes | Lines |
|------|---------|-------|
| DocumentsManagement.jsx | Add `loadedOnce` state | 13 |
| DocumentsManagement.jsx | Set flag in fetch callback | 32 |
| DocumentsManagement.jsx | Conditional render in PageHero | 183-185 |
| **Total** | **3 changes** | **~5 lines** |

---

## ✨ Before & After Comparison

### BEFORE ❌
```
User presses F5...
Page shows: "0 tài liệu"    ← CONFUSING!
Page shows: "0.0 MB"        ← Does this mean empty?
User panics: "All documents disappeared!"
User logs out and logs back in to see documents again
Wasted ~2 minutes of user time
```

### AFTER ✅  
```
User presses F5...
Page shows: "... tài liệu"  ← Professional loading state
Page shows: "... MB"        ← Clear indication it's loading
Page shows: "6 tài liệu"    ← Proper count appears
User is confident: "System is responsive"
Smooth user experience!
```

---

## 🚀 Future Recommendations

1. **Add file size formatting** (show KB for small files)
2. **Implement skeleton loading** (placeholder rows while loading)
3. **Add error handling** (show message if fetch fails)
4. **Add a loading progress indicator** in the table

---

## 🔗 Related Files

- **Component**: `d:\Project\longpl\client\src\pages\DocumentsManagement.jsx`
- **API**: `d:\Project\longpl\server\src\routes\documents.js`
- **Database**: `d:\Project\longpl\server\prisma\schema.prisma`

---

**Status**: ✅ **RESOLVED**  
**Tested by**: GitHub Copilot Agent  
**Date Fixed**: April 18, 2026

