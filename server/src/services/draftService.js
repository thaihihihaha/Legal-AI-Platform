import { prisma } from '../lib/prisma.js';
import { searchLegalEvidence } from './legalRetrieval.js';
import { agentAsk } from '../agents/legal_agent.js';

/**
 * PHASE 2: AI-Powered Draft Generation với Research Integration
 * 
 * Luồng:
 * 1. Fetch template + required fields
 * 2. Gọi searchLegalEvidence() để lấy latest legal templates/regulations
 * 3. Build prompt chuyên nghiệp cho AI (template + variables + research context)
 * 4. Gọi Azure OpenAI để generate draft
 * 5. Validate output + save to database với version control
 */

/**
 * Fallback function để tạo content khi AI không khả dụng
 */
const createFallbackDraftContent = (template, variables) => {
  const parts = [];
  
  parts.push(`<h1>${template.name}</h1>`);
  parts.push(`<p><em>Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</em></p>`);
  
  // Add template description
  if (template.description) {
    parts.push(`<p>${template.description}</p>`);
  }

  // Add variables as structured content
  parts.push('<h2>Thông tin cơ bản:</h2>');
  parts.push('<ul>');
  
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      const fieldLabel = key.replace(/_/g, ' ').toUpperCase();
      parts.push(`<li><strong>${fieldLabel}:</strong> ${value}</li>`);
    }
  });
  
  parts.push('</ul>');
  
  // Add notice
  parts.push('<p style="color: #f59e0b; font-weight: bold;">⚠️ Lưu ý: Đây là draft tạo từ mẫu cơ bản. Vui lòng kiểm tra và cập nhật chi tiết theo yêu cầu cụ thể.</p>');
  
  return parts.join('\n');
};

/**
 * Tạo draft mới từ template
 * - Generate content từ AI dựa vào template + variables + research
 * - Lưu vào database
 */
