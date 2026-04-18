import React from 'react';
import { Key, Scale } from 'lucide-react';

const resolveTabName = (pageKey) => {
  if (pageKey.startsWith('/contracts')) return 'Kho hợp đồng';
  if (pageKey.startsWith('/legal-search')) return 'Tra cứu luật';
  if (pageKey.startsWith('/templates')) return 'Tạo mẫu văn bản';
  if (pageKey.startsWith('/integrations')) return 'API & Tích hợp';
  if (pageKey.startsWith('/risk-overview')) return 'Tổng quan rủi ro';
  if (pageKey.startsWith('/settings')) return 'Cài đặt';
  return 'Tổng quan';
};

export default function EditorTabs({ pageKey, user, onLogout }) {
  return (
    <div className="editor-tabs">
      <div className="tab">
        <Scale size={14} />
        {resolveTabName(pageKey)}
      </div>
      <button type="button" className="tab tab-light" onClick={onLogout}>
        <Key size={14} /> {user?.name || user?.email || 'Đăng xuất'}
      </button>
    </div>
  );
}
