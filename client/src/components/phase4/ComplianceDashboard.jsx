/**
 * PHASE 4.3: Compliance & Audit Dashboard Component
 * Audit trails, signatures, legal holds, and compliance checking
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const ComplianceDashboard = ({ draftId, token }) => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [legalHolds, setLegalHolds] = useState([]);
  const [complianceChecks, setComplianceChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit'); // audit, signatures, holds, compliance
  const [showSignDialog, setShowSignDialog] = useState(false);

  useEffect(() => {
    fetchComplianceData();
  }, [draftId]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch audit trail
      const auditRes = await axios.get(`/v1/drafts/${draftId}/audit-trail`, { headers });
      setAuditTrail(auditRes.data.data || []);

      // Fetch digital signatures
      const sigRes = await axios.get(`/v1/drafts/${draftId}/signatures`, { headers });
      setSignatures(sigRes.data.data || []);

      // Fetch legal holds
      const holdRes = await axios.get(`/v1/drafts/${draftId}/legal-holds`, { headers });
      setLegalHolds(holdRes.data.data || []);

      // Fetch compliance checks
      const compRes = await axios.get(`/v1/drafts/${draftId}/compliance`, { headers });
      setComplianceChecks(compRes.data.data || []);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignDocument = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/drafts/${draftId}/sign`,
        {
          signatureMethod: 'digital',
          timestamp: new Date(),
        },
        { headers }
      );

      setShowSignDialog(false);
      fetchComplianceData();
    } catch (error) {
      console.error('Error signing document:', error);
      alert('Error signing document');
    }
  };

  const handleApplyLegalHold = async () => {
    const reason = prompt('Enter reason for legal hold:');
    if (!reason) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/drafts/${draftId}/legal-hold`,
        { reason },
        { headers }
      );

      fetchComplianceData();
    } catch (error) {
      console.error('Error applying legal hold:', error);
      alert('Error applying legal hold');
    }
  };

  const handleRunComplianceCheck = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `/v1/drafts/${draftId}/compliance-check`,
        { standards: ['GDPR', 'HIPAA', 'SOX'] },
        { headers }
      );

      fetchComplianceData();
    } catch (error) {
      console.error('Error running compliance check:', error);
      alert('Error running compliance check');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading compliance data...</div>
      </div>
    );
  }

  const complianceScore = complianceChecks.length > 0
    ? Math.round(complianceChecks.reduce((sum, c) => sum + (c.passed ? 100 : 0), 0) / complianceChecks.length)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compliance & Audit</h2>
            <p className="text-sm text-gray-600 mt-1">
              Compliance Score: <span className="font-bold">{complianceScore}%</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRunComplianceCheck}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Run Check
            </button>
            <button
              onClick={() => setShowSignDialog(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Sign
            </button>
            <button
              onClick={handleApplyLegalHold}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Legal Hold
            </button>
          </div>
        </div>

        {/* Compliance Score Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              complianceScore >= 80 ? 'bg-green-600' :
              complianceScore >= 60 ? 'bg-yellow-600' :
              'bg-red-600'
            }`}
            style={{ width: `${complianceScore}%` }}
          ></div>
        </div>
      </div>

      {/* Sign Dialog */}
      {showSignDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Digital Signature</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-700">
                  By signing, you confirm that you have reviewed this document and agree to its terms.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSignDocument}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Sign Document
                </button>
                <button
                  onClick={() => setShowSignDialog(false)}
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
      <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Audit Trail ({auditTrail.length})
        </button>
        <button
          onClick={() => setActiveTab('signatures')}
          className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'signatures'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Signatures ({signatures.length})
        </button>
        <button
          onClick={() => setActiveTab('holds')}
          className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'holds'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Legal Holds ({legalHolds.length})
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
            activeTab === 'compliance'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Compliance ({complianceChecks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'audit' && (
          <div className="space-y-3">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No audit trail entries yet.
              </div>
            ) : (
              auditTrail.slice(0, 50).map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl">📋</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 capitalize">
                      {entry.action}
                    </div>
                    <div className="text-sm text-gray-600">
                      By: {entry.user_email}
                    </div>
                    {entry.details && (
                      <div className="text-sm text-gray-600 mt-1">
                        {JSON.stringify(entry.details).substring(0, 100)}...
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'signatures' && (
          <div className="space-y-3">
            {signatures.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No signatures yet. Sign this document to add a signature.
              </div>
            ) : (
              signatures.map((sig) => (
                <div key={sig.id} className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl">✍️</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Digitally Signed</div>
                    <div className="text-sm text-gray-600">
                      Signer: {sig.signer_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(sig.signed_at).toLocaleString()}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Verified
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'holds' && (
          <div className="space-y-3">
            {legalHolds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No legal holds applied.
              </div>
            ) : (
              legalHolds.map((hold) => (
                <div key={hold.id} className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-2xl">⚖️</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Legal Hold Active</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {hold.reason}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Applied on {new Date(hold.applied_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-3">
            {complianceChecks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No compliance checks run yet.
              </div>
            ) : (
              complianceChecks.map((check) => (
                <div key={check.id} className={`flex items-start gap-4 p-4 rounded-lg border ${
                  check.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="text-2xl">
                    {check.passed ? '✅' : '❌'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {check.standard} Compliance
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {check.details}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    check.passed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {check.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceDashboard;
