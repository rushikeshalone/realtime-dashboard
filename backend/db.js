const sql = require('mssql/msnodesqlv8');
require('dotenv').config();

// ============================================================
// SQL Server — Windows Authentication via Native ODBC Driver
// Native driver resolves Localhost\RUSHI named instances
// and seamlessly passes the Windows Auth token!
// ============================================================

const database = process.env.DB_NAME || 'Rushi';

// Use localhost for named instance to bypass external domain trust issues
const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=localhost\\RUSHI;Database=${database};Trusted_Connection=yes;`;

const cfg = {
  connectionString,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 8000,
  requestTimeout: 30000,
};

let pool = null;

const getPool = async () => {
  if (pool) return pool;

  console.log(`\n🔌 Connecting to SQL Server (Native Windows Auth)...`);
  console.log(`   Database : ${database}`);
  console.log(`   String   : ${connectionString}`);

  try {
    pool = await new sql.ConnectionPool(cfg).connect();
    pool.on('error', (err) => {
      console.error('❌ DB Pool Error:', err.message);
      pool = null; // force reconnect on next query
    });
    
    // Verify connection
    const result = await pool.request().query('SELECT DB_NAME() AS db');
    console.log(`✅ Connected to DB: "${result.recordset[0].db}"`);
    return pool;
  } catch (err) {
    console.error(`❌ SQL Server Connection Failed: ${err.message}`);
    pool = null;
    throw err;
  }
};

const query = async (queryStr, params = {}) => {
  const p = await getPool();
  const request = p.request();
  Object.entries(params).forEach(([key, val]) => {
    request.input(key, val);
  });
  return request.query(queryStr);
};

module.exports = { getPool, query, sql };
