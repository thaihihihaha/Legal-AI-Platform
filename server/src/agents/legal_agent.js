import { AzureOpenAI } from 'openai';

let openaiClient = null;
let aiStatus = {
  configured: false,
  ready: false,
  provider: 'azure-openai',
  deployment: null,
  lastError: null,
};

const DEFAULT_ASK_MODEL = process.env.AZURE_OPENAI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT || null;
const DEFAULT_TEMPERATURE = Number(process.env.AI_TEMPERATURE || 0.1);
const DEFAULT_TIMEOUT = Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000);
const DEFAULT_RETRIES = Number(process.env.AI_MAX_RETRIES || 2);

const safeParseJson = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const directCandidate = trimmed.startsWith('{') || trimmed.startsWith('[') ? trimmed : null;
  const candidates = [directCandidate, trimmed.match(/```json\s*([\s\S]*?)\s*```/i)?.[1], trimmed.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
};

const extractCitations = (text) => {
  if (!text) return [];

  const matches = [...text.matchAll(/Điều\s+\d+[a-zA-Z0-9\-]*/gi)];
  const uniqueArticles = [...new Set(matches.map((match) => match[0].trim()))];

  return uniqueArticles.map((article) => ({
    source: 'model_output',
    article,
    quote: article,
  }));
};

const citationsFromEvidence = (evidenceList = []) => {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return [];
  }

  return evidenceList.map((evidence, index) => ({
    source: evidence.source || 'retrieved_evidence',
    article: evidence.article || evidence.title || `Nguồn ${index + 1}`,
    quote: evidence.excerpt || String(evidence.content || '').slice(0, 500),
    law_title: evidence.law_title || undefined,
    law_number: evidence.law_number || undefined,
    source_url: evidence.source_url || undefined,
  }));
};

const updateStatusError = (error) => {
  aiStatus.lastError = error?.message || String(error);
};

export const initAI = () => {
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_MODEL || null;
  const hasRequiredConfig = Boolean(
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_VERSION &&
    deployment
  );

  aiStatus = {
    configured: hasRequiredConfig,
    ready: false,
    provider: 'azure-openai',
    deployment,
    lastError: null,
  };

  if (!hasRequiredConfig) {
    console.warn('⚠️ Thiếu cấu hình Azure OpenAI. AI Core vô hiệu hoá.');
    return;
  }

  try {
    openaiClient = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      deployment,
      timeout: DEFAULT_TIMEOUT,
      maxRetries: DEFAULT_RETRIES,
    });
    aiStatus.ready = true;
    console.log('✅ AI Core (Azure OpenAI) đã khởi động!');
  } catch (error) {
    updateStatusError(error);
    console.error('❌ Lỗi khởi tạo AI Core:', error.message);
  }
};

export const getAIStatus = () => aiStatus;

