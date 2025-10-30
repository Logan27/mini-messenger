const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'messenger',
  user: 'messenger_user',
  password: 'messenger_pass'
});

async function createTestUsers() {
  try {
    const password = 'Test123456!';
    const passwordHash = await bcrypt.hash(password, 12);

    // Create testuser1
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET password_hash = $3, status = $5
    `, ['testuser1', 'testuser1@test.com', passwordHash, 'user', 'active']);

    // Create testuser2
    await pool.query(`
      INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (username) DO UPDATE SET password_hash = $3, status = $5
    `, ['testuser2', 'testuser2@test.com', passwordHash, 'user', 'active']);

    console.log('Test users created successfully');

    const result = await pool.query('SELECT id, username, email, status FROM users ORDER BY id');
    console.log('\nExisting users:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUsers();
