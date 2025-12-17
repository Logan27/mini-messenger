import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'messenger',
  user: 'messenger',
  password: 'messenger_password'
});

async function unlockAdmin() {
  try {
    await pool.query(`
      UPDATE users
      SET failed_login_attempts = 0, locked_until = NULL
      WHERE username = $1
    `, ['admin']);

    console.log('✅ Admin account unlocked successfully');

    const result = await pool.query(`
      SELECT username, failed_login_attempts, locked_until
      FROM users
      WHERE username = $1
    `, ['admin']);

    console.log('Admin account status:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

unlockAdmin();
