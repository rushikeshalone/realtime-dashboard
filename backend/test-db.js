require('dotenv').config();
const sql = require('mssql');

const server = process.env.DB_SERVER || 'DESKTOP-40B0H7H\\RUSHI';
const database = process.env.DB_NAME || 'Rushi';

const isSqlAuth = !!process.env.DB_PASSWORD;

const cfg = {
  server,
  database,
  port: 1433,
  ...(isSqlAuth ? {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  } : {
    authentication: {
      type: 'ntlm',
      options: {
        domain: '',
        userName: process.env.DB_USER || 'Rushikesh',
        password: '',
      },
    }
  }),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: server.includes('\\') ? server.split('\\')[1] : 'RUSHI',
  },
  connectionTimeout: 15000,
};

console.log('=== Testing SQL Server Connection ===');
console.log('Server  :', server);
console.log('Database:', database);
console.log('Mode    : ' + (isSqlAuth ? 'SQL Authentication' : 'Windows Auth (NTLM)'));
console.log('');

sql.connect(cfg)
  .then((pool) => {
    console.log(`✅ SUCCESS - Connected via ${isSqlAuth ? 'SQL Auth' : 'Windows Auth (NTLM)'}`);
    return pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS dbname');
  })
  .then((result) => {
    console.log('DB Name :', result.recordset[0].dbname);
    console.log('Version :', result.recordset[0].version.split('\n')[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ NTLM Failed:', err.message);
    process.exit(1);
  });
