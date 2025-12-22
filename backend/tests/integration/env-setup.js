// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'messenger'; // Use main DB or messenger_test if available
process.env.DB_USER = 'messenger';
process.env.DB_PASSWORD = 'messenger_password'; // Default from .env.example or common
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.SESSION_SECRET = 'test-session-secret';
