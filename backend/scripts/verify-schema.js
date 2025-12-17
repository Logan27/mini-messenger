
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'messenger',
    password: process.env.POSTGRES_PASSWORD || 'messenger_password',
    database: process.env.POSTGRES_DB || 'messenger',
});

function isSnakeCase(str) {
    // snake_case should only contain lowercase letters, numbers, and underscores
    // It should not start or end with underscore
    return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(str);
}

async function verifySchema() {
    const client = await pool.connect();
    let violations = [];

    try {
        console.log('🔌 Connected to database...');

        // Get all tables in public schema
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta'
    `);

        const tables = tablesRes.rows.map(r => r.table_name);
        console.log(`🔍 Found ${tables.length} tables. Checking naming conventions...`);

        for (const table of tables) {
            if (!isSnakeCase(table)) {
                violations.push(`Table '${table}' is not snake_case`);
            }

            const columnsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [table]);

            const columns = columnsRes.rows.map(r => r.column_name);

            for (const column of columns) {
                if (!isSnakeCase(column)) {
                    violations.push(`Column '${table}.${column}' is not snake_case`);
                }
            }
        }

        console.log('\n📊 Verification Results:');
        if (violations.length === 0) {
            console.log('✅ All tables and columns use snake_case naming convention.');
            // Check for specific known tables to ensure we are looking at the right DB
            if (tables.includes('users') && tables.includes('messages')) {
                console.log('✅ Core tables (users, messages) found.');
            } else {
                console.warn('⚠️  Core tables not found. Is the database initialized?');
            }
        } else {
            console.error('❌ Found naming convention violations:');
            violations.forEach(v => console.error(`  - ${v}`));
            process.exit(1);
        }

    } catch (err) {
        console.error('❌ Error during verification:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

verifySchema();