export const createDraftFromTemplate = async (userId, companyId, templateId, variables, options = {}) => {
  try {
    // Validate input parameters
    if (!userId || !companyId || !templateId || !variables) {
      throw new Error('userId, companyId, templateId, và variables bắt buộc');
    }

    // Lấy template info từ templateService
    let templateCatalog;
    let listTemplates, validateTemplateInput;
    
    try {
      const templateService = await import('./templateService.js');
      listTemplates = templateService.listTemplates;
      validateTemplateInput = templateService.validateTemplateInput;
      templateCatalog = await listTemplates();
    } catch (importError) {
      console.error('❌ Error importing templateService:', importError);
      throw new Error('Không thể tải dữ liệu mẫu');
    }

    if (!Array.isArray(templateCatalog) || templateCatalog.length === 0) {
      throw new Error('Danh sách mẫu trống hoặc không hợp lệ');
    }

    const template = templateCatalog.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} không tìm thấy`);
    }

    // Validate input variables
    const validationErrors = validateTemplateInput(template, variables);
    if (validationErrors.length > 0) {
      throw new Error(`Lỗi validation: ${validationErrors.join(', ')}`);
    }

    // Bước 1: Gọi research để lấy legal context
    console.log(`📚 Fetching legal evidence cho template: ${templateId}`);
    let legalEvidence = [];
    let retrieval_tier = 'basic';
    
    try {
      const result = await searchLegalEvidence(
        `${template.name} ${template.description} ${Object.values(variables).join(' ')}`,
        { topK: 5 }
      );
      legalEvidence = result.evidence || [];
      retrieval_tier = result.retrieval_tier || 'basic';
    } catch (searchError) {
      console.warn('⚠️ Legal search failed:', searchError.message);
      // Continue without legal evidence
    }

    // Bước 2: Build prompt chuyên nghiệp cho AI
    const buildDraftSystemPrompt = (tmpl) => {
      return `Bạn là chuyên gia soạn thảo hợp đồng và tài liệu pháp lý Việt Nam.
Tạo nội dung ${tmpl.name} hoàn chỉnh, chuyên nghiệp, đúng pháp luật Việt Nam.
Yêu cầu định dạng: Chỉ dùng HTML thuần (thẻ <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>).
Tuyệt đối không dùng Markdown (không dùng **bold**, không dùng # heading, không dùng - list).
Chỉ trả về nội dung HTML, không giải thích thêm.`;
    };

    const buildDraftUserPrompt = (tmpl, vars, evidence) => {
      let prompt = `Hãy soạn thảo ${tmpl.name} với các thông tin sau:\n\n`;
      Object.entries(vars).forEach(([key, value]) => {
        prompt += `- ${key}: ${value}\n`;
      });

      if (evidence.length > 0) {
        prompt += `\nCăn cứ pháp lý tham khảo:\n`;
        evidence.slice(0, 3).forEach(e => {
          prompt += `- ${e.law_title || e.title}: ${e.excerpt || ''}\n`;
        });
      }

      prompt += `\nHãy sinh ra văn bản đầy đủ dưới dạng HTML. Không dùng Markdown.`;
      return prompt;
    };

    const systemPrompt = buildDraftSystemPrompt(template);
    const userPrompt = buildDraftUserPrompt(template, variables, legalEvidence);

    // Bước 3: Gọi Azure OpenAI để generate draft
    console.log(`🤖 Generating draft từ AI...`);
    let aiResponse;
    let usedFallback = false;
    
    try {
      aiResponse = await agentAsk(userPrompt, legalEvidence);
    } catch (aiError) {
      console.warn('⚠️ AI generation failed, using fallback:', aiError.message);
      // Fallback: tạo content từ template + variables
      usedFallback = true;
      aiResponse = {
        answer: createFallbackDraftContent(template, variables),
        citations: [],
        confidence: 0,
        warnings: ['Sử dụng fallback do AI không khả dụng'],
      };
    }

    // Validate AI response structure
    if (!aiResponse || typeof aiResponse !== 'object') {
      throw new Error('AI response không hợp lệ');
    }

    // Extract content từ AI response
    const generatedContent = aiResponse.answer || aiResponse.content || '';
    
    if (!generatedContent || generatedContent.trim().length < 20) {
      throw new Error('Không thể tạo nội dung draft từ AI - nội dung quá ngắn');
    }

    // Convert to clean HTML
    const htmlContent = convertTextToHtml(generatedContent);

    // Bước 4: Run validation trước khi save (fallback nếu không có)
    let validationResult = {
      status: 'pending',
      issues: [],
    };
    
    try {
      const { legalValidateDraft } = await import('./templateService.js');
      if (typeof legalValidateDraft === 'function') {
        validationResult = legalValidateDraft({
          templateId,
          text: generatedContent,
        }) || validationResult;
      }
    } catch (validateError) {
      console.warn('⚠️ Validation failed:', validateError.message);
      // Continue with fallback validation result
    }

    // Bước 5: Tạo draft record
    const draft = await prisma.draftGenerated.create({
      data: {
        company_id: companyId,
        user_id: userId,
        template_id: templateId,
        title: `${template.name} - ${new Date().toLocaleDateString('vi-VN')}`,
        content: htmlContent,
        research_data: {
          sources: legalEvidence.length > 0 ? legalEvidence.map(e => ({
            law_title: e.law_title,
            law_number: e.law_number,
            article: e.article,
            source_tier: e.source_tier,
          })) : [],
          retrieval_tier: 'basic',
          generated_at: new Date().toISOString(),
        },
        validation_result: validationResult,
        status: 'draft',
        version: 1,
        created_by: userId,
        updated_by: userId,
      },
    });

    // Create initial version record
    await prisma.draftVersion.create({
      data: {
        draft_id: draft.id,
        version: 1,
        content: htmlContent,
        changed_by: userId,
        summary: 'AI generated initial draft',
      },
    });

    console.log(`✅ Draft created: ${draft.id}`);
    return draft;
  } catch (error) {
    console.error('Error creating draft:', error);
    throw error;
  }
};

/**
 * Lấy danh sách draft của user
 */
export const getDraftsByUser = async (userId, companyId, filters = {}) => {
  try {
    const where = {
      company_id: companyId,
      user_id: userId,
    };

    if (filters.templateId) {
      where.template_id = filters.templateId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const drafts = await prisma.draftGenerated.findMany({
      where,
      select: {
        id: true,
        template_id: true,
        title: true,
        status: true,
        version: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return drafts;
  } catch (error) {
    console.error('Error fetching drafts:', error);
    throw error;
  }
};

/**
 * Lấy draft detail
 */
export const getDraftDetail = async (draftId, userId) => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        template_id: true,
        title: true,
        content: true,
        research_data: true,
        validation_result: true,
        status: true,
        version: true,
        created_at: true,
        updated_at: true,
        creator: { select: { full_name: true, email: true } },
      },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} không tìm thấy`);
    }

    return draft;
  } catch (error) {
    console.error('Error fetching draft detail:', error);
    throw error;
  }
};

