const { query } = require('./db');
const { getCache, setCache, publish } = require('./redis');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const xml2js = require('xml2js');

const getBasePath = () => {
  try {
    const p = path.join(__dirname, 'files', 'config', 'path.txt');
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      let content = lines.find(l => l.trim() && !l.trim().startsWith('#'))?.trim();
      if (content) {
        // Ensure UNC paths are normalized correctly for Windows
        content = path.win32.normalize(content);
        console.log(`📂 Resolved data base path: ${content}`);
        return content;
      }
    }
  } catch (err) {
    console.error('⚠️ Error reading custom path:', err.message);
  }
  return path.join(__dirname, 'files');
};

const readSourceConfig = () => {
  try {
    const p = path.join(__dirname, 'files', 'config', 'datasource.txt');
    const content = fs.readFileSync(p, 'utf8');
    const src = content.split('\n')[0].trim().toUpperCase();
    return ['SQL', 'JSON', 'CSV', 'XML', 'EXCEL'].includes(src) ? src : 'SQL';
  } catch (err) {
    return 'SQL';
  }
};

const fetchData = async (channel, sqlFetcher) => {
  const source = readSourceConfig();
  if (source === 'SQL') return await sqlFetcher();

  let basePath = getBasePath();
  // Use win32 explicitly and handle UNC prefix manually to avoid triple-backslash quirks
  const isUNC = basePath.startsWith('\\\\');
  let baseFile = path.win32.join(basePath, source.toLowerCase(), channel);

  if (isUNC && !baseFile.startsWith('\\\\')) {
    baseFile = '\\\\' + baseFile.replace(/^[\\\/]+/, '');
  }
  // Ensure we don't have triple slashes
  baseFile = baseFile.replace(/^\\\\\\+/, '\\\\');

  try {
    if (source === 'JSON') {
      const filePath = `${baseFile}.json`;
      console.log(`📄 Reading JSON: ${filePath}`);
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    else if (source === 'EXCEL') {
      const filePath = `${baseFile}.xlsx`;
      console.log(`📄 Reading EXCEL: ${filePath}`);
      const wb = xlsx.readFile(filePath);
      return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    else if (source === 'XML') {
      const filePath = `${baseFile}.xml`;
      console.log(`📄 Reading XML: ${filePath}`);
      const data = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(data);
      let rows = result?.Rows?.Row || [];
      if (!Array.isArray(rows)) rows = [rows];
      // Convert nested text objects back to shallow properties if needed
      return rows.map(r => {
        const nr = {};
        for (let k in r) nr[k] = typeof r[k] === 'object' && r[k]._ ? r[k]._ : r[k];
        return nr;
      });
    }
    else if (source === 'CSV') {
      const filePath = `${baseFile}.csv`;
      console.log(`📄 Reading CSV: ${filePath}`);
      return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (d) => results.push(d))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }
  } catch (err) {
    console.error(`⚠️ Error reading ${source} file for ${channel}:`, err.message);
  }
  return [];
};

// ============================================================
// QUERY FUNCTIONS — each returns latest data from SQL Server
// ============================================================

const fetchTopCards = async () => {
  const result = await query(`
    SELECT TopCardsId, Particular, Value, DataType, IsActive
    FROM Dashboard_TopCards
    WHERE IsActive = 1
    ORDER BY TopCardsId
  `);
  return result.recordset;
};

const fetchCDRatioAnalysis = async () => {
  const result = await query(`
    SELECT TOP 50
      CDRatioAnalysisId, OrgElementId, BranchName,
      Deposits, Loans, CDRatio, ReportDate,CreatedOn
    FROM Dashboard_CDRatioAnalysis
    ORDER BY ReportDate DESC
  `);
  return result.recordset;
};

const fetchLiveTransactions = async () => {
  const result = await query(`
    SELECT TOP 100
      LiveTransactionsId, OrgElementId, BranchName,
      CustomerName, TransactionType, TransactionAmount, TransactionDate,CreatedOn
    FROM Dashboard_LiveTransactions
    ORDER BY TransactionDate DESC
  `);
  return result.recordset;
};

const fetchBankPosition = async () => {
  const result = await query(`
    SELECT TOP 50
      BankPositionId, ReportDate, OrgElementId, BranchName,
      AccountHeadId, AccountHeadName,
      OpeningBankPosition, CurrentBankPosition,
      LiabilityPosition, AssetPosition,CreatedOn
    FROM Dashboard_BankPosition
    ORDER BY ReportDate DESC
  `);
  return result.recordset;
};

const fetchCashPosition = async () => {
  const result = await query(`
    SELECT TOP 50
      CashPositionId, ReportDate, OrgElementId, BranchName,
      OpeningCashPosition, CurrentCashPosition,
      DepositPosition, WithdrawlPosition, TotalCashPosition,CreatedOn
    FROM Dashboard_CashPosition
    ORDER BY ReportDate DESC
  `);
  return result.recordset;
};

const fetchLoggedInUsers = async () => {
  const result = await query(`
    SELECT
      LogedInUserId, UserName, UserRole,
      BranchName, LastLoginTime, IsActive,CreatedOn
    FROM Dashboard_LogedInUser
    ORDER BY LastLoginTime DESC
  `);
  return result.recordset;
};

const fetchDayEndStatus = async () => {
  const result = await query(`
    SELECT
      Dashboard_DayEndStatusId, OrgElementId, BranchName,
      LastDayEndDate, DayEndDoneBy, DayEndDoneAt,
      DayBeginBy, DayBeginAt, CurrentDate,CreatedOn
    FROM Dashboard_DayEndStatus
    ORDER BY OrgElementId
  `);
  return result.recordset;
};

const fetchAlerts = async () => {
  const result = await query(`
    SELECT
      Dashboard_AlertConfiguration_AlertId, Title, Message,
      AlertType, DisplayType, StartDate, EndDate,
      StartTime, EndTime, RepeatType,
      TargetUserId, TargetRole, IsActive, Priority, CreatedOn
    FROM Dashboard_AlertConfiguration
    WHERE IsActive = 1
      AND (StartDate IS NULL OR StartDate <= CAST(GETDATE() AS DATE))
      AND (EndDate IS NULL OR EndDate >= CAST(GETDATE() AS DATE))
    ORDER BY Priority ASC, CreatedOn DESC
  `);
  return result.recordset;
};

// ============================================================
// WORKER — polls DB and publishes changes via Redis/Socket
// ============================================================

// Store last hash per channel for change detection
const lastDataHash = {};

const simpleHash = (obj) => {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const pollAndPublish = async (channel, fetchFn, ttl = 10) => {
  try {
    const cacheKey = `dash:${channel}`;

    // Always fetch fresh from DB
    const data = await fetchFn();
    const hash = simpleHash(data);

    // Only publish if data changed
    if (lastDataHash[channel] !== hash) {
      lastDataHash[channel] = hash;
      await setCache(cacheKey, data, ttl);
      await publish(channel, { channel, data, timestamp: new Date().toISOString() });
      console.log(`📡 [${channel}] data changed — broadcasting`);
    }

    return data;
  } catch (err) {
    console.error(`❌ Worker error [${channel}]:`, err.message);
    return null;
  }
};

// ============================================================
// AGGREGATED POLLER — used by server to push to socket clients
// ============================================================

const CHANNELS = {
  TOP_CARDS: 'top_cards',
  CD_RATIO: 'cd_ratio_analysis',
  LIVE_TRANSACTIONS: 'live_transactions',
  BANK_POSITION: 'bank_position',
  CASH_POSITION: 'cash_position',
  LOGGED_IN_USERS: 'logged_in_users',
  DAY_END_STATUS: 'day_end_status',
  ALERTS: 'alerts',
};

const FETCHERS = {
  [CHANNELS.TOP_CARDS]: fetchTopCards,
  [CHANNELS.CD_RATIO]: fetchCDRatioAnalysis,
  [CHANNELS.LIVE_TRANSACTIONS]: fetchLiveTransactions,
  [CHANNELS.BANK_POSITION]: fetchBankPosition,
  [CHANNELS.CASH_POSITION]: fetchCashPosition,
  [CHANNELS.LOGGED_IN_USERS]: fetchLoggedInUsers,
  [CHANNELS.DAY_END_STATUS]: fetchDayEndStatus,
  [CHANNELS.ALERTS]: fetchAlerts,
};

const pollAll = async () => {
  const results = {};
  await Promise.all(
    Object.entries(CHANNELS).map(async ([key, channel]) => {
      const data = await pollAndPublish(channel, () => fetchData(channel, FETCHERS[channel]));
      if (data) results[channel] = data;
    })
  );
  return results;
};

const fetchAllCached = async () => {
  const results = {};
  await Promise.all(
    Object.entries(CHANNELS).map(async ([key, channel]) => {
      try {
        const data = await fetchData(channel, FETCHERS[channel]);
        results[channel] = data;
      } catch (err) {
        results[channel] = [];
      }
    })
  );
  return results;
};

module.exports = { pollAll, fetchAllCached, CHANNELS, FETCHERS, fetchData };
