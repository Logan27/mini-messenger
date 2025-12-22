import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT, 10) || 60000,
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 20000,
    },
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    family: parseInt(process.env.REDIS_FAMILY, 10) || 4,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'messenger-backend',
    audience: process.env.JWT_AUDIENCE || 'messenger-users',
  },

  session: {
    secret: process.env.SESSION_SECRET,
    name: process.env.SESSION_NAME || 'messenger.sid',
    resave: process.env.SESSION_RESAVE === 'true',
    saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
    cookie: {
      maxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE, 10) || 86400000,
      secure: process.env.SESSION_COOKIE_SECURE === 'true',
      httpOnly: process.env.SESSION_COOKIE_HTTP_ONLY === 'true',
    },
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || [
        'Content-Type',
        'Authorization',
        'x-csrf-token',
      ],
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
      maxRequests:
        parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) ||
        (process.env.NODE_ENV === 'development' ? 10000 : 100),
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
    },
    csrfSecret: process.env.CSRF_SECRET,
    mobileAppSecret: process.env.MOBILE_APP_SECRET,
  },

  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    maxFiles: parseInt(process.env.UPLOAD_MAX_FILES, 10) || 5,
    tempDir: process.env.UPLOAD_TEMP_DIR || './temp',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
  },

  clamav: {
    host: process.env.CLAMAV_HOST || 'localhost',
    port: parseInt(process.env.CLAMAV_PORT, 10) || 3310,
    timeout: parseInt(process.env.CLAMAV_TIMEOUT, 10) || 30000,
    scanArchives: process.env.CLAMAV_SCAN_ARCHIVES === 'true',
    removeInfected: process.env.CLAMAV_REMOVE_INFECTED === 'true',
  },

  encryption: {
    keypairSeed: process.env.ENCRYPTION_KEYPAIR_SEED,
  },

  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5,
  },

  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    path: process.env.METRICS_PATH || '/metrics',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || '/api-docs',
    title: process.env.SWAGGER_TITLE || 'Messenger API',
    description: process.env.SWAGGER_DESCRIPTION || 'Real-time messenger API',
    version: process.env.SWAGGER_VERSION || '1.0.0',
  },

  features: {
    videoCalls: process.env.FEATURE_VIDEO_CALLS === 'true',
    fileSharing: process.env.FEATURE_FILE_SHARING === 'true',
    screenSharing: process.env.FEATURE_SCREEN_SHARING === 'true',
    messageReactions: process.env.FEATURE_MESSAGE_REACTIONS === 'true',
    typingIndicators: process.env.FEATURE_TYPING_INDICATORS === 'true',
  },

  messageRetention: {
    days: parseInt(process.env.MESSAGE_RETENTION_DAYS, 10) || 30,
    cleanupSchedule: process.env.CLEANUP_SCHEDULE || '0 2 * * *',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@messenger.local',
    password: process.env.ADMIN_PASSWORD,
  },

  trustProxy: {
    enabled: process.env.TRUST_PROXY === 'true',
    hops: parseInt(process.env.TRUST_PROXY_HOPS, 10) || 1,
  },

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// Validate critical configuration
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'CSRF_SECRET', 'MOBILE_APP_SECRET'];

const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export default config;
