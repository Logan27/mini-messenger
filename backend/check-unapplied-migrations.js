import pg from 'pg';
import fs from 'fs';

const client = new pg.Client({
  connectionString: 'postgresql://messenger:messenger_password@localhost:5432/messenger'
});

await client.connect();

const result = await client.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
const appliedMigrations = result.rows.map(r => r.name);

const allMigrations = fs.readdirSync('migrations').filter(f => f.endsWith('.js')).sort();

console.log('Unapplied migrations:');
allMigrations.forEach(migration => {
  if (!appliedMigrations.includes(migration)) {
    console.log(`  - ${migration}`);
  }
});

await client.end();
