/**
 * PHASE 3.3: Compliance & Audit Trail System
 * Comprehensive audit logging, digital signatures, legal holds, and compliance tracking
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Create an audit trail entry for all draft changes
 */
export const createAuditEntry = async ({
  draftId,
  action,
  performedBy,
  entityType = 'draft',
  changes = {},
  oldValues = {},
  newValues = {},
  status = 'success',
  errorMessage = null,
}) => {
  try {
    const entry = {
      id: randomUUID(),
      draft_id: draftId,
      action,
      entity_type: entityType,
      performed_by: performedBy,
      changes,
      old_values: oldValues,
      new_values: newValues,
      status,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    };

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.audit_trail) {
      metadata.audit_trail = [];
    }

    metadata.audit_trail.push(entry);
    // Keep last 1000 audit entries
    if (metadata.audit_trail.length > 1000) {
      metadata.audit_trail = metadata.audit_trail.slice(-1000);
    }

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: { validation_result: metadata },
    });

    return entry;
  } catch (error) {
    console.error('Error creating audit entry:', error);
    throw error;
  }
};

/**
 * Get full audit trail for a draft
 */
export const getAuditTrail = async (draftId, limit = 100) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const trail = draft.validation_result?.audit_trail || [];
    return trail.slice(-limit).reverse();
  } catch (error) {
    console.error('Error getting audit trail:', error);
    throw error;
  }
};

/**
 * Record a digital signature on a draft
 */
export const recordDigitalSignature = async ({
  draftId,
  signedBy,
  signatureData,
  signatureMethod = 'timestamp',
  certificateInfo = {},
}) => {
  try {
    const signature = {
      id: randomUUID(),
      draft_id: draftId,
      signed_by: signedBy,
      signature_method: signatureMethod,
      signature_data: signatureData,
      certificate_info: certificateInfo,
      timestamp: new Date().toISOString(),
      is_valid: true,
      signed_version: 1,
    };

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.signatures) {
      metadata.signatures = [];
    }

    metadata.signatures.push(signature);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        is_signed: true,
        signed_at: new Date(),
        signed_by: signedBy,
      },
    });

    // Create audit entry
    await createAuditEntry({
      draftId,
      action: 'signed',
      performedBy: signedBy,
      entityType: 'signature',
      newValues: signature,
    });

    return signature;
  } catch (error) {
    console.error('Error recording digital signature:', error);
    throw error;
  }
};

/**
 * Apply a legal hold to a draft
 */
export const applyLegalHold = async ({
  draftId,
  reason,
  createdBy,
  expiryDate = null,
  caseNumber = null,
  description = '',
}) => {
  try {
    const hold = {
      id: randomUUID(),
      draft_id: draftId,
      reason,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      hold_status: 'active',
      expiry_date: expiryDate,
      case_number: caseNumber,
      description,
    };

    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (!metadata.legal_holds) {
      metadata.legal_holds = [];
    }

    metadata.legal_holds.push(hold);

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        has_legal_hold: true,
      },
    });

    await createAuditEntry({
      draftId,
      action: 'legal_hold_applied',
      performedBy: createdBy,
      newValues: hold,
    });

    return hold;
  } catch (error) {
    console.error('Error applying legal hold:', error);
    throw error;
  }
};

/**
 * Lift a legal hold from a draft
 */
export const liftLegalHold = async (draftId, holdId, liftedBy, reason = '') => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const metadata = draft.validation_result || {};
    if (metadata.legal_holds) {
      const hold = metadata.legal_holds.find(h => h.id === holdId);
      if (hold) {
        hold.hold_status = 'lifted';
        hold.lifted_by = liftedBy;
        hold.lifted_at = new Date().toISOString();
        hold.lift_reason = reason;
      }
    }

    const hasActiveholds = metadata.legal_holds?.some(h => h.hold_status === 'active');

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        has_legal_hold: hasActiveholds || false,
      },
    });

    await createAuditEntry({
      draftId,
      action: 'legal_hold_lifted',
      performedBy: liftedBy,
      changes: { reason },
    });

    return metadata.legal_holds?.find(h => h.id === holdId);
  } catch (error) {
    console.error('Error lifting legal hold:', error);
    throw error;
  }
};

/**
 * Check compliance against a standard
 */
