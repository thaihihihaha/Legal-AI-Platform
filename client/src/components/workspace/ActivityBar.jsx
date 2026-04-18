import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, LayoutDashboard, Search, Settings } from 'lucide-react';

export default function ActivityBar() {
  return (
    <div className="activity-bar">
      <div className="activity-icons">
        <NavLink to="/dashboard" aria-label="Mở Dashboard" title="Dashboard" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
        </NavLink>
        <NavLink to="/legal-search" aria-label="Mở Tra cứu luật" title="Tra cứu luật" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`}>
          <Search size={24} />
        </NavLink>
        <NavLink to="/contracts" aria-label="Mở Kho hợp đồng" title="Kho hợp đồng" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`}>
          <FileText size={24} />
        </NavLink>
      </div>
      <div className="activity-icons" style={{ marginBottom: 10 }}>
        <NavLink to="/settings" aria-label="Mở Cài đặt" title="Cài đặt" className={({ isActive }) => `icon-btn ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
        </NavLink>
      </div>
    </div>
  );
}