const runCompletion = async ({ messages, temperature, maxTokens, responseFormat = null }) => {
  if (!openaiClient) {
    throw new Error('AI client chưa sẵn sàng');
  }

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || DEFAULT_ASK_MODEL;
  const retryLimit = Number.isFinite(DEFAULT_RETRIES) ? Math.max(DEFAULT_RETRIES, 0) : 0;
  let lastError = null;

  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    try {
      const completion = await openaiClient.chat.completions.create({
        messages,
        model: deployment,
        temperature,
        max_tokens: maxTokens,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      });

      const content = completion?.choices?.[0]?.message?.content || '';
      const usage = completion?.usage || null;
      return {
        content,
        usage,
        model: deployment,
      };
    } catch (error) {
      lastError = error;
      updateStatusError(error);

      if (attempt < retryLimit) {
        const backoffMs = 250 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('AI request failed');
};

const buildAskPrompt = (userQuery, contextVars = []) => {
  return [
    {
      role: 'system',
      content: [
        'Bạn là Trợ lý Pháp lý doanh nghiệp Việt Nam.',
        'Trả lời bằng tiếng Việt, ngắn gọn, chính xác, có căn cứ pháp lý.',
        'Chỉ dựa trên legal_evidence trong ngữ cảnh. Không suy diễn, không dùng kiến thức ngoài ngữ cảnh.',
        'Nếu ngữ cảnh chưa đủ căn cứ để kết luận, hãy nói rõ là chưa đủ căn cứ và nêu cần tra cứu thêm điều khoản nào.',
        'Chỉ xuất JSON hợp lệ, không bọc markdown, không giải thích thừa.',
        'Schema bắt buộc:',
        '{"answer":"string","citations":[{"source":"string","article":"string","quote":"string"}],"confidence":0-1,"warnings":["string"],"follow_up":["string"]}',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        question: userQuery,
        legal_evidence: contextVars,
        constraints: {
          jurisdiction: 'Vietnam',
          audience: 'business',
          tone: 'professional',
        },
      }),
    },
  ];
};

const buildReviewPrompt = (contractText) => {
  return [
    {
      role: 'system',
      content: [
        'Bạn là chuyên gia rà soát hợp đồng cho doanh nghiệp Việt Nam.',
        'Nhiệm vụ: phân tích rủi ro pháp lý chi tiết, chỉ ra từng rủi ro cụ thể trong hợp đồng.',
        'Chỉ xuất JSON hợp lệ, không bọc markdown, không giải thích thừa.',
        'Schema bắt buộc:',
        '{',
        '"summary":"string — tóm tắt tổng quan 2-3 câu",',
        '"risk_score":0-100,',
        '"risks":[{"clause":"tên điều khoản hoặc vị trí trong HĐ","issue":"mô tả rủi ro cụ thể","severity":"high|medium|low","legal_basis":"điều luật hoặc quy định liên quan nếu có"}],',
        '"missing_clauses":[{"name":"tên điều khoản còn thiếu","reason":"vì sao cần thiết","legal_requirement":"căn cứ pháp lý bắt buộc nếu có"}],',
        '"recommendations":[{"issue":"vấn đề cần xử lý","action":"hành động khuyến nghị cụ thể","priority":"high|medium|low"}],',
        '"citations":[{"law_name":"tên đầy đủ văn bản pháp luật VD: Bộ luật Dân sự 2015","law_number":"số hiệu VD: 91/2015/QH13","article":"điều khoản VD: Điều 292","quote":"trích dẫn nội dung điều khoản","url":"link tra cứu nếu biết, nếu không để null"}],',
        '"confidence":0-1,',
        '"warnings":["string"]',
        '}',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'review_contract',
        contract_text: contractText.substring(0, 15000),
        instructions: 'Hãy phân tích chi tiết từng điều khoản có rủi ro. Với mỗi rủi ro, hãy nêu rõ: (1) điều khoản nào trong hợp đồng, (2) vấn đề cụ thể là gì, (3) căn cứ pháp lý Việt Nam nào liên quan. Với khuyến nghị, hãy đề xuất hành động cụ thể có thể thực hiện ngay.',
      }),
    },
  ];
};

const normalizeAskResult = (rawContent, usage, model, fallbackQuestion) => {
  const parsed = safeParseJson(rawContent);
  const answerText = typeof parsed?.answer === 'string' && parsed.answer.trim().length > 0
    ? parsed.answer.trim()
    : (rawContent || '').trim() || `Tôi chưa trích xuất được câu trả lời cho câu hỏi: ${fallbackQuestion}`;

  const citations = Array.isArray(parsed?.citations) && parsed.citations.length > 0
    ? parsed.citations
    : extractCitations(answerText);

  return {
    answer: answerText,
    citations,
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.72,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    follow_up: Array.isArray(parsed?.follow_up) ? parsed.follow_up : [],
    model,
    usage,
    metadata: {
      response_type: parsed ? 'structured_json' : 'fallback_text',
      provider: 'azure-openai',
    },
  };
};

const normalizeReviewResult = (rawContent, usage, model) => {
  const parsed = safeParseJson(rawContent);
  const summary = typeof parsed?.summary === 'string' && parsed.summary.trim().length > 0
    ? parsed.summary.trim()
    : (rawContent || '').trim() || 'Không thể tạo tóm tắt rà soát hợp đồng.';

  // Normalize risks: handle both string[] and object[] from AI
  const normalizeRisks = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) =>
      typeof item === 'string'
        ? { clause: '', issue: item, severity: 'medium', legal_basis: '' }
        : { clause: item.clause || '', issue: item.issue || item.text || '', severity: item.severity || 'medium', legal_basis: item.legal_basis || '' }
    );

  const normalizeMissing = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) =>
      typeof item === 'string'
        ? { name: item, reason: '', legal_requirement: '' }
        : { name: item.name || item.text || '', reason: item.reason || '', legal_requirement: item.legal_requirement || '' }
    );

  const normalizeRecommendations = (items = []) =>
    (Array.isArray(items) ? items : []).map((item) =>
      typeof item === 'string'
        ? { issue: item, action: '', priority: 'medium' }
        : { issue: item.issue || item.text || '', action: item.action || '', priority: item.priority || 'medium' }
    );

  return {
    summary,
    risk_score: typeof parsed?.risk_score === 'number' ? parsed.risk_score : 60,
    risks: normalizeRisks(parsed?.risks),
    missing_clauses: normalizeMissing(parsed?.missing_clauses),
    recommendations: normalizeRecommendations(parsed?.recommendations),
    citations: Array.isArray(parsed?.citations)
      ? parsed.citations.map((c) => ({
          law_name: c.law_name || c.source || '',
          law_number: c.law_number || '',
          article: c.article || '',
          quote: c.quote || '',
          url: c.url || null,
        }))
      : extractCitations(summary).map((c) => ({ law_name: '', law_number: '', article: c.article, quote: c.quote, url: null })),
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.7,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    model,
    usage,
    metadata: {
      response_type: parsed ? 'structured_json' : 'fallback_text',
      provider: 'azure-openai',
    },
  };
};

