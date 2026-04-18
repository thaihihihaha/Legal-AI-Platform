import { Router } from 'express';
import { agentAsk } from '../agents/legal_agent.js';
import { resolveCompanyId } from '../services/tenantService.js';
import { appendChatMessages, ensureDefaultSession } from '../services/chatService.js';
import { buildLegalPromptContext, searchLegalEvidence } from '../services/legalRetrieval.js';
import { requireAction } from '../middleware/rolePermissions.js';

const router = Router();

// Hỏi đáp chuyên sâu AI
router.post('/ask', requireAction('view:legal_ai'), async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Cần nhập nội dung' });

  try {
      const { evidence, retrieval_tier, retrieval_note } = await searchLegalEvidence(question, { topK: 5 });
      const promptContext = buildLegalPromptContext(evidence);
      const resp = await agentAsk(question, promptContext);

      const companyId = await resolveCompanyId(req.user);
      if (companyId && req.user?.id) {
        const session = await ensureDefaultSession(companyId, req.user.id);
        await appendChatMessages({
          sessionId: session.id,
          companyId,
          userMessage: question,
          aiMessage: resp,
        });
      }

      // Đính kèm source_tier và source_url từ evidence vào citations nếu AI không tự gắn
      const enrichedCitations = (resp.citations || []).map((cit, i) => ({
        ...cit,
        source_tier: cit.source_tier || evidence[i]?.source_tier || retrieval_tier,
        source_url: cit.source_url || evidence[i]?.source_url || null,
        retrieved_at: evidence[i]?.retrieved_at || null,
        is_freshness_verified: evidence[i]?.is_freshness_verified ?? false,
      }));

      res.json({
        answer: resp.answer,
        citations: enrichedCitations,
        confidence: resp.confidence,
        warnings: resp.warnings,
        follow_up: resp.follow_up,
        model: resp.model,
        usage: resp.usage,
        metadata: {
          ...resp.metadata,
          retrieval_tier,
          retrieval_note,
        },
        evidence,
        question,
      });
  } catch (err) {
      res.status(500).json({ error: 'Lỗi thực thi AI', details: err.message });
  }
});

export default router;
