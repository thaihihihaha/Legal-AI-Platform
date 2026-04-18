# 🔐 GIẢI PHÁP TỐI ƯU XỬ LÝ VẤN ĐỀ QUYỀN HẠN

**Vấn đề**: 2 chức năng bị lỗi HTTP 403 Forbidden trong Quản lý Hợp Đồng:
- `POST /v1/contracts/:id/review` - AI Review
- `DELETE /v1/contracts/:id` - Xóa hợp đồng

**Nguyên nhân**: User test hiện tại thiếu permission `admin`

---

## 🎯 **3 GIẢI PHÁP (Từ nhanh → Toàn diện)**

### **GIẢI PHÁP 1: FIX NHANH (1 phút) ⚡**
**Cấp quyền admin cho user hiện tại**

#### Bước 1: Update database
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'test@company.vn';
```

#### Bước 2: Đăng xuất + Đăng nhập lại
- Logout khỏi ứng dụng
- Login lại để lấy JWT token mới có role = 'admin'

#### Pros:
✅ Nhanh nhất  
✅ Không cần code  
✅ Hoạt động ngay lập tức

#### Cons:
❌ Không giải quyết vấn đề căn bản  
❌ User mới vẫn không có quyền  

---

### **GIẢI PHÁP 2: SMART MIDDLEWARE (5-10 phút) 🧠**
**Cho phép Owner/Super-admin thực hiện mọi hành động**

#### Vấn đề hiện tại:
```javascript
// rolePermissions.js
export const requireAction = (action) => (req, res, next) => {
  if (!canPerformAction(req.user.role, action)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

Logic này không tính đến **superadmin override**

#### Cách fix:
```javascript
export const requireAction = (action) => (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 🔑 OWNER / SUPERADMIN BYPASS: Cho phép tất cả
  if (user.role === 'owner' || user.is_super_admin) {
    return next(); // ✅ Cho phép tất cả hành động
  }

  // Kiểm tra permission thường
  if (!canPerformAction(user.role, action)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required_role: actionPermissions[action],
      user_role: user.role,
    });
  }

  next();
};
```

#### Pros:
✅ Hiểu logic - Owner nên có quyền tối đa  
✅ Không thay đổi permission matrix  
✅ Hoạt động với hệ thống hiện tại  
✅ Tiêu chuẩn trong RBAC

#### Cons:
⚠️ Sẽ kiểm tra quyền cho các user role khác

---

### **GIẢI PHÁP 3: REFACTOR TOÀN DIỆN (15-30 phút) 🏗️**
**Thiết kế lại permission system**

#### Hiện tại:
```javascript
actionPermissions = {
  'review:contracts': 'admin',    // Chỉ admin+
  'delete:contracts': 'admin',    // Chỉ admin+
}
```

#### Cải tiến:
```javascript
// 1️⃣ Cho phép owner bypass
export const requireAction = (action) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  
  // Owner bypass tất cả
  if (req.user.role === 'owner' || req.user.is_super_admin) {
    return next();
  }

  if (!canPerformAction(req.user.role, action)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required_role: actionPermissions[action],
      user_role: req.user.role,
    });
  }

  next();
};

// 2️⃣ Thêm middleware kiểm tra ownership
export const requireOwnershipOrAdmin = (resourceField) => async (req, res, next) => {
  const resourceId = req.params.id;
  const user = req.user;

  // Owner/Admin bypass
  if (user.role === 'owner' || user.is_super_admin || 
      hasMinimumRole(user.role, 'admin')) {
    return next();
  }

  // Kiểm tra có phải owner của resource không
  // VD: contract.created_by_id === user.id
  const resource = await prisma[resourceField].findFirst({
    where: { id: resourceId }
  });

  if (resource?.created_by_id === user.id) {
    return next();
  }

  res.status(403).json({ error: 'Not authorized to access this resource' });
};

// 3️⃣ Dùng trong routes
router.delete('/:id', requireAction('delete:contracts'), 
             requireOwnershipOrAdmin('contract'), 
             controllerDeleteContract);
```

#### Pros:
✅ Hệ thống RBAC hoàn chỉnh  
✅ Hỗ trợ ownership-based access  
✅ Rõ ràng và scalable  
✅ Best practice

#### Cons:
⚠️ Cần refactor nhiều routes  
⚠️ Cần test kỹ

---

## 📊 **SO SÁNH CÁC GIẢI PHÁP**

| Tiêu chí | Giải pháp 1 | Giải pháp 2 | Giải pháp 3 |
|----------|-----------|-----------|-----------|
| **Thời gian** | 1 phút | 5 phút | 30 phút |
| **Code change** | 0 (DB only) | 10 dòng | 100+ dòng |
| **Tính scalable** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Best practice** | ❌ | ✅ | ✅✅ |
| **Fix cho user mới** | ❌ | ⚠️ (cần override) | ✅ |
| **Hỗ trợ ownership** | ❌ | ❌ | ✅ |

---

## 🚀 **ĐỀ XUẤT THỰC HIỆN**

### **Ngay lập tức**: Dùng Giải pháp 1
```sql
-- File: scripts/fix-user-role.sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'test@company.vn';

-- Verify
SELECT id, email, role, is_super_admin FROM users 
WHERE email = 'test@company.vn';
```

### **Trong spint tiếp theo**: Implement Giải pháp 2
```javascript
// Thêm super-admin bypass vào middleware
// File: server/src/middleware/rolePermissions.js (dòng 90)

export const requireAction = (action) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // ✨ NEW: Owner/SuperAdmin BYPASS
  if (req.user.role === 'owner' || req.user.is_super_admin) {
    return next();
  }

  if (!canPerformAction(req.user.role, action)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required_role: actionPermissions[action],
      user_role: req.user.role,
    });
  }

  next();
};
```

---

## 🔍 **ROOT CAUSE ANALYSIS**

**Tại sao xảy ra lỗi 403?**

1. **User registration logic**:
```javascript
// auth.js:67
role: isFirstUser ? 'owner' : 'member'
```

2. **User được tạo với**:
   - Khả năng 1: role = 'member' (user không phải user đầu tiên)
   - Khả năng 2: role = 'owner' nhưng middleware không handle owner bypass

3. **Permission matrix**:
```javascript
'review:contracts': 'admin',
'delete:contracts': 'admin',
```
Owner (level 4) > Admin (level 3) → phải được allow

4. **Kết luận**: 
   - ✅ System design đúng
   - ❌ Missing owner override logic

---

## 📋 **CHECKLIST THỰC HIỆN**

- [ ] **Giải pháp 1** (FIX NHANH)
  - [ ] Chuẩn bị SQL script
  - [ ] Update user role → 'admin'
  - [ ] Test login lại
  - [ ] Verify AI Review & Delete hoạt động

- [ ] **Giải pháp 2** (CODE FIX)
  - [ ] Edit `rolePermissions.js`
  - [ ] Thêm owner bypass logic
  - [ ] Test với user 'member'
  - [ ] Test với user 'owner'
  - [ ] Test với user 'admin'

- [ ] **Documentation**
  - [ ] Update RBAC docs
  - [ ] Viết owner policy
  - [ ] Cập nhật API docs

---

## 🎓 **BEST PRACTICES ÁPLIED**

✅ **Principle of Least Privilege**: Mỗi role chỉ có đủ quyền cần thiết  
✅ **Fail-safe Defaults**: Mặc định từ chối, rồi cho phép explicit  
✅ **Role Hierarchy**: Owner > Admin > Member > Viewer  
✅ **Superadmin Override**: Cho phép admin toàn quyền khi cần

---

**Recommendation**: 
- 🟢 **Implement Giải pháp 2** (owner bypass) + Verify Giải pháp 1 hoạt động
- 🟡 **Plan Giải pháp 3** cho sprint tới (ownership-based access)

