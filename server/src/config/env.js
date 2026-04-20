const REQUIRED_ENV_KEYS = ['DATABASE_URL', 'JWT_SECRET'];

export const validateEnv = () => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  const optionalWarnings = [];
  if (!process.env.AZURE_OPENAI_API_KEY) {
    optionalWarnings.push('AZURE_OPENAI_API_KEY not configured. AI features will be disabled.');
  }
  if (!process.env.AZURE_OPENAI_ENDPOINT) {
    optionalWarnings.push('AZURE_OPENAI_ENDPOINT not configured. AI features may be unavailable.');
  }
  if (!process.env.AZURE_OPENAI_API_VERSION) {
    optionalWarnings.push('AZURE_OPENAI_API_VERSION not configured. AI features may be unavailable.');
  }

  return {
    missingKeys,
    optionalWarnings,
  };
};

export const getCorsOrigins = () => {
  const origins = [];

  // Add CORS_ORIGINS from env
  if (process.env.CORS_ORIGINS) {
    const corsOrigins = process.env.CORS_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    origins.push(...corsOrigins);
  }

  // Add FRONTEND_URL if configured
  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL)) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Default to localhost for development
  if (origins.length === 0) {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }

  return origins;
};
