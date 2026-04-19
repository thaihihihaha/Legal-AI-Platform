/**
 * PHASE 4.4: Search & Analytics Dashboard Component
 * Full-text search, saved searches, and analytics visualization
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const SearchAnalyticsDashboard = ({ companyId, token }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    author: '',
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // search, analytics, saved

  useEffect(() => {
    if (companyId) {
      fetchAnalytics();
      fetchSavedSearches();
    }
  }, [companyId]);

  const fetchSavedSearches = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/v1/searches?company_id=${companyId}`, { headers });
      setSavedSearches(res.data.data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/v1/company-analytics/${companyId}`, { headers });
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(
        '/v1/search',
        {
          query: searchQuery,
          company_id: companyId,
          filters: searchFilters,
        },
        { headers }
      );
      setSearchResults(res.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error performing search');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        '/v1/searches',
        {
          name: searchName,
          query: searchQuery,
          filters: searchFilters,
          company_id: companyId,
        },
        { headers }
      );

      fetchSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Error saving search');
    }
  };

  const handleLoadSearch = (savedSearch) => {
    setSearchQuery(savedSearch.query);
    setSearchFilters(savedSearch.filters);
    setTimeout(handleSearch, 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Search & Analytics</h2>
        <p className="text-sm text-gray-600 mt-1">
          {analytics?.total_documents || 0} documents • {analytics?.total_users || 0} team members
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'search'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'analytics'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'saved'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Saved Searches ({savedSearches.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'search' && (
          <div>
            {/* Search Bar */}
            <div className="mb-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contracts, clauses, parties..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-4 gap-3">
                <select
                  value={searchFilters.status}
                  onChange={(e) => setSearchFilters({ ...searchFilters, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="signed">Signed</option>
                </select>
                <input
                  type="date"
                  value={searchFilters.dateFrom}
                  onChange={(e) => setSearchFilters({ ...searchFilters, dateFrom: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={searchFilters.dateTo}
                  onChange={(e) => setSearchFilters({ ...searchFilters, dateTo: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="To date"
                />
                <input
                  type="text"
                  value={searchFilters.author}
                  onChange={(e) => setSearchFilters({ ...searchFilters, author: e.target.value })}
                  placeholder="Author"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {searchQuery && (
                <button
                  onClick={handleSaveSearch}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  💾 Save This Search
                </button>
              )}
            </div>

            {/* Search Results */}
            <div className="space-y-3">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No results found.' : 'Enter a search query to get started.'}
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-600 mb-4">
                    Found {searchResults.length} results
                  </div>
                  {searchResults.map((result) => (
                    <div key={result.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{result.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap ml-2">
                          {result.relevance_score.toFixed(0)}% match
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(result.created_at).toLocaleDateString()} •
                        Modified: {new Date(result.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-gray-600">Total Documents</div>
                    <div className="text-3xl font-bold text-blue-600 mt-2">
                      {analytics.total_documents}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-gray-600">Signed</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                      {analytics.signed_documents || 0}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-sm text-gray-600">Under Review</div>
                    <div className="text-3xl font-bold text-yellow-600 mt-2">
                      {analytics.under_review || 0}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-gray-600">Draft</div>
                    <div className="text-3xl font-bold text-purple-600 mt-2">
                      {analytics.draft || 0}
                    </div>
                  </div>
                </div>

                {/* Activity Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Edits (30d)</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {analytics.edits_30d || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Comments (30d)</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {analytics.comments_30d || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Avg Review Time</div>
                    <div className="text-2xl font-bold text-gray-900 mt-2">
                      {analytics.avg_review_days || 0}d
                    </div>
                  </div>
                </div>

                {/* Team Activity */}
                {analytics.team_activity && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Top Contributors</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.team_activity)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([user, count]) => (
                          <div key={user} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-700">{user}</span>
                            <span className="font-semibold text-gray-900">{count} activities</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Loading analytics data...
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedSearches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No saved searches yet. Create one by searching and clicking "Save This Search".
              </div>
            ) : (
              savedSearches.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{saved.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{saved.query}</div>
                  </div>
                  <button
                    onClick={() => handleLoadSearch(saved)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Load
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalyticsDashboard;
