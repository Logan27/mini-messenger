import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'messenger',
  user: 'messenger',
  password: 'messenger_password',
  connectionTimeoutMillis: 10000,
});

console.log('Attempting to connect to PostgreSQL at 127.0.0.1:5432...');

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then((result) => {
    console.log('✅ Query executed:', result.rows[0]);
    return client.end();
  })
  .then(() => {
    console.log('✅ Connection closed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection error:', err.message);
    console.error('Error code:', err.code);
    console.error('Error details:', err);
    process.exit(1);
  });
