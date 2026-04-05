const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { getCache, setCache } = require('../redis');
const { CHANNELS, FETCHERS, fetchData } = require('../worker');

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
      cachedQuery('dash:top_cards', () => fetchData(CHANNELS.TOP_CARDS, FETCHERS[CHANNELS.TOP_CARDS])),
      cachedQuery('dash:cd_ratio_analysis', () => fetchData(CHANNELS.CD_RATIO, FETCHERS[CHANNELS.CD_RATIO])),
      cachedQuery('dash:live_transactions', () => fetchData(CHANNELS.LIVE_TRANSACTIONS, FETCHERS[CHANNELS.LIVE_TRANSACTIONS])),
      cachedQuery('dash:bank_position', () => fetchData(CHANNELS.BANK_POSITION, FETCHERS[CHANNELS.BANK_POSITION])),
      cachedQuery('dash:cash_position', () => fetchData(CHANNELS.CASH_POSITION, FETCHERS[CHANNELS.CASH_POSITION])),
      cachedQuery('dash:logged_in_users', () => fetchData(CHANNELS.LOGGED_IN_USERS, FETCHERS[CHANNELS.LOGGED_IN_USERS])),
      cachedQuery('dash:day_end_status', () => fetchData(CHANNELS.DAY_END_STATUS, FETCHERS[CHANNELS.DAY_END_STATUS])),
      cachedQuery('dash:alerts', () => fetchData(CHANNELS.ALERTS, FETCHERS[CHANNELS.ALERTS]))
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
    const data = await cachedQuery('dash:top_cards', () => fetchData(CHANNELS.TOP_CARDS, FETCHERS[CHANNELS.TOP_CARDS]));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/cd-ratio
router.get('/cd-ratio', async (req, res) => {
  try {
    const data = await cachedQuery('dash:cd_ratio_analysis', () => fetchData(CHANNELS.CD_RATIO, FETCHERS[CHANNELS.CD_RATIO]));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/live-transactions
router.get('/live-transactions', async (req, res) => {
  try {
    const data = await cachedQuery('dash:live_transactions', () => fetchData(CHANNELS.LIVE_TRANSACTIONS, FETCHERS[CHANNELS.LIVE_TRANSACTIONS]), 5);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/bank-position
router.get('/bank-position', async (req, res) => {
  try {
    const data = await cachedQuery('dash:bank_position', () => fetchData(CHANNELS.BANK_POSITION, FETCHERS[CHANNELS.BANK_POSITION]));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/cash-position
router.get('/cash-position', async (req, res) => {
  try {
    const data = await cachedQuery('dash:cash_position', () => fetchData(CHANNELS.CASH_POSITION, FETCHERS[CHANNELS.CASH_POSITION]));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/logged-in-users
router.get('/logged-in-users', async (req, res) => {
  try {
    const data = await cachedQuery('dash:logged_in_users', () => fetchData(CHANNELS.LOGGED_IN_USERS, FETCHERS[CHANNELS.LOGGED_IN_USERS]), 5);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/day-end-status
router.get('/day-end-status', async (req, res) => {
  try {
    const data = await cachedQuery('dash:day_end_status', () => fetchData(CHANNELS.DAY_END_STATUS, FETCHERS[CHANNELS.DAY_END_STATUS]));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', async (req, res) => {
  try {
    const data = await cachedQuery('dash:alerts', () => fetchData(CHANNELS.ALERTS, FETCHERS[CHANNELS.ALERTS]), 30);
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
