// Test with @neondatabase/serverless
const { neon } = require('@neondatabase/serverless');

async function main() {
  // Try the new connection string
  const connStr = "postgresql://neondb_owner:npg_3FjLHURzkui7@ep-solitary-meadow-ail1xhfc.c-4.us-east-1.aws.neon.tech/neondb";
  
  console.log('Testing with @neondatabase/serverless...');
  
  try {
    const sql = neon(connStr);
    const result = await sql`SELECT 'connected' as status, current_database() as db`;
    console.log('✅ SUCCESS!');
    console.log('Result:', result);
    
    // Check tables
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('Tables:', tables);
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

main();
