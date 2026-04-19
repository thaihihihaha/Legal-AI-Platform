/**
 * PHASE 3.5: Template & Clause Library System
 * Reusable templates, clause suggestions, and conflict detection
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Create a template from a draft
 */
export const createTemplate = async ({
  draftId,
  templateName,
  description = '',
  category = 'general',
  createdBy,
  isPublic = false,
}) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { title: true, content: true, company_id: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const template = {
      id: randomUUID(),
      draft_id: draftId,
      template_name: templateName,
      description,
      category,
      content: draft.content,
      created_by: createdBy,
      company_id: draft.company_id,
      is_public: isPublic,
      created_at: new Date().toISOString(),
      use_count: 0,
    };

    return template;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

/**
 * Get templates for a company
 */
export const getCompanyTemplates = async (companyId, category = null) => {
  try {
    const templates = await prisma.draftGenerated.findMany({
      where: {
        company_id: companyId,
        // Would filter by template status if we had a field for it
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        validation_result: true,
      },
      take: 100,
    });

    // Filter templates from metadata
    const companyTemplates = [];

    for (const draft of templates) {
      const metadata = draft.validation_result || {};
      if (metadata.templates) {
        const filtered = category
          ? metadata.templates.filter(t => t.category === category)
          : metadata.templates;

        companyTemplates.push(...filtered);
      }
    }

    return companyTemplates;
  } catch (error) {
    console.error('Error getting company templates:', error);
    throw error;
  }
};

/**
 * Apply a template to create a new draft
 */
export const applyTemplate = async ({
  templateId,
  newDraftTitle,
  companyId,
  createdBy,
  customizations = {},
}) => {
  try {
    // In a real implementation, we'd look up the template from storage
    // For now, create a new draft with template content

    const newDraft = await prisma.draftGenerated.create({
      data: {
        title: newDraftTitle,
        content: customizations.content || 'Template content goes here',
        status: 'draft',
        user_id: createdBy,
        company_id: companyId,
        template_applied_from: templateId,
        version: 1,
      },
    });

    return newDraft;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
};

/**
 * Add a clause to the library
 */
export const addClauseToLibrary = async ({
  name,
  content,
  category,
  companyId,
  createdBy,
  tags = [],
}) => {
  try {
    const clause = {
      id: randomUUID(),
      name,
      content,
      category,
      company_id: companyId,
      created_by: createdBy,
      tags,
      created_at: new Date().toISOString(),
      usage_count: 0,
      last_used: null,
    };

    return clause;
  } catch (error) {
    console.error('Error adding clause to library:', error);
    throw error;
  }
};

/**
 * Get clauses by category
 */
export const getClausesByCategory = async (companyId, category) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { validation_result: true },
    });

    const clauses = [];

    for (const draft of drafts) {
      const metadata = draft.validation_result || {};
      if (metadata.clauses) {
        const filtered = metadata.clauses.filter(c => c.category === category);
        clauses.push(...filtered);
      }
    }

    return clauses;
  } catch (error) {
    console.error('Error getting clauses by category:', error);
    throw error;
  }
};

/**
 * Detect potential clause conflicts
 */
export const detectClauseConflicts = async (draftId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { content: true, validation_result: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const conflicts = [];

    // Common conflicting patterns
    const patterns = [
      {
        name: 'Warranty Conflicts',
        patterns: [/warranty.*disclaimed/i, /as-is/i],
      },
      {
        name: 'Liability Conflicts',
        patterns: [/unlimited liability/i, /liability.*limited/i],
      },
      {
        name: 'Termination Conflicts',
        patterns: [/immediate termination/i, /30.*day.*notice/i],
      },
      {
        name: 'IP Ownership Conflicts',
        patterns: [/vendor owns/i, /client owns/i],
      },
    ];

    for (const pattern of patterns) {
      const found = pattern.patterns.filter(p => p.test(draft.content || ''));

      if (found.length > 1) {
        conflicts.push({
          conflict_type: pattern.name,
          severity: 'high',
          location: 'multiple_clauses',
          description: `Conflicting language found for ${pattern.name}`,
        });
      }
    }

    return {
      draft_id: draftId,
      conflict_count: conflicts.length,
      conflicts,
      analyzed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error detecting clause conflicts:', error);
    throw error;
  }
};

/**
 * Get clause suggestions for a draft
 */
export const getClauseSuggestions = async (draftId, companyId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { content: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // Analyze draft to suggest relevant clauses
    const draftText = draft.content || '';
    const suggestions = [];

    // Suggestion rules
    const rules = [
      {
        trigger: /confidential|proprietary|secret/i,
        suggestion: {
          name: 'Confidentiality Clause',
          category: 'confidentiality',
          description: 'Recommended for protecting sensitive information',
        },
      },
      {
        trigger: /liability|damages|compensation/i,
        suggestion: {
          name: 'Limitation of Liability',
          category: 'liability',
          description: 'Recommended for managing risk exposure',
        },
      },
      {
        trigger: /intellectual property|patent|trademark|copyright/i,
        suggestion: {
          name: 'IP Ownership Clause',
          category: 'intellectual_property',
          description: 'Recommended for defining IP rights',
        },
      },
      {
        trigger: /terminate|cancel|end.*agreement/i,
        suggestion: {
          name: 'Termination Clause',
          category: 'termination',
          description: 'Recommended for outlining termination conditions',
        },
      },
    ];

    for (const rule of rules) {
      if (rule.trigger.test(draftText)) {
        suggestions.push({
          ...rule.suggestion,
          confidence: 0.85,
          reason: 'Keywords found in draft content',
        });
      }
    }

    return {
      draft_id: draftId,
      suggestions,
      total_suggestions: suggestions.length,
    };
  } catch (error) {
    console.error('Error getting clause suggestions:', error);
    throw error;
  }
};

/**
 * Get all available clause categories
 */
export const getClauseCategories = async (companyId) => {
  try {
    const categories = [
      { name: 'General', value: 'general' },
      { name: 'Confidentiality', value: 'confidentiality' },
      { name: 'Payment Terms', value: 'payment' },
      { name: 'Liability', value: 'liability' },
      { name: 'Intellectual Property', value: 'intellectual_property' },
      { name: 'Termination', value: 'termination' },
      { name: 'Warranties', value: 'warranties' },
      { name: 'Indemnification', value: 'indemnification' },
      { name: 'Dispute Resolution', value: 'dispute_resolution' },
      { name: 'Compliance', value: 'compliance' },
    ];

    return categories;
  } catch (error) {
    console.error('Error getting clause categories:', error);
    throw error;
  }
};

/**
 * Search clauses in library
 */
export const searchClauses = async (companyId, query) => {
  try {
    const drafts = await prisma.draftGenerated.findMany({
      where: { company_id: companyId },
      select: { validation_result: true },
    });

    let allClauses = [];

    for (const draft of drafts) {
      const metadata = draft.validation_result || {};
      if (metadata.clauses) {
        allClauses.push(...metadata.clauses);
      }
    }

    const searchLower = query.toLowerCase();
    const results = allClauses.filter(
      c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.content.toLowerCase().includes(searchLower) ||
        c.tags?.some(t => t.toLowerCase().includes(searchLower))
    );

    return results;
  } catch (error) {
    console.error('Error searching clauses:', error);
    throw error;
  }
};
