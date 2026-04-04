const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const connectionString = 'postgresql://postgres:hokeos@localhost:5432/hokeos';
  console.log(`Connecting to: ${connectionString}`);
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('SUCCESS: Connected to PostgreSQL.');
    const res = await client.query('SELECT NOW()');
    console.log('Query Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('FAILURE: Could not connect to PostgreSQL.');
    console.error(err.message);
  }
}

testConnection();
