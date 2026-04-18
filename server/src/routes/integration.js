import { Router } from 'express';
import { agentAsk, reviewContract } from '../agents/legal_agent.js';
import { getContractById, updateContractReview } from '../services/contractsService.js';
import { buildLegalPromptContext, searchLegalEvidence } from '../services/legalRetrieval.js';
import { requireApiKey, requireApiPermission } from '../middleware/apiKeyAuth.js';
import { logUsage } from '../services/usageService.js';

const router = Router();

router.use(requireApiKey);

router.post('/legal/ask', requireApiPermission('ask'), async (req, res) => {
  const { question } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question là bắt buộc.' });
  }

  const startedAt = Date.now();
  try {
    const evidence = await searchLegalEvidence(question, { topK: 5 });
    const promptContext = buildLegalPromptContext(evidence);
    const resp = await agentAsk(question, promptContext);

    await logUsage({
      companyId: req.apiKey.companyId,
      apiKeyId: req.apiKey.id,
      endpoint: '/v1/integration/legal/ask',
      agentType: 'qa',
      inputTokens: Number(resp?.usage?.prompt_tokens || 0),
      outputTokens: Number(resp?.usage?.completion_tokens || 0),
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      requestMetadata: { evidence_count: evidence.length },
      provider: 'azure-openai',
      model: resp?.model || 'unknown',
      requestType: 'legal_ask',
    });

    res.json({
      answer: resp.answer,
      citations: resp.citations,
      confidence: resp.confidence,
      warnings: resp.warnings,
      follow_up: resp.follow_up,
      model: resp.model,
      usage: resp.usage,
      metadata: resp.metadata,
      evidence,
      question,
    });
  } catch (error) {
    await logUsage({
      companyId: req.apiKey.companyId,
      apiKeyId: req.apiKey.id,
      endpoint: '/v1/integration/legal/ask',
      agentType: 'qa',
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      requestMetadata: { error: error.message },
      requestType: 'legal_ask',
    });

    res.status(500).json({ error: 'Không thể xử lý legal ask qua API integration.' });
  }
});

router.post('/contracts/:id/review', requireApiPermission('review'), async (req, res) => {
  const startedAt = Date.now();
  try {
    const companyId = req.apiKey.companyId;
    const contractId = req.params.id;

    const contract = await getContractById(companyId, contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Không tìm thấy hợp đồng.' });
    }

    const bodyText = typeof req.body?.contractText === 'string' ? req.body.contractText.trim() : '';
    const normalizedText = bodyText || String(contract.extracted_text || '').trim();
    if (!normalizedText) {
      return res.status(400).json({ error: 'Không có nội dung hợp đồng để review.' });
    }

    const result = await reviewContract(normalizedText);
    await updateContractReview(companyId, contractId, result);

    await logUsage({
      companyId,
      apiKeyId: req.apiKey.id,
      endpoint: '/v1/integration/contracts/:id/review',
      agentType: 'review',
      inputTokens: Number(result?.usage?.prompt_tokens || 0),
      outputTokens: Number(result?.usage?.completion_tokens || 0),
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      requestMetadata: { contract_id: contractId },
      provider: 'azure-openai',
      model: result?.model || 'unknown',
      requestType: 'contract_review',
    });

    res.json({ result });
  } catch (error) {
    await logUsage({
      companyId: req.apiKey.companyId,
      apiKeyId: req.apiKey.id,
      endpoint: '/v1/integration/contracts/:id/review',
      agentType: 'review',
      latencyMs: Date.now() - startedAt,
      statusCode: 500,
      requestMetadata: { error: error.message },
      requestType: 'contract_review',
    });

    res.status(500).json({ error: 'Không thể review hợp đồng qua API integration.' });
  }
});

export default router;