const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'messenger',
  password: 'messenger_password',
  database: 'messenger'
});

async function checkSessionsTable() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'sessions\' AND table_schema = \'public\'');
    console.log('Sessions table columns:');
    res.rows.forEach(row => console.log('  -', row.column_name));
    
    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSessionsTable();