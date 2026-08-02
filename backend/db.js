require('dotenv').config();

const rawServer = process.env.DB_SERVER || [process.env.DB_HOST, process.env.DB_INSTANCE].filter(Boolean).join('\\') || 'localhost\\RUSHI';
const serverHost = rawServer.includes('\\') ? rawServer.split('\\')[0] : rawServer;
const instanceName = rawServer.includes('\\') ? rawServer.split('\\')[1] : undefined;
const databaseName = process.env.DB_NAME || process.env.DB_DATABASE;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD || process.env.DB_PASS;
const dbAuthMode = process.env.DB_AUTH ? process.env.DB_AUTH.toLowerCase() : undefined;
const useSqlAuth = dbAuthMode === 'sql' || (!!dbUser && !!dbPassword);
const useWindowsAuth = dbAuthMode === 'windows' || (!dbAuthMode && !useSqlAuth);

let sql;
let cfg;

if (useSqlAuth) {
  sql = require('mssql');
  cfg = {
    server: serverHost,
    database: databaseName,
    user: dbUser,
    password: dbPassword,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
      enableArithAbort: true,
      ...(instanceName ? { instanceName } : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 8000,
    requestTimeout: 30000,
  };

  if (process.env.DB_PORT && !instanceName) {
    cfg.port = parseInt(process.env.DB_PORT, 10);
  }

  console.log('🔐 Using SQL Server authentication');
} else if (useWindowsAuth) {
  sql = require('mssql/msnodesqlv8');
  cfg = {
    driver: 'msnodesqlv8',
    server: serverHost,
    database: databaseName,
    options: {
      trustedConnection: true,
      trustServerCertificate: true,
      enableArithAbort: true,
      ...(instanceName ? { instanceName } : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 8000,
    requestTimeout: 30000,
  };

  console.log(`🔐 Using Windows authentication (trusted connection) on ${serverHost}${instanceName ? '\\' + instanceName : ''}`);
} else {
  throw new Error('DB_AUTH is invalid. Use DB_AUTH=sql or DB_AUTH=windows, or provide DB_USER and DB_PASS for SQL auth.');
}

let pool = null;

const getPool = async () => {
  if (pool) return pool;

  console.log(`\n🔌 Connecting to SQL Server...`);
  console.log(`   Database : ${cfg.database}`);
  console.log(`   Server   : ${rawServer}`);

  try {
    pool = await new sql.ConnectionPool(cfg).connect();
    pool.on('error', (err) => {
      console.error('❌ DB Pool Error:', err.message);
      pool = null; // force reconnect on next query
    });

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
