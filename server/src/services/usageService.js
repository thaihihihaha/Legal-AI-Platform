import { prisma } from '../lib/prisma.js';

let usageLogsAvailable = null;
let llmUsageAvailable = null;

const ensureUsageLogsTable = async () => {
  if (usageLogsAvailable !== null) return usageLogsAvailable;
  try {
    await prisma.$queryRaw`SELECT 1 FROM usage_logs LIMIT 1`;
    usageLogsAvailable = true;
  } catch {
    usageLogsAvailable = false;
  }
  return usageLogsAvailable;
};

const ensureLlmUsageTable = async () => {
  if (llmUsageAvailable !== null) return llmUsageAvailable;
  try {
    await prisma.$queryRaw`SELECT 1 FROM llm_usage LIMIT 1`;
    llmUsageAvailable = true;
  } catch {
    llmUsageAvailable = false;
  }
  return llmUsageAvailable;
};

export const logUsage = async ({
  companyId,
  userId = null,
  apiKeyId = null,
  endpoint,
  agentType = 'qa',
  inputTokens = 0,
  outputTokens = 0,
  totalCostUsd = 0,
  latencyMs = null,
  statusCode = 200,
  requestMetadata = {},
  provider = 'azure-openai',
  model = 'unknown',
  requestType = 'ask',
}) => {
  const now = new Date();
  if (await ensureUsageLogsTable()) {
    await prisma.$executeRaw`
      INSERT INTO usage_logs
        (company_id, user_id, api_key_id, endpoint, agent_type, input_tokens, output_tokens, total_cost_usd, latency_ms, status_code, request_metadata, created_at)
      VALUES
        (${companyId}::uuid, ${userId}::uuid, ${apiKeyId}::uuid, ${endpoint}, ${agentType}::agent_type, ${inputTokens}, ${outputTokens}, ${totalCostUsd}, ${latencyMs}, ${statusCode}, ${JSON.stringify(requestMetadata)}::jsonb, ${now})
    `;
  }

  if (await ensureLlmUsageTable()) {
    await prisma.$executeRaw`
      INSERT INTO llm_usage
        (company_id, user_id, provider, model, input_tokens, output_tokens, estimated_cost, request_type, created_at)
      VALUES
        (${companyId}::uuid, ${userId}::uuid, ${provider}, ${model}, ${inputTokens}, ${outputTokens}, ${totalCostUsd}, ${requestType}, ${now})
    `;
  }
};

export const getUsageDashboard = async ({ companyId, days = 7 }) => {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(1, Math.min(Number(days), 90)) : 7;

  const summary = {
    total_requests: 0,
    success_requests: 0,
    failed_requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_usd: 0,
  };

  let trends = [];
  let endpoints = [];

  if (await ensureUsageLogsTable()) {
    const summaryRows = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::int AS success_requests,
        COUNT(*) FILTER (WHERE status_code >= 400)::int AS failed_requests,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        COALESCE(SUM(total_cost_usd), 0)::numeric AS estimated_cost_usd
      FROM usage_logs
      WHERE company_id = ${companyId}::uuid
        AND created_at >= now() - (${safeDays} || ' days')::interval
    `;

    if (summaryRows[0]) {
      summary.total_requests = Number(summaryRows[0].total_requests || 0);
      summary.success_requests = Number(summaryRows[0].success_requests || 0);
      summary.failed_requests = Number(summaryRows[0].failed_requests || 0);
      summary.input_tokens = Number(summaryRows[0].input_tokens || 0);
      summary.output_tokens = Number(summaryRows[0].output_tokens || 0);
      summary.estimated_cost_usd = Number(summaryRows[0].estimated_cost_usd || 0);
    }

    trends = await prisma.$queryRaw`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS total_requests,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        COALESCE(SUM(total_cost_usd), 0)::numeric AS estimated_cost_usd
      FROM usage_logs
      WHERE company_id = ${companyId}::uuid
        AND created_at >= now() - (${safeDays} || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `;

    endpoints = await prisma.$queryRaw`
      SELECT
        endpoint,
        COUNT(*)::int AS total_requests,
        COALESCE(SUM(input_tokens), 0)::int AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int AS output_tokens,
        COALESCE(SUM(total_cost_usd), 0)::numeric AS estimated_cost_usd
      FROM usage_logs
      WHERE company_id = ${companyId}::uuid
        AND created_at >= now() - (${safeDays} || ' days')::interval
      GROUP BY endpoint
      ORDER BY total_requests DESC
      LIMIT 20
    `;
  }

  return {
    summary,
    trends: trends.map((row) => ({
      date: row.date,
      total_requests: Number(row.total_requests || 0),
      input_tokens: Number(row.input_tokens || 0),
      output_tokens: Number(row.output_tokens || 0),
      estimated_cost_usd: Number(row.estimated_cost_usd || 0),
    })),
    endpoints: endpoints.map((row) => ({
      endpoint: row.endpoint,
      total_requests: Number(row.total_requests || 0),
      input_tokens: Number(row.input_tokens || 0),
      output_tokens: Number(row.output_tokens || 0),
      estimated_cost_usd: Number(row.estimated_cost_usd || 0),
    })),
    window_days: safeDays,
  };
};
