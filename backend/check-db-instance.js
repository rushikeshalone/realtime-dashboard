const sql = require('mssql/msnodesqlv8');
const fs = require('fs');

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('db-test-output-instance.txt', msg + '\n');
};

fs.writeFileSync('db-test-output-instance.txt', '=== DB Test Instance Started ===\n');

(async () => {
  try {
    const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=localhost\\RUSHI;Database=Rushi;Trusted_Connection=yes;`;
    log(`Testing: ${connectionString}`);
    const cfg = {
        connectionString,
        connectionTimeout: 8000,
        requestTimeout: 10000,
    };
    const pool = await new sql.ConnectionPool(cfg).connect();
    const res = await pool.request().query("SELECT TOP 3 * FROM Dashboard_TopCards");
    log('✅ Successfully fetched data from db! Length: ' + res.recordset.length);
  } catch (err) {
    log('❌ Error: ' + err.message);
  }
})();