/**
 * Save/update draft content
 */
export const saveDraft = async (draftId, userId, newContent, newTitle, changeSummary = 'Manual edit') => {
  try {
    // Fetch current draft
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { version: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} không tìm thấy`);
    }

    const newVersion = draft.version + 1;

    // Update draft
    const updated = await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        content: newContent,
        version: newVersion,
        updated_at: new Date(),
        updated_by: userId,
      },
    });

    // Create version record
    await prisma.draftVersion.create({
      data: {
        draft_id: draftId,
        version: newVersion,
        content: newContent,
        changed_by: userId,
        summary: changeSummary,
      },
    });

    return updated;
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
};

/**
 * Validate draft content
 */
export const validateDraft = async (templateId, draftContent) => {
  try {
    const { legalValidateDraft } = await import('./templateService.js');
    
    const validation = legalValidateDraft({
      templateId,
      text: draftContent,
    });

    return validation;
  } catch (error) {
    console.error('Error validating draft:', error);
    throw error;
  }
};

/**
 * Update draft status
 */
export const updateDraftStatus = async (draftId, newStatus, userId) => {
  try {
    const draft = await prisma.draftGenerated.update({
      where: { id: draftId },
      data: {
        status: newStatus,
        updated_at: new Date(),
        updated_by: userId,
      },
    });

    return draft;
  } catch (error) {
    console.error('Error updating draft status:', error);
    throw error;
  }
};

/**
 * Delete draft
 */
export const deleteDraft = async (draftId) => {
  try {
    // Cascade delete handled by DB
    const deleted = await prisma.draftGenerated.delete({
      where: { id: draftId },
    });

    return deleted;
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
};

/**
 * Get draft versions history
 */
export const getDraftVersions = async (draftId) => {
  try {
    const versions = await prisma.draftVersion.findMany({
      where: { draft_id: draftId },
      select: {
        version: true,
        summary: true,
        created_at: true,
        updater: { select: { full_name: true } },
      },
      orderBy: { version: 'asc' },
    });

    return versions;
  } catch (error) {
    console.error('Error fetching draft versions:', error);
    throw error;
  }
};

/**
 * Build prompt cho AI generation
 */
const buildDraftGenerationPrompt = (template, variables) => {
  const varList = Object.entries(variables)
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');

  return `
Hãy tạo một ${template.name} chuyên nghiệp, tuân theo pháp luật Việt Nam, với thông tin sau:

${varList}

Yêu cầu:
1. Văn bản phải có dấu tiếng Việt đầy đủ
2. Tuân theo cấu trúc: ${template.sections.join(' → ')}
3. Bao gồm các điều khoản bắt buộc theo luật pháp
4. Định dạng HTML đơn giản (có thể dùng <p>, <h2>, <ul>, <li>)
5. Chuyên nghiệp, rõ ràng, không có lỗi chính tả

Template cơ bản:
${template.description}

Hãy sinh ra văn bản đầy đủ, có thể sử dụng trực tiếp hoặc chỉnh sửa nhẹ.
`;
};

/**
 * Export draft to DOCX/PDF
 */
export const exportDraft = async (draftId, format = 'docx') => {
  try {
    const draft = await prisma.draftGenerated.findUnique({
      where: { id: draftId },
      select: { title: true, content: true },
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} không tìm thấy`);
    }

    // Import export function from templateService
    const { exportDraft: exportDraftFunc } = await import('./templateService.js');
    
    return await exportDraftFunc({
      format,
      title: draft.title,
      text: draft.content,
    });
  } catch (error) {
    console.error('Error exporting draft:', error);
    throw error;
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 2: HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Build system prompt cho AI
 */
const buildDraftSystemPrompt = (template) => {
  return `Bạn là chuyên gia soạn thảo văn bản pháp lý chuyên nghiệp cho doanh nghiệp Việt Nam.

Yêu cầu:
1. Tạo ${template.name} hoàn chỉnh, chuyên nghiệp
2. Sử dụng Tiếng Việt chuẩn với đầy đủ dấu
3. Tuân thủ cấu trúc: ${template.sections.join(' → ')}
4. Bao gồm tất cả điều khoản bắt buộc theo pháp luật Việt Nam
5. Định dạng: HTML đơn giản (dùng <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>)
6. Chuyên nghiệp, rõ ràng, không có lỗi chính tả

Đừng dùng markdown, dùng HTML.
Chỉ sinh ra nội dung, không giải thích.`;
};

/**
 * Build user prompt với variables + research context
 */
const buildDraftUserPrompt = (template, variables, legalEvidence = []) => {
  // Format variables
  const varsText = Object.entries(variables)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  // Format research context
  const researchText = legalEvidence
    .slice(0, 3)
    .map((evidence, idx) => {
      const article = evidence.article ? `${evidence.article}: ` : '';
      return `${idx + 1}. [${evidence.law_title}] ${article}${evidence.excerpt || evidence.content || ''}`.substring(0, 500);
    })
    .join('\n\n');

  return `
Hãy soạn thảo ${template.name} với các thông tin sau:

**Thông tin:**
${varsText}

**Căn cứ pháp lý (tham khảo):**
${researchText || 'Không có thông tin cụ thể, dùng kiến thức mặc định'}

**Yêu cầu bắt buộc:**
${template.required_fields.map(f => `- Phải bao gồm: ${f}`).join('\n')}

Hãy sinh ra văn bản hoàn chỉnh dưới dạng HTML.
`;
};

/**
 * Convert AI output (HTML or markdown) to clean HTML for TipTap
 */
const convertTextToHtml = (text) => {
  if (!text) return '<p></p>';

  const trimmed = text.trim();

  // If AI already returned HTML (contains block-level tags), use as-is
  if (/<(p|h[1-6]|ul|ol|li|blockquote|div|table|strong|em)\b/i.test(trimmed)) {
    return trimmed;
  }

  // Convert markdown to HTML
  const lines = trimmed.split('\n');
  const htmlLines = [];
  let inList = false;
  let listType = null;

  const flushList = () => {
    if (inList) {
      htmlLines.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  const inlineMarkdown = (line) => {
    return line
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Headings
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h1) { flushList(); htmlLines.push(`<h1>${inlineMarkdown(h1[1])}</h1>`); continue; }
    if (h2) { flushList(); htmlLines.push(`<h2>${inlineMarkdown(h2[1])}</h2>`); continue; }
    if (h3) { flushList(); htmlLines.push(`<h3>${inlineMarkdown(h3[1])}</h3>`); continue; }

    // Horizontal rule
    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      flushList();
      htmlLines.push('<hr/>');
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[\*\-]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        htmlLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      htmlLines.push(`<li>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        htmlLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      htmlLines.push(`<li>${inlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // Blockquote
    const bqMatch = line.match(/^>\s+(.+)/);
    if (bqMatch) {
      flushList();
      htmlLines.push(`<blockquote><p>${inlineMarkdown(bqMatch[1])}</p></blockquote>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Vietnamese article sections (Điều ...)
    if (/^(Điều\s+\d|ĐIỀU\s+\d)/i.test(line.trim())) {
      flushList();
      htmlLines.push(`<p><strong>${inlineMarkdown(line.trim())}</strong></p>`);
      continue;
    }

    // Regular paragraph line
    flushList();
    htmlLines.push(`<p>${inlineMarkdown(line.trim())}</p>`);
  }

  flushList();
  return htmlLines.join('\n') || '<p></p>';
};
