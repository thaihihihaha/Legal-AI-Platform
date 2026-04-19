/**
 * PHASE 4: Master Dashboard
 * Comprehensive dashboard integrating all PHASE 4 features
 */

import React, { useState, useEffect } from 'react';
import {
  ReviewPanel,
  CollaborationDashboard,
  ComplianceDashboard,
  SearchAnalyticsDashboard,
  NotificationCenter,
  TemplateLibraryHub,
} from './phase4/index.js';

export const Phase4Dashboard = ({ draftId, userId, companyId, token }) => {
  const [currentView, setCurrentView] = useState('home'); // home, review, collab, compliance, search, templates, notifications
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Could fetch notification count here
    setUnreadNotifications(3);
  }, []);

  const menuItems = [
    { id: 'home', label: '🏠 Dashboard', icon: '📊' },
    { id: 'review', label: '👁️ Review', icon: '👁️' },
    { id: 'collab', label: '👥 Collaboration', icon: '👥' },
    { id: 'compliance', label: '⚖️ Compliance', icon: '⚖️' },
    { id: 'search', label: '🔍 Search & Analytics', icon: '📈' },
    { id: 'templates', label: '📋 Templates', icon: '📋' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔', badge: unreadNotifications },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'hidden'}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
                LR
              </div>
              <div>
                <div className="font-bold">LegalReview</div>
                <div className="text-xs text-gray-400">PHASE 4</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-800 rounded-lg"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              {userId ? userId.charAt(0).toUpperCase() : 'U'}
            </div>
            {sidebarOpen && (
              <div className="text-sm">
                <div className="font-medium">User</div>
                <div className="text-xs text-gray-400">Online</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {menuItems.find((m) => m.id === currentView)?.label || 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              PHASE 4: Advanced Features & Frontend
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              🔍
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              🔔
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              ⚙️
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {currentView === 'home' && <HomeDashboard companyId={companyId} token={token} />}
          {currentView === 'review' && <ReviewPanel draftId={draftId} token={token} />}
          {currentView === 'collab' && <CollaborationDashboard draftId={draftId} token={token} />}
          {currentView === 'compliance' && <ComplianceDashboard draftId={draftId} token={token} />}
          {currentView === 'search' && <SearchAnalyticsDashboard companyId={companyId} token={token} />}
          {currentView === 'templates' && <TemplateLibraryHub companyId={companyId} token={token} />}
          {currentView === 'notifications' && <NotificationCenter userId={userId} token={token} />}
        </div>
      </div>
    </div>
  );
};

/**
 * Home Dashboard - Overview of all PHASE 4 features
 */
const HomeDashboard = ({ companyId, token }) => {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome to PHASE 4</h2>
        <p className="text-blue-100">
          Advanced Features & Frontend Implementation - All major features are now live with comprehensive UI
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Reviews"
          value="12"
          change="+2 this week"
          color="blue"
        />
        <StatCard
          title="Collaborators"
          value="24"
          change="Full team access"
          color="green"
        />
        <StatCard
          title="Compliance Score"
          value="95%"
          change="+5% improvement"
          color="purple"
        />
        <StatCard
          title="Documents"
          value="156"
          change="In repository"
          color="orange"
        />
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-2 gap-4">
        <FeatureCard
          icon="👁️"
          title="AI-Powered Review"
          description="Intelligent contract analysis with risk assessment"
          status="✅ Active"
        />
        <FeatureCard
          icon="👥"
          title="Multi-User Collaboration"
          description="Real-time sharing with role-based access control"
          status="✅ Active"
        />
        <FeatureCard
          icon="⚖️"
          title="Compliance & Audit"
          description="Complete audit trails and digital signatures"
          status="✅ Active"
        />
        <FeatureCard
          icon="🔍"
          title="Advanced Search"
          description="Full-text search with analytics dashboard"
          status="✅ Active"
        />
        <FeatureCard
          icon="📋"
          title="Template Library"
          description="Reusable templates and clause library"
          status="✅ Active"
        />
        <FeatureCard
          icon="🔔"
          title="Notifications"
          description="In-app alerts and reminder system"
          status="✅ Active"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: '📝 John created new contract review', time: '2 hours ago' },
            { action: '✅ Sarah approved contract #142', time: '4 hours ago' },
            { action: '💬 New comment on NDA template', time: '6 hours ago' },
            { action: '🔗 Synced 3 documents to Salesforce', time: '1 day ago' },
            { action: '📧 Sent document for e-signature', time: '2 days ago' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <span className="text-gray-700">{item.action}</span>
              <span className="text-sm text-gray-500">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Start</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">1️⃣</span>
            <div>
              <div className="font-medium text-gray-900">Upload Contract</div>
              <div className="text-sm text-gray-600">Create a new draft from a document or template</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">2️⃣</span>
            <div>
              <div className="font-medium text-gray-900">Request Review</div>
              <div className="text-sm text-gray-600">Use AI review or invite team members to collaborate</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">3️⃣</span>
            <div>
              <div className="font-medium text-gray-900">Manage & Sign</div>
              <div className="text-sm text-gray-600">Track compliance, manage approvals, and e-sign</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Stat Card Component
 */
const StatCard = ({ title, value, change, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-xs text-gray-500">{change}</div>
    </div>
  );
};

/**
 * Feature Card Component
 */
const FeatureCard = ({ icon, title, description, status }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <span className="text-sm font-medium text-green-600">{status}</span>
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
};

export default Phase4Dashboard;
