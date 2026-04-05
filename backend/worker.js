const { query } = require('./db');
const { getCache, setCache, publish } = require('./redis');

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
      Deposits, Loans, CDRatio, ReportDate
    FROM Dashboard_CDRatioAnalysis
    ORDER BY ReportDate DESC
  `);
  return result.recordset;
};

const fetchLiveTransactions = async () => {
  const result = await query(`
    SELECT TOP 100
      LiveTransactionsId, OrgElementId, BranchName,
      CustomerName, TransactionType, TransactionAmount, TransactionDate
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
      LiabilityPosition, AssetPosition
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
      DepositPosition, WithdrawlPosition, TotalCashPosition
    FROM Dashboard_CashPosition
    ORDER BY ReportDate DESC
  `);
  return result.recordset;
};

const fetchLoggedInUsers = async () => {
  const result = await query(`
    SELECT
      LogedInUserId, UserName, UserRole,
      BranchName, LastLoginTime, IsActive
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
      DayBeginBy, DayBeginAt, CurrentDate
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
      const data = await pollAndPublish(channel, FETCHERS[channel]);
      if (data) results[channel] = data;
    })
  );
  return results;
};

// Fetch all data at once for initial load (cached)
const fetchAllCached = async () => {
  const results = {};
  await Promise.all(
    Object.entries(CHANNELS).map(async ([key, channel]) => {
      try {
        const data = await FETCHERS[channel]();
        results[channel] = data;
      } catch (err) {
        results[channel] = [];
      }
    })
  );
  return results;
};

module.exports = { pollAll, fetchAllCached, CHANNELS, FETCHERS };
