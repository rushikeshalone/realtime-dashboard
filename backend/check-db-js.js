const { getPool } = require('./db.js');
const fs = require('fs');

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync('db-test-output.txt', msg + '\n');
};

fs.writeFileSync('db-test-output.txt', '=== DB Test Started ===\n');

(async () => {
  try {
    log('Attempting to get pool using rewritten db.js...');
    const pool = await getPool();
    const res = await pool.request().query("SELECT TOP 3 * FROM Dashboard_TopCards");
    log('✅ Successfully fetched data from db! Length: ' + res.recordset.length);
  } catch (err) {
    log('❌ Error: ' + err.message);
    log(err.stack);
  }
})();
