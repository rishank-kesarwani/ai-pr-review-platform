import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  publicAccessEnabled: process.env.PUBLIC_ACCESS_ENABLED !== 'false',

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-pr-review',
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-replace-in-prod-32-chars-min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-replace-in-prod-32-chars-min',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  aiPlatform: {
    url: process.env.AI_PLATFORM_URL || 'http://localhost:4000',
    apiKey: process.env.AI_PLATFORM_PR_REVIEW_API_KEY || 'dev-ai-pr-review-api-key',
    timeoutMs: parseInt(process.env.AI_PLATFORM_TIMEOUT_MS || '60000', 10),
    model: process.env.AI_MODEL || 'gemini-1.5-pro',
  },

  modelRegression: {
    url: process.env.MODEL_REGRESSION_URL || 'http://localhost:5000',
    apiKey: process.env.MODEL_REGRESSION_API_KEY || 'dev-model-regression-api-key',
    timeoutMs: parseInt(process.env.MODEL_REGRESSION_TIMEOUT_MS || '10000', 10),
    checkMode: process.env.REGRESSION_CHECK_MODE || 'manual', // manual, review, ci, critical-only
    blocking: process.env.REGRESSION_BLOCKING === 'true',
    defaultDatasetId: process.env.REGRESSION_DEFAULT_DATASET || 'pr-review-evaluation',
    defaultBaselineId: process.env.REGRESSION_DEFAULT_BASELINE || 'pr-review-baseline-v1',
  },

  notificationService: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4001',
    apiKey: process.env.NOTIFICATION_PR_REVIEW_API_KEY || 'dev-notification-pr-review-api-key',
    timeoutMs: parseInt(process.env.NOTIFICATION_TIMEOUT_MS || '10000', 10),
  },

  github: {
    appId: process.env.GITHUB_APP_ID || '',
    clientId: process.env.GITHUB_APP_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || '',
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY
      ? process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    autoCommentEnabled: process.env.AUTO_COMMENT_ENABLED === 'true',
  },

  reviewLimits: {
    maxFiles: parseInt(process.env.REVIEW_MAX_FILES || '50', 10),
    maxDiffSize: parseInt(process.env.REVIEW_MAX_DIFF_SIZE || '1048576', 10), // 1MB default
    maxTokens: parseInt(process.env.REVIEW_MAX_TOKENS || '32000', 10),
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
  },
}));
