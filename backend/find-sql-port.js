/**
 * find-sql-port.js
 * Finds the actual SQL Server (sqlservr.exe) dynamic port
 * and tests connection. Run: node find-sql-port.js
 */
require('dotenv').config();
const sql = require('mssql');
const { execSync } = require('child_process');

const DB_HOST = process.env.DB_HOST || 'DESKTOP-40B0H7H';
const DB_NAME = process.env.DB_NAME || 'Rushi';

console.log('=================================================');
console.log('   SQL Server Port Finder & Connection Test');
console.log('=================================================');
console.log(`  Host:     ${DB_HOST}`);
console.log(`  Database: ${DB_NAME}`);
console.log('');

// Step 1: Find sqlservr.exe PID(s)
let sqlPids = [];
try {
  const tasklistOut = execSync('tasklist /fi "imagename eq sqlservr.exe" /fo csv /nh', { encoding: 'utf8' });
  const lines = tasklistOut.trim().split('\n').filter(l => l.includes('sqlservr'));
  sqlPids = lines.map(l => parseInt(l.split(',')[1]?.replace(/"/g, '').trim())).filter(Boolean);
  if (sqlPids.length > 0) {
    console.log(`✅ sqlservr.exe found! PIDs: ${sqlPids.join(', ')}`);
  } else {
    console.log('❌ sqlservr.exe is NOT running!');
    console.log('');
    console.log('   START SQL Server by running ONE of:');
    console.log('   1) Open "SQL Server Configuration Manager" → Start MSSQL$RUSHI');
    console.log('   2) Run as Admin: net start MSSQL$RUSHI');
    console.log('   3) Search "Services" in Start Menu → Find "SQL Server (RUSHI)" → Start');
    process.exit(1);
  }
} catch (e) {
  console.error('Error checking processes:', e.message);
  process.exit(1);
}

// Step 2: Find the port(s) sqlservr.exe is listening on
let listenPorts = [];
try {
  const netstatOut = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const lines = netstatOut.split('\n');
  for (const line of lines) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const addrPort = parts[1];
    const pid = parseInt(parts[4]);
    if (sqlPids.includes(pid)) {
      const port = parseInt(addrPort.split(':').pop());
      if (port > 1024 && !listenPorts.includes(port)) {
        listenPorts.push(port);
      }
    }
  }
  if (listenPorts.length > 0) {
    console.log(`✅ SQL Server listening on ports: ${listenPorts.join(', ')}`);
  } else {
    console.log('⚠️  No listening ports found for sqlservr.exe (might need admin rights for netstat)');
    listenPorts = [59403, 61453, 62552, 1433]; // fallback
    console.log(`   Using fallback ports: ${listenPorts.join(', ')}`);
  }
} catch (e) {
  console.warn('⚠️  netstat error:', e.message.split('\n')[0]);
  listenPorts = [59403, 61453, 62552, 1433];
}

// Step 3: Try connecting on each port
console.log('');
console.log('Testing connections...');

const tryPort = async (port) => {
  const cfg = {
    server: DB_HOST,
    database: DB_NAME,
    port,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: { max: 2, min: 0, idleTimeoutMillis: 5000 },
    connectionTimeout: 8000,
    requestTimeout: 10000,
  };
  try {
    const pool = await sql.connect(cfg);
    const res = await pool.request().query("SELECT DB_NAME() as db, @@SERVERNAME as srv");
    await pool.close();
    return { success: true, port, db: res.recordset[0].db, srv: res.recordset[0].srv };
  } catch (err) {
    return { success: false, port, error: err.message.split('\n')[0] };
  }
};

(async () => {
  let successPort = null;
  for (const port of listenPorts) {
    process.stdout.write(`   Port ${port}... `);
    const result = await tryPort(port);
    if (result.success) {
      console.log(`✅ SUCCESS! DB: ${result.db}, Server: ${result.srv}`);
      successPort = port;
      break;
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }

  console.log('');
  if (successPort) {
    console.log('=================================================');
    console.log(`🎯 Working port: ${successPort}`);
    console.log('');
    console.log('UPDATE your backend/.env:');
    console.log(`   DB_PORT=${successPort}`);
    console.log('');
    console.log('Then restart the backend: node server.js');
    console.log('=================================================');
  } else {
    console.log('=================================================');
    console.log('❌ Could not connect on any port!');
    console.log('');
    console.log('CHECKLIST:');
    console.log('  1. Is SQL Server (RUSHI instance) running?');
    console.log('     → Start Menu → Services → "SQL Server (RUSHI)" → Start');
    console.log('  2. Is Windows Firewall blocking? Try disabling temporarily.');
    console.log('  3. Open SQL Server Config Manager:');
    console.log('     → Check TCP/IP is enabled for RUSHI instance');
    console.log('     → Note the TCP Dynamic Port number');
    console.log('=================================================');
    process.exit(1);
  }
})();
