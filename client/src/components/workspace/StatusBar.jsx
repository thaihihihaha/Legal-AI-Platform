import React from 'react';
import { Scale } from 'lucide-react';

export default function StatusBar({ pathName, user }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-connection"><Scale size={14} /> Kết nối: {pathName.replace('/', '') || 'dashboard'}</span>
      </div>
      <div className="status-right">
        <span>{user?.email || 'Trợ Lý Pháp Lý AI'}</span>
      </div>
    </div>
  );
}
