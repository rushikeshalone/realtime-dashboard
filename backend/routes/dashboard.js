const express = require('express');
const router = express.Router();
const { query, sql } = require('../db');
const { getCache, setCache } = require('../redis');

// Helper: get cached or fetch fresh
const cachedQuery = async (key, fetchFn, ttl = 15) => {
  const cached = await getCache(key);
  if (cached) return cached;
  const data = await fetchFn();
  await setCache(key, data, ttl);
  return data;
};

// GET /api/dashboard/summary — all data at once
router.get('/summary', async (req, res) => {
  try {
    const [topCards, cdRatio, liveTransactions, bankPosition, cashPosition, loggedInUsers, dayEndStatus, alerts] = await Promise.all([
      cachedQuery('dash:top_cards', async () => (await query('SELECT * FROM Dashboard_TopCards WHERE IsActive=1')).recordset),
      cachedQuery('dash:cd_ratio_analysis', async () => (await query('SELECT TOP 50 * FROM Dashboard_CDRatioAnalysis ORDER BY ReportDate DESC')).recordset),
      cachedQuery('dash:live_transactions', async () => (await query('SELECT TOP 100 * FROM Dashboard_LiveTransactions ORDER BY TransactionDate DESC')).recordset),
      cachedQuery('dash:bank_position', async () => (await query('SELECT TOP 50 * FROM Dashboard_BankPosition ORDER BY ReportDate DESC')).recordset),
      cachedQuery('dash:cash_position', async () => (await query('SELECT TOP 50 * FROM Dashboard_CashPosition ORDER BY ReportDate DESC')).recordset),
      cachedQuery('dash:logged_in_users', async () => (await query('SELECT * FROM Dashboard_LogedInUser ORDER BY LastLoginTime DESC')).recordset),
      cachedQuery('dash:day_end_status', async () => (await query('SELECT * FROM Dashboard_DayEndStatus ORDER BY OrgElementId')).recordset),
      cachedQuery('dash:alerts', async () => (await query("SELECT * FROM Dashboard_AlertConfiguration WHERE IsActive=1 AND (StartDate IS NULL OR StartDate<=CAST(GETDATE() AS DATE)) AND (EndDate IS NULL OR EndDate>=CAST(GETDATE() AS DATE)) ORDER BY Priority ASC")).recordset),
    ]);

    res.json({ topCards, cdRatio, liveTransactions, bankPosition, cashPosition, loggedInUsers, dayEndStatus, alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary', detail: err.message });
  }
});

// GET /api/dashboard/top-cards
router.get('/top-cards', async (req, res) => {
  try {
    const data = await cachedQuery('dash:top_cards', async () =>
      (await query('SELECT * FROM Dashboard_TopCards WHERE IsActive=1 ORDER BY TopCardsId')).recordset
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/cd-ratio
router.get('/cd-ratio', async (req, res) => {
  try {
    const data = await cachedQuery('dash:cd_ratio_analysis', async () =>
      (await query('SELECT TOP 50 * FROM Dashboard_CDRatioAnalysis ORDER BY ReportDate DESC')).recordset
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/live-transactions
router.get('/live-transactions', async (req, res) => {
  try {
    const data = await cachedQuery('dash:live_transactions', async () =>
      (await query('SELECT TOP 100 * FROM Dashboard_LiveTransactions ORDER BY TransactionDate DESC')).recordset, 5
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/bank-position
router.get('/bank-position', async (req, res) => {
  try {
    const data = await cachedQuery('dash:bank_position', async () =>
      (await query('SELECT TOP 50 * FROM Dashboard_BankPosition ORDER BY ReportDate DESC')).recordset
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/cash-position
router.get('/cash-position', async (req, res) => {
  try {
    const data = await cachedQuery('dash:cash_position', async () =>
      (await query('SELECT TOP 50 * FROM Dashboard_CashPosition ORDER BY ReportDate DESC')).recordset
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/logged-in-users
router.get('/logged-in-users', async (req, res) => {
  try {
    const data = await cachedQuery('dash:logged_in_users', async () =>
      (await query('SELECT * FROM Dashboard_LogedInUser ORDER BY LastLoginTime DESC')).recordset, 5
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/day-end-status
router.get('/day-end-status', async (req, res) => {
  try {
    const data = await cachedQuery('dash:day_end_status', async () =>
      (await query('SELECT * FROM Dashboard_DayEndStatus ORDER BY OrgElementId')).recordset
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', async (req, res) => {
  try {
    const data = await cachedQuery('dash:alerts', async () =>
      (await query("SELECT * FROM Dashboard_AlertConfiguration WHERE IsActive=1 AND (StartDate IS NULL OR StartDate<=CAST(GETDATE() AS DATE)) AND (EndDate IS NULL OR EndDate>=CAST(GETDATE() AS DATE)) ORDER BY Priority ASC")).recordset, 30
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/configurations
router.get('/configurations', async (req, res) => {
  try {
    const data = (await query('SELECT * FROM Dashboard_Configurations WHERE IsActive=1 ORDER BY Sequence')).recordset;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/health
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;
