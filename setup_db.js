const { Client } = require('pg');

async function main() {
  // Connect to default postgres db to create reimburse_db
  const adminClient = new Client({
    connectionString: 'postgresql://postgres:mansisql@localhost:5432/postgres'
  });
  
  try {
    await adminClient.connect();
    console.log('Connected to postgres');
    
    // Check if reimburse_db exists
    const res = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'reimburse_db'"
    );
    
    if (res.rows.length === 0) {
      await adminClient.query('CREATE DATABASE reimburse_db');
      console.log('✅ Created database: reimburse_db');
    } else {
      console.log('✅ Database reimburse_db already exists');
    }
    await adminClient.end();
  } catch (e) {
    console.error('DB setup error:', e.message);
    try { await adminClient.end(); } catch (_) {}
    process.exit(1);
  }
}

main();
