require('dotenv').config();
const sql = require('mssql/msnodesqlv8');
const fs = require('fs');

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('conn-test-output.txt', msg + '\n');
};

fs.writeFileSync('conn-test-output.txt', '=== msnodesqlv8 ConnectionString Test ===\n');
log(`Time: ${new Date().toISOString()}`);

const dbName = process.env.DB_NAME || 'Rushi';

(async () => {
  
  const drivers = [
    'ODBC Driver 17 for SQL Server',
    'ODBC Driver 13 for SQL Server',
    'ODBC Driver 11 for SQL Server',
    'SQL Server Native Client 11.0',
    'SQL Server'
  ];

  for (const driver of drivers) {
    log(`Testing driver: ${driver}...`);
    try {
      // Local port 62552 is known working for socket
      const connectionString = `Driver={${driver}};Server=127.0.0.1,62552;Database=${dbName};Trusted_Connection=yes;`;
      const pool = await new sql.ConnectionPool({ connectionString }).connect();
      const res = await pool.request().query("SELECT DB_NAME() AS db, SUSER_NAME() AS usr");
      await pool.close();
      log(`  ✅ SUCCESS using driver: ${driver} (${res.recordset[0].db}, ${res.recordset[0].usr})`);
      log('');
      return; 
    } catch (e) {
      log(`  ❌ Failed: ${e.message.split('\n')[0]}`);
    }
  }

  log('=== Done ===');
})();
