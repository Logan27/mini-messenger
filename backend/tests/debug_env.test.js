import { jest } from '@jest/globals';

describe('Debug Env', () => {
  it('should print env vars', () => {
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
  });
});
