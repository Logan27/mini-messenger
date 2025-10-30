import pg from 'pg';

const client = new pg.Client({
  connectionString: 'postgresql://messenger:messenger_password@localhost:5432/messenger'
});

await client.connect();

console.log('Checking all tables for naming conventions...\n');

const tables = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
);

const camelCaseTables = [];
const snakeCaseTables = [];
const mixedTables = [];

for (const table of tables.rows) {
  const tableName = table.tablename;

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [tableName]
  );

  const hasSnakeCase = cols.rows.some(r => r.column_name.includes('_'));
  const hasCamelCase = cols.rows.some(r => /[a-z][A-Z]/.test(r.column_name));

  let convention = 'unknown';
  if (hasSnakeCase && hasCamelCase) convention = 'MIXED ⚠️';
  else if (hasSnakeCase) convention = 'snake_case';
  else if (hasCamelCase) convention = 'camelCase';

  console.log(`Table: ${tableName.padEnd(30)} Convention: ${convention}`);

  if (convention === 'MIXED ⚠️') {
    const snakeCols = cols.rows.filter(r => r.column_name.includes('_')).map(r => r.column_name);
    const camelCols = cols.rows.filter(r => /[a-z][A-Z]/.test(r.column_name)).map(r => r.column_name);
    console.log(`  Snake_case: ${snakeCols.join(', ')}`);
    console.log(`  camelCase:  ${camelCols.join(', ')}`);
    console.log('');
    mixedTables.push(tableName);
  } else if (convention === 'camelCase') {
    camelCaseTables.push(tableName);
  } else if (convention === 'snake_case') {
    snakeCaseTables.push(tableName);
  }
}

console.log('\n=== SUMMARY ===\n');
console.log('Tables needing underscored: false (camelCase):');
camelCaseTables.forEach(t => console.log(`  - ${t}`));

console.log('\nTables needing underscored: true (snake_case):');
snakeCaseTables.forEach(t => console.log(`  - ${t}`));

console.log('\nTables with MIXED naming (need manual field mappings):');
mixedTables.forEach(t => console.log(`  - ${t}`));

await client.end();
