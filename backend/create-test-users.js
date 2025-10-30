import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'messenger',
  user: 'messenger',
  password: 'messenger_password'
});

async function createTestUsers() {
  try {
    // First check what tables exist
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    console.log('Tables in database:');
    console.table(tables.rows);

    const password = 'Test123456#';
    const passwordHash = await bcrypt.hash(password, 12);

    // Create testuser1
    await pool.query(`
      INSERT INTO users (id, username, email, "passwordHash", role, status, "approvalStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET "passwordHash" = $3, "approvalStatus" = $6
    `, ['testuser1', 'testuser1@test.com', passwordHash, 'user', 'offline', 'approved']);

    // Create testuser2
    await pool.query(`
      INSERT INTO users (id, username, email, "passwordHash", role, status, "approvalStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET "passwordHash" = $3, "approvalStatus" = $6
    `, ['testuser2', 'testuser2@test.com', passwordHash, 'user', 'offline', 'approved']);

    // Create admin user
    await pool.query(`
      INSERT INTO users (id, username, email, "passwordHash", role, status, "approvalStatus", "emailVerified", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET "passwordHash" = $3, role = $4, "approvalStatus" = $6
    `, ['admin', 'admin@test.com', passwordHash, 'admin', 'offline', 'approved']);

    console.log('Test users (including admin) created successfully');

    const result = await pool.query('SELECT id, username, email, status, "approvalStatus" FROM users ORDER BY username');
    console.log('\nExisting users:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUsers();
