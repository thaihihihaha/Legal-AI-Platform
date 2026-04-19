/**
 * PHASE 4.5 & 4.7: Template Library & Integration Hub Component
 * Templates, clauses, integrations, and webhooks
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const TemplateLibraryHub = ({ companyId, token }) => {
  const [templates, setTemplates] = useState([]);
  const [clauses, setClauses] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates'); // templates, clauses, integrations
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showIntegrationForm, setShowIntegrationForm] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    type: 'docusign',
    apiKey: '',
    accountId: '',
  });

  const clauseCategories = [
    'confidentiality',
    'payment',
    'liability',
    'intellectual-property',
    'termination',
    'warranties',
    'indemnification',
    'dispute-resolution',
    'compliance',
    'remedies',
  ];

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch templates
      const templatesRes = await axios.get(`/v1/templates?company_id=${companyId}`, { headers });
      setTemplates(templatesRes.data.data || []);

      // Fetch clauses
      const clausesRes = await axios.get(`/v1/clauses?company_id=${companyId}`, { headers });
      setClauses(clausesRes.data.data || []);

      // Fetch integrations
      const integrationsRes = await axios.get(`/v1/integrations?company_id=${companyId}`, { headers });
      setIntegrations(integrationsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (templateName) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        '/v1/templates',
        {
          name: templateName,
          company_id: companyId,
        },
        { headers }
      );
      fetchData();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleConfigureIntegration = async () => {
    if (!newIntegration.apiKey || !newIntegration.accountId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        '/v1/integrations',
        {
          ...newIntegration,
          company_id: companyId,
        },
        { headers }
      );

      setNewIntegration({ type: 'docusign', apiKey: '', accountId: '' });
      setShowIntegrationForm(false);
      fetchData();
    } catch (error) {
      console.error('Error configuring integration:', error);
      alert('Error configuring integration');
    }
  };

  const handleSendToDocuSign = async (templateId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/integrations/docusign/send/${templateId}`,
        {},
        { headers }
      );
      alert('Document sent to DocuSign successfully');
    } catch (error) {
      console.error('Error sending to DocuSign:', error);
      alert('Error sending to DocuSign');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading templates and integrations...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Templates & Integrations</h2>
        <p className="text-sm text-gray-600 mt-1">
          {templates.length} templates • {clauses.length} clauses • {integrations.length} integrations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'templates'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('clauses')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'clauses'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Clause Library ({clauses.length})
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'integrations'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Integrations ({integrations.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'templates' && (
          <div>
            <div className="grid grid-cols-3 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No templates yet. Create one to get started.
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 flex-1">{template.name}</h4>
                      <span className="text-xs text-gray-500">v{template.version || 1}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {template.description || 'No description'}
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Use
                      </button>
                      <button className="flex-1 text-gray-600 hover:text-gray-700 text-sm font-medium">
                        Edit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'clauses' && (
          <div>
            {/* Category Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Category</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {clauseCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Clauses List */}
            <div className="space-y-3">
              {clauses
                .filter((c) => selectedCategory === 'all' || c.category === selectedCategory)
                .length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No clauses in this category.
                </div>
              ) : (
                clauses
                  .filter((c) => selectedCategory === 'all' || c.category === selectedCategory)
                  .map((clause) => (
                    <div key={clause.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{clause.title}</h4>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                          {clause.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {clause.content}
                      </p>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Add to Draft
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div>
            {showIntegrationForm && (
              <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">Configure Integration</h3>
                <div className="space-y-4">
                  <select
                    value={newIntegration.type}
                    onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="docusign">DocuSign</option>
                    <option value="salesforce">Salesforce</option>
                  </select>
                  <input
                    type="password"
                    placeholder="API Key / Client Secret"
                    value={newIntegration.apiKey}
                    onChange={(e) => setNewIntegration({ ...newIntegration, apiKey: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Account ID / Org ID"
                    value={newIntegration.accountId}
                    onChange={(e) => setNewIntegration({ ...newIntegration, accountId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfigureIntegration}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => setShowIntegrationForm(false)}
                      className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!showIntegrationForm && (
              <button
                onClick={() => setShowIntegrationForm(true)}
                className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add Integration
              </button>
            )}

            {/* Integrations List */}
            <div className="space-y-4">
              {integrations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No integrations configured yet.
                </div>
              ) : (
                integrations.map((integration) => (
                  <div key={integration.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 capitalize">
                          {integration.type === 'docusign' ? '🔐 DocuSign' : '☁️ Salesforce'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Account: {integration.accountId}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Connected: {new Date(integration.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                        <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibraryHub;
