import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'messenger',
  user: 'messenger',
  password: 'messenger_password'
});

async function addDeleteTypeColumn() {
  try {
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='messages' AND column_name='deleteType'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column deleteType already exists');
    } else {
      // Add the column
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_messages_deleteType') THEN
            CREATE TYPE "enum_messages_deleteType" AS ENUM ('soft', 'hard');
          END IF;
        END $$;
      `);

      await pool.query(`
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS "deleteType" "enum_messages_deleteType"
      `);

      console.log('✅ Column deleteType added successfully');
    }

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name='messages'
      ORDER BY ordinal_position
    `);

    console.log('\nMessages table columns:');
    console.table(result.rows);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addDeleteTypeColumn();
