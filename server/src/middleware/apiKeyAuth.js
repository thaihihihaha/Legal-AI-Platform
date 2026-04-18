import { touchApiKeyUsage, validatePlainApiKey } from '../services/apiKeyService.js';

const bucket = new Map();
const WINDOW_MS = Number(process.env.API_KEY_RATE_LIMIT_WINDOW_MS || 60_000);

const resolveApiKeyFromRequest = (req) => {
  const fromHeader = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim();
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('ApiKey ')) {
    return authorization.slice('ApiKey '.length).trim();
  }

  return null;
};

const checkRateLimit = ({ companyId, keyId, limit }) => {
  const now = Date.now();
  const rateLimit = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : 60;
  const mapKey = `${companyId}:${keyId}`;

  const current = bucket.get(mapKey);
  if (!current || current.resetAt <= now) {
    const nextState = {
      count: 1,
      resetAt: now + WINDOW_MS,
      limit: rateLimit,
    };
    bucket.set(mapKey, nextState);
    return {
      allowed: true,
      remaining: rateLimit - 1,
      resetAt: nextState.resetAt,
      limit: rateLimit,
    };
  }

  if (current.count >= rateLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      limit: rateLimit,
    };
  }

  current.count += 1;
  bucket.set(mapKey, current);
  return {
    allowed: true,
    remaining: Math.max(0, rateLimit - current.count),
    resetAt: current.resetAt,
    limit: rateLimit,
  };
};

export const requireApiKey = async (req, res, next) => {
  try {
    const plainApiKey = resolveApiKeyFromRequest(req);
    if (!plainApiKey) {
      return res.status(401).json({ error: 'Thiếu API key hợp lệ.' });
    }

    const apiKeyRecord = await validatePlainApiKey(plainApiKey);
    if (!apiKeyRecord) {
      return res.status(401).json({ error: 'API key không hợp lệ hoặc đã hết hạn.' });
    }

    const rateState = checkRateLimit({
      companyId: apiKeyRecord.company_id,
      keyId: apiKeyRecord.id,
      limit: apiKeyRecord.rate_limit,
    });

    res.setHeader('X-RateLimit-Limit', String(rateState.limit));
    res.setHeader('X-RateLimit-Remaining', String(rateState.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(rateState.resetAt / 1000)));

    if (!rateState.allowed) {
      return res.status(429).json({
        error: 'API key đã vượt quá giới hạn request trong cửa sổ hiện tại.',
      });
    }

    req.apiKey = {
      id: apiKeyRecord.id,
      companyId: apiKeyRecord.company_id,
      permissions: Array.isArray(apiKeyRecord.permissions) ? apiKeyRecord.permissions : [],
      rateLimit: apiKeyRecord.rate_limit,
      name: apiKeyRecord.name,
    };

    await touchApiKeyUsage(apiKeyRecord.id);
    next();
  } catch (error) {
    console.error('Lỗi xác thực API key:', error);
    return res.status(500).json({ error: 'Không thể xác thực API key lúc này.' });
  }
};

export const requireApiPermission = (permission) => (req, res, next) => {
  const permissions = Array.isArray(req.apiKey?.permissions) ? req.apiKey.permissions : [];
  if (!permissions.includes(permission)) {
    return res.status(403).json({ error: `API key thiếu quyền ${permission}.` });
  }

  next();
};
