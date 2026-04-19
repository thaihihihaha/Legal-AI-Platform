/**
 * PHASE 4.2: Collaboration Dashboard Component
 * Multi-user sharing, permissions, and activity tracking
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const CollaborationDashboard = ({ draftId, token }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collaborators'); // collaborators, activity

  useEffect(() => {
    fetchCollaborationData();
  }, [draftId]);

  const fetchCollaborationData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch collaborators
      const collabRes = await axios.get(`/v1/drafts/${draftId}/collaborators`, { headers });
      setCollaborators(collabRes.data.data || []);

      // Fetch activity log
      const activityRes = await axios.get(`/v1/drafts/${draftId}/activity`, { headers });
      setActivityLog(activityRes.data.data || []);
    } catch (error) {
      console.error('Error fetching collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareDraft = async () => {
    if (!shareEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/drafts/${draftId}/share`,
        {
          userId: shareEmail, // In real implementation, would need to lookup user
          role: shareRole,
        },
        { headers }
      );

      setShareEmail('');
      setShareRole('viewer');
      setShowShareDialog(false);
      fetchCollaborationData();
    } catch (error) {
      console.error('Error sharing draft:', error);
      alert('Error sharing draft');
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!confirm('Are you sure you want to revoke access?')) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/drafts/${draftId}/revoke-access`,
        { userId },
        { headers }
      );

      fetchCollaborationData();
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Error revoking access');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'reviewer':
        return 'bg-yellow-100 text-yellow-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'created':
        return '✨';
      case 'updated':
        return '✏️';
      case 'shared':
        return '👥';
      case 'commented':
        return '💬';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '•';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading collaboration data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Collaboration</h2>
            <p className="text-sm text-gray-600 mt-1">
              {collaborators.length} people have access • {activityLog.length} activities
            </p>
          </div>
          <button
            onClick={() => setShowShareDialog(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            + Share
          </button>
        </div>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Share Document</h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter email address"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="viewer">Viewer - Read only</option>
                <option value="reviewer">Reviewer - Can comment</option>
                <option value="editor">Editor - Can edit</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleShareDraft}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Share
                </button>
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('collaborators')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'collaborators'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Collaborators ({collaborators.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'activity'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Activity ({activityLog.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'collaborators' && (
          <div className="space-y-3">
            {collaborators.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No collaborators yet. Share this document to invite people.
              </div>
            ) : (
              collaborators.map((collab) => (
                <div key={collab.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{collab.full_name}</div>
                    <div className="text-sm text-gray-600">{collab.email}</div>
                    {collab.granted_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Shared on {new Date(collab.granted_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(collab.role)}`}>
                      {collab.role}
                    </span>
                    {collab.role !== 'owner' && (
                      <button
                        onClick={() => handleRevokeAccess(collab.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activity yet.
              </div>
            ) : (
              activityLog.map((activity, idx) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                  <div className="text-2xl">{getActivityIcon(activity.action)}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 capitalize">
                      {activity.action}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {activity.action_type && (
                        <span className="capitalize">{activity.action_type}</span>
                      )}
                    </div>
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="text-sm text-gray-500 mt-2">
                        {Object.entries(activity.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationDashboard;
