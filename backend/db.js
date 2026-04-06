const sql = require('mssql');
require('dotenv').config();

const rawServer = process.env.DB_SERVER || 'localhost\\RUSHI';
const serverHost = rawServer.includes('\\') ? rawServer.split('\\')[0] : rawServer;
const instanceName = rawServer.includes('\\') ? rawServer.split('\\')[1] : undefined;

const cfg = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: serverHost,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    ...(instanceName && { instanceName }),
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 8000,
  requestTimeout: 30000,
};

let pool = null;

const getPool = async () => {
  if (pool) return pool;

  console.log(`\n🔌 Connecting to SQL Server...`);
  console.log(`   Database : ${cfg.database}`);
  console.log(`   Server   : ${cfg.server}`);

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