export const agentAsk = async (userQuery, contextVars = []) => {
  if (!openaiClient) {
    return {
      answer: 'Hệ thống AI đang tạm thời bảo trì do thiếu API Key.',
      citations: [],
      confidence: 0,
      warnings: ['AI client not configured'],
      follow_up: [],
      model: null,
      usage: null,
      metadata: {
        response_type: 'fallback_text',
        provider: 'azure-openai',
      },
    };
  }

  try {
    const completion = await runCompletion({
      messages: buildAskPrompt(userQuery, contextVars),
      temperature: DEFAULT_TEMPERATURE,
      maxTokens: 2000,
      responseFormat: { type: 'json_object' },
    });

    const fallbackCitations = citationsFromEvidence(contextVars);
    const result = normalizeAskResult(completion.content, completion.usage, completion.model, userQuery);

    return {
      ...result,
      citations: result.citations.length > 0 ? result.citations : fallbackCitations,
      metadata: {
        ...result.metadata,
        legal_evidence_count: Array.isArray(contextVars) ? contextVars.length : 0,
        grounded_on_retrieval: Array.isArray(contextVars) && contextVars.length > 0,
      },
    };
  } catch (error) {
    console.error('Lỗi khi gọi Azure OpenAI API:', error);
    throw new Error('Không thể kết nối đến Trí tuệ AI lúc này.');
  }
};

// ─── Contract Metadata Extraction ────────────────────────────────────────────

const buildMetaExtractionPrompt = (contractText) => [
  {
    role: 'system',
    content: [
      'Bạn là chuyên gia trích xuất thông tin từ hợp đồng Việt Nam.',
      'Nhiệm vụ: đọc đoạn văn bản hợp đồng và trả về JSON chứa các trường metadata.',
      'Quy tắc:',
      '- Chỉ xuất JSON hợp lệ duy nhất, KHÔNG markdown, KHÔNG giải thích.',
      '- Với trường không tìm thấy, đặt giá trị null.',
      '- Ngày tháng dùng định dạng YYYY-MM-DD.',
      '- contract_value chỉ là số (bỏ dấu chấm/phẩy phân cách nghìn), không kèm ký hiệu tiền tệ.',
      'Schema bắt buộc:',
      '{"party_a_name":string|null,"party_b_name":string|null,"party_b_tax_code":string|null,',
      '"signed_date":string|null,"effective_date":string|null,"expiry_date":string|null,',
      '"contract_value":number|null,"currency":"VND"|"USD"|"EUR",',
      '"contract_type":"hop_dong_lao_dong"|"hop_dong_dich_vu"|"hop_dong_thuong_mai"|"hop_dong_mua_ban"|"hop_dong_thue"|"hop_dong_bao_hiem"|"hop_dong_bao_mat"|"other",',
      '"workflow_status":"draft"|"pending_review"|"approved"|"signed"|"active"|"expired"|"terminated"}',
    ].join(' '),
  },
  {
    role: 'user',
    content: `Trích xuất metadata từ hợp đồng sau:\n\n${contractText.substring(0, 12000)}`,
  },
];

/**
 * Trích xuất metadata từ văn bản hợp đồng.
 * Trả về object với các trường đã tìm thấy (giá trị thực) hoặc null (không tìm thấy).
 */
export const extractContractMeta = async (contractText) => {
  if (!openaiClient) {
    return null; // AI not configured — caller handles gracefully
  }

  try {
    const completion = await runCompletion({
      messages: buildMetaExtractionPrompt(contractText),
      temperature: 0.05, // rất thấp để extraction ổn định
      maxTokens: 600,
      responseFormat: { type: 'json_object' },
    });

    const parsed = safeParseJson(completion.content);
    if (!parsed) return null;

    // Sanitize: đảm bảo contract_value là số hoặc null
    if (parsed.contract_value !== null && parsed.contract_value !== undefined) {
      const num = Number(String(parsed.contract_value).replace(/[^\d.]/g, ''));
      parsed.contract_value = Number.isFinite(num) ? num : null;
    }

    // Sanitize dates: chỉ giữ nếu hợp lệ ISO date
    for (const key of ['signed_date', 'effective_date', 'expiry_date']) {
      if (parsed[key] && !/^\d{4}-\d{2}-\d{2}/.test(parsed[key])) {
        parsed[key] = null;
      }
    }

    return parsed;
  } catch (error) {
    console.error('Lỗi extractContractMeta:', error.message);
    return null;
  }
};

