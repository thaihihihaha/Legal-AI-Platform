/**
 * PHASE 4.1: Review Panel UI Component
 * AI-powered contract review interface
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const ReviewPanel = ({ draftId, token }) => {
  const [reviewSession, setReviewSession] = useState(null);
  const [comments, setComments] = useState([]);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments'); // comments, risk, timeline
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('comment');
  const [severity, setSeverity] = useState('info');

  useEffect(() => {
    fetchReviewData();
  }, [draftId]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch review session
      const sessionRes = await axios.get(`/v1/reviews/${draftId}`, { headers });
      setReviewSession(sessionRes.data.data);

      // Fetch risk assessment
      const riskRes = await axios.post(`/v1/drafts/${draftId}/risk-assessment`, {}, { headers });
      setRiskAssessment(riskRes.data.data);

      // Initialize comments from session
      if (sessionRes.data.data.comments) {
        setComments(sessionRes.data.data.comments);
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `/v1/reviews/${draftId}/comments`,
        {
          sessionId: reviewSession.id,
          content: newComment,
          commentType,
          severity,
        },
        { headers }
      );

      setComments([...comments, response.data.data]);
      setNewComment('');
      setCommentType('comment');
      setSeverity('info');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleApprove = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/reviews/${draftId}/approve`,
        {
          sessionId: reviewSession.id,
          notes: 'Review approved',
        },
        { headers }
      );
      fetchReviewData();
    } catch (error) {
      console.error('Error approving review:', error);
    }
  };

  const handleReject = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/reviews/${draftId}/reject`,
        {
          sessionId: reviewSession.id,
          reasons: ['Contract needs revision'],
        },
        { headers }
      );
      fetchReviewData();
    } catch (error) {
      console.error('Error rejecting review:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading review data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Contract Review</h2>
        <div className="mt-2 flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            reviewSession?.status === 'approved' ? 'bg-green-100 text-green-800' :
            reviewSession?.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {reviewSession?.status || 'pending'}
          </span>
          <span className="text-sm text-gray-500">
            Created: {new Date(reviewSession?.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Risk Assessment Summary */}
      {riskAssessment && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Risk Assessment</h3>
              <p className="text-sm text-gray-600 mt-1">
                Risk Score: <span className="font-bold text-lg">{riskAssessment.risk_score}</span>/100
              </p>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${
                riskAssessment.risk_level === 'critical' ? 'text-red-600' :
                riskAssessment.risk_level === 'high' ? 'text-orange-600' :
                riskAssessment.risk_level === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {riskAssessment.risk_level?.toUpperCase()}
              </div>
            </div>
          </div>

          {riskAssessment.risk_items && riskAssessment.risk_items.length > 0 && (
            <div className="mt-3 space-y-2">
              {riskAssessment.risk_items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  • {item}
                </div>
              ))}
              {riskAssessment.risk_items.length > 3 && (
                <div className="text-sm text-gray-600 italic">
                  +{riskAssessment.risk_items.length - 3} more items
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'comments'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'risk'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Risk Details
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'timeline'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'comments' && (
          <div>
            {/* Comments List */}
            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No comments yet. Add one to get started.
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          comment.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          comment.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          comment.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {comment.severity}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {comment.commentType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{comment.content}</p>
                    {comment.clauseReference && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Reference: {comment.clauseReference}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            {reviewSession?.status === 'pending' && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Add Comment</h4>
                <div className="space-y-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or suggestion..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={commentType}
                      onChange={(e) => setCommentType(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="comment">Comment</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="issue">Issue</option>
                      <option value="question">Question</option>
                    </select>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddComment}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Add Comment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div>
            {riskAssessment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Risk Score</div>
                    <div className="text-2xl font-bold text-gray-900">{riskAssessment.risk_score}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Risk Level</div>
                    <div className="text-2xl font-bold text-gray-900 uppercase">
                      {riskAssessment.risk_level}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Items Found</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {riskAssessment.risk_items?.length || 0}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Risk Items</h4>
                  <div className="space-y-2">
                    {riskAssessment.risk_items?.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-red-600 font-bold">•</span>
                        <span className="text-gray-800">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {riskAssessment.recommendations && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Recommendations</h4>
                    <div className="space-y-2">
                      {riskAssessment.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <span className="text-blue-600 font-bold">✓</span>
                          <span className="text-gray-800">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Risk assessment data not available
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Review started: {new Date(reviewSession?.created_at).toLocaleString()}
            </div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="w-1 h-12 bg-gray-300"></div>
                </div>
                <div className="pb-8">
                  <div className="font-semibold text-gray-900">Review Started</div>
                  <div className="text-sm text-gray-600">
                    {new Date(reviewSession?.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {comments.map((comment, idx) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      comment.severity === 'critical' ? 'bg-red-600' :
                      comment.severity === 'high' ? 'bg-orange-600' :
                      'bg-blue-600'
                    }`}></div>
                    {idx < comments.length - 1 && (
                      <div className="w-1 h-12 bg-gray-300"></div>
                    )}
                  </div>
                  <div className="pb-8">
                    <div className="font-semibold text-gray-900 capitalize">
                      {comment.commentType}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(comment.created_at).toLocaleString()}
                    </div>
                    <div className="text-gray-700 mt-1">{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {reviewSession?.status === 'pending' && (
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleApprove}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
          >
            Approve Review
          </button>
          <button
            onClick={handleReject}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium"
          >
            Reject Review
          </button>
        </div>
      )}

      {reviewSession?.status !== 'pending' && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className={`px-4 py-3 rounded-lg text-center font-medium ${
            reviewSession?.status === 'approved'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            This review has been {reviewSession?.status}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPanel;
