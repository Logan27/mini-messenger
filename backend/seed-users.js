import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Client } = pg;

// Password to hash: Admin123!@#
const password = 'Admin123!@#';
const saltRounds = 12;

async function seedUsers() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'messenger',
    user: 'messenger',
    password: 'messenger_password',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Generate password hash
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log(`\n📝 Generated password hash for: ${password}`);
    console.log(`Hash: ${passwordHash}\n`);

    // Update admin user
    await client.query(`
      UPDATE users 
      SET "passwordHash" = $1, 
          username = 'admin',
          role = 'admin',
          "approvalStatus" = 'approved',
          "emailVerified" = true
      WHERE email = 'admin@messenger.local'
    `, [passwordHash]);
    console.log('✅ Admin user updated');

    // Update test users with same password
    const testUsers = [
      { username: 'alice', email: 'alice@test.com' },
      { username: 'bob', email: 'bob@test.com' },
      { username: 'charlie', email: 'charlie@test.com' },
      { username: 'diana', email: 'diana@test.com' },
      { username: 'eve', email: 'eve@test.com' },
    ];

    for (const user of testUsers) {
      await client.query(`
        UPDATE users 
        SET "passwordHash" = $1,
            "approvalStatus" = 'approved',
            "emailVerified" = true
        WHERE email = $2
      `, [passwordHash, user.email]);
      console.log(`✅ Updated user: ${user.username}`);
    }

    // Display all created users
    const result = await client.query(`
      SELECT 
        username,
        email,
        "firstName",
        "lastName",
        role,
        "approvalStatus",
        "emailVerified"
      FROM users 
      WHERE email IN (
        'admin@messenger.local',
        'alice@test.com',
        'bob@test.com',
        'charlie@test.com',
        'diana@test.com',
        'eve@test.com'
      )
      ORDER BY role DESC, username
    `);

    console.log('\n📋 Created Users:');
    console.log('==========================================');
    console.log('Credentials: username / Admin123!@#');
    console.log('==========================================');
    result.rows.forEach(user => {
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.approvalStatus}`);
      console.log('');
    });

    await client.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

seedUsers();