export const reviewContract = async (contractText) => {
  if (!openaiClient) {
    return {
      summary: 'Hệ thống AI đang tạm thiết lập, không thể review hợp đồng.',
      risk_score: 0,
      risks: [],
      missing_clauses: [],
      recommendations: [],
      citations: [],
      confidence: 0,
      warnings: ['AI client not configured'],
      model: null,
      usage: null,
      metadata: {
        response_type: 'fallback_text',
        provider: 'azure-openai',
      },
    };
  }

  try {
    const completion = await runCompletion({
      messages: buildReviewPrompt(contractText),
      temperature: Number(process.env.AI_TEMPERATURE || 0.2),
      maxTokens: 3000,
      responseFormat: { type: 'json_object' },
    });

    return normalizeReviewResult(completion.content, completion.usage, completion.model);
  } catch (error) {
    console.error('Lỗi rà soát rủi ro hợp đồng:', error);
    throw new Error('Lỗi xảy ra quá trình phân tích rủi ro hợp đồng bằng Azure AI.');
  }
};

// ─── Document Analysis ────────────────────────────────────────────────────────

const buildDocumentAnalysisPrompt = (fileName, documentText) => [
  {
    role: 'system',
    content: [
      'Bạn là chuyên gia phân tích tài liệu kinh doanh Việt Nam.',
      'Nhiệm vụ: đọc tài liệu và trả về JSON chứa loại document, topics chính, tags gợi ý, summary, category.',
      'Quy tắc:',
      '- Chỉ xuất JSON hợp lệ duy nhất, KHÔNG markdown, KHÔNG giải thích.',
      '- document_type: chỉ chọn một trong: "procedure", "template", "guide", "report", "compliance", "other"',
      '- main_topics: mảng 3-5 topics chính (tiếng Việt, ngắn gọn)',
      '- suggested_tags: mảng 3-8 tags gợi ý (tiếng Việt, 1-2 từ mỗi tag)',
      '- summary: tóm tắt 2-3 câu, không quá 200 ký tự',
      '- recommended_category: danh mục khuyến nghị (tiếng Việt)',
      'Schema bắt buộc:',
      '{"document_type":"procedure"|"template"|"guide"|"report"|"compliance"|"other",',
      '"main_topics":["string"],"suggested_tags":["string"],"summary":"string",',
      '"recommended_category":"string","confidence":0-1}',
    ].join(' '),
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'analyze_document',
      file_name: fileName,
      document_text: documentText.substring(0, 15000),
    }),
  },
];

const normalizeAnalysisResult = (rawContent, usage, model) => {
  const parsed = safeParseJson(rawContent);
  const summary = typeof parsed?.summary === 'string' && parsed.summary.trim().length > 0
    ? parsed.summary.trim()
    : 'Không thể tạo tóm tắt tài liệu.';

  return {
    document_type: parsed?.document_type || 'other',
    main_topics: Array.isArray(parsed?.main_topics) && parsed.main_topics.length > 0
      ? parsed.main_topics
      : [],
    suggested_tags: Array.isArray(parsed?.suggested_tags) && parsed.suggested_tags.length > 0
      ? parsed.suggested_tags
      : [],
    summary,
    recommended_category: typeof parsed?.recommended_category === 'string'
      ? parsed.recommended_category.trim()
      : 'Khác',
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0.65,
    model,
    usage,
    metadata: {
      response_type: parsed ? 'structured_json' : 'fallback_text',
      provider: 'azure-openai',
    },
  };
};

/**
 * Phân tích tài liệu để xác định loại, topics, tags, summary, category.
 * Trả về object với thông tin phân tích.
 */
export const analyzeDocument = async (fileName, documentText) => {
  if (!openaiClient) {
    return {
      document_type: 'other',
      main_topics: [],
      suggested_tags: [],
      summary: 'Hệ thống AI đang tạm thiết lập, không thể phân tích tài liệu.',
      recommended_category: 'Khác',
      confidence: 0,
      model: null,
      usage: null,
      metadata: {
        response_type: 'fallback_text',
        provider: 'azure-openai',
      },
    };
  }

  try {
    const completion = await runCompletion({
      messages: buildDocumentAnalysisPrompt(fileName, documentText),
      temperature: 0.1,
      maxTokens: 800,
      responseFormat: { type: 'json_object' },
    });

    return normalizeAnalysisResult(completion.content, completion.usage, completion.model);
  } catch (error) {
    console.error('Lỗi phân tích tài liệu:', error);
    throw new Error('Lỗi xảy ra quá trình phân tích tài liệu bằng Azure AI.');
  }
};