export const checkCompliance = async ({
  draftId,
  standardName, // GDPR, HIPAA, SOX, LocalLaw, etc.
  jurisdiction = null,
  checkedBy = null,
}) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { title: true, content: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // Call AI agent to check compliance
    const { agentAsk } = await import('../agents/legal_agent.js');

    const compliancePrompt = `Check if the following contract complies with ${standardName} regulations${jurisdiction ? ` in ${jurisdiction}` : ''}.
    
Title: ${draft.title}
Content: ${draft.content?.substring(0, 2000)}...

Provide compliance assessment including:
1. Compliance status (compliant, non_compliant, partial)
2. Compliance score (0-100)
3. Specific findings
4. Required changes
5. Risk level

Return as JSON.`;

    const complianceData = await agentAsk(compliancePrompt);

    const check = {
      id: randomUUID(),
      draft_id: draftId,
      standard_name: standardName,
      jurisdiction,
      compliance_status: complianceData.compliance_status || 'unchecked',
      compliance_score: complianceData.compliance_score || 50,
      checked_by: checkedBy,
      findings: complianceData.findings || [],
      remediation_items: complianceData.remediation_items || [],
      last_checked_at: new Date().toISOString(),
      next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };

    const draftData = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
    });

    const metadata = draftData.validation_result || {};
    if (!metadata.compliance_checks) {
      metadata.compliance_checks = [];
    }

    // Remove old check for same standard
    metadata.compliance_checks = metadata.compliance_checks.filter(
      c => c.standard_name !== standardName || c.jurisdiction !== jurisdiction
    );

    metadata.compliance_checks.push(check);

    // Calculate overall compliance score
    const avgScore =
      metadata.compliance_checks.reduce((sum, c) => sum + (c.compliance_score || 0), 0) /
      metadata.compliance_checks.length;

    await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        validation_result: metadata,
        overall_compliance_score: avgScore,
      },
    });

    return check;
  } catch (error) {
    console.error('Error checking compliance:', error);
    throw error;
  }
};

/**
 * Get all compliance checks for a draft
 */
export const getComplianceChecks = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    return draft.validation_result?.compliance_checks || [];
  } catch (error) {
    console.error('Error getting compliance checks:', error);
    throw error;
  }
};

/**
 * Get legal holds for a draft
 */
export const getLegalHolds = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    return draft.validation_result?.legal_holds || [];
  } catch (error) {
    console.error('Error getting legal holds:', error);
    throw error;
  }
};

/**
 * Get digital signatures for a draft
 */
export const getDigitalSignatures = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    return draft.validation_result?.signatures || [];
  } catch (error) {
    console.error('Error getting digital signatures:', error);
    throw error;
  }
};

/**
 * Export audit trail as PDF or CSV
 */
export const exportAuditTrail = async (draftId, format = 'json') => {
  try {
    const trail = await getAuditTrail(draftId, 1000);

    if (format === 'csv') {
      return convertToCSV(trail);
    } else if (format === 'pdf') {
      return convertToPDF(trail);
    }

    return trail; // JSON by default
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    throw error;
  }
};

function convertToCSV(data) {
  const headers = ['Timestamp', 'Action', 'Performed By', 'Entity Type', 'Status'];
  const rows = data.map(entry => [
    entry.timestamp,
    entry.action,
    entry.performed_by,
    entry.entity_type,
    entry.status,
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

function convertToPDF(data) {
  // PDF generation would be done via PDFKit or similar
  // For now, return a placeholder
  return { content: 'PDF export not yet implemented', format: 'pdf' };
}

/**
 * Get compliance report for a company
 */
export const getComplianceReport = async (companyId) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { id: true, title: true, overall_compliance_score: true, validation_result: true },
    });

    const report = {
      company_id: companyId,
      generated_at: new Date().toISOString(),
      total_documents: drafts.length,
      avg_compliance_score: (
        drafts.reduce((sum, d) => sum + (d.overall_compliance_score || 0), 0) / drafts.length
      ).toFixed(2),
      compliant_documents: drafts.filter(d => d.overall_compliance_score >= 80).length,
      non_compliant_documents: drafts.filter(d => d.overall_compliance_score < 60).length,
      documents_with_holds: drafts.filter(d => d.validation_result?.legal_holds?.some(h => h.hold_status === 'active')).length,
      documents_signed: drafts.filter(d => d.validation_result?.signatures && d.validation_result.signatures.length > 0).length,
      standards_checked: [...new Set(drafts.flatMap(d => d.validation_result?.compliance_checks?.map(c => c.standard_name) || []))],
    };

    return report;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};
