import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocket, disconnectSocket, API_KEY, BACKEND_URL } from './socket.js';
import { fetchDashboardSummary } from './api.js';
import {
  CDRatioCard,
  LiveTransactionsCard,
  BankPositionCard,
  CashPositionCard,
  LoggedInUsersCard,
  DayEndStatusCard,
} from './components/DashboardCards.jsx';
import { formatCurrency, formatNumber } from './components/utils.jsx';
import toast from 'react-hot-toast';

// ========================================================
// TanStack Query — Real Backend API (SQL Server via Node.js)
// Initial fetch, updates are handled by WebSocket
// ========================================================
function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    retry: 3,
    retryDelay: 3000,
    refetchOnWindowFocus: false, // Prevents unwanted refetches since socket is active
  });
}

// ========================================================
// Alert Banner Component
// ========================================================
function AlertBanners({ alerts, onDismiss }) {
  if (!alerts?.length) return null;
  const icons = { INFO: 'ℹ️', WARNING: '⚠️', SUCCESS: '✅', BIRTHDAY: '🎉', NOTICE: '📢' };

  return (
    <div className="alerts-container">
      {alerts.slice(0, 3).map((a) => (
        <div key={a.Dashboard_AlertConfiguration_AlertId} className={`alert-banner ${a.AlertType || 'INFO'}`}>
          <span className="alert-icon">{icons[a.AlertType] || 'ℹ️'}</span>
          <div className="alert-content">
            <div className="alert-title">{a.Title}</div>
            <div className="alert-msg">{a.Message}</div>
          </div>
          <button className="alert-close" onClick={() => onDismiss(a.Dashboard_AlertConfiguration_AlertId)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ========================================================
// Top Metric Cards
// ========================================================
function TopCards({ cards }) {
  const icons = {
    'Total Deposits':     '🏦',
    'Total Loans':        '💳',
    'Net Profit':         '📈',
    'Active Customers':   '👥',
    'Today Transactions': '⚡',
    'CD Ratio':           '📊',
    'Total Branches':     '🏢',
    'NPA %':              '⚠️',
    'Profit This Month':  '💰',
    'Pending Clearance':  '🕐',
  };
  const gradients = {
    'Total Deposits':     'linear-gradient(135deg,#1e40af,#3b82f6)',
    'Total Loans':        'linear-gradient(135deg,#5b21b6,#8b5cf6)',
    'Net Profit':         'linear-gradient(135deg,#065f46,#10b981)',
    'Active Customers':   'linear-gradient(135deg,#164e63,#06b6d4)',
    'Today Transactions': 'linear-gradient(135deg,#92400e,#f59e0b)',
    'CD Ratio':           'linear-gradient(135deg,#9b1c1c,#ef4444)',
    'Total Branches':     'linear-gradient(135deg,#1e3a5f,#2563eb)',
    'NPA %':              'linear-gradient(135deg,#7f1d1d,#dc2626)',
    'Profit This Month':  'linear-gradient(135deg,#14532d,#16a34a)',
    'Pending Clearance':  'linear-gradient(135deg,#78350f,#d97706)',
  };

  const formatValue = (card) => {
    if (card.DataType === 'CURRENCY') return formatCurrency(card.Value);
    if (card.DataType === 'PERCENTAGE' || card.DataType === 'PERCENT') {
       const cleanVal = String(card.Value).replace(/[^0-9.-]+/g, "");
       return `${parseFloat(cleanVal || 0).toFixed(2)}%`;
    }
    return formatNumber(card.Value);
  };

  return (
    <div className="top-cards-grid">
      {cards.map((card) => (
        <div key={card.TopCardsId} className="metric-card"
          style={{ '--card-accent': gradients[card.Particular] || 'var(--gradient-blue)' }}>
          <div className="metric-card-icon" style={{ background: gradients[card.Particular] || 'var(--gradient-blue)' }}>
            {icons[card.Particular] || '📊'}
          </div>
          <div className="metric-card-content">
            <div className="metric-card-label">{card.Particular}</div>
            <div className="metric-card-value">{formatValue(card)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========================================================
// Main App
// ========================================================
export default function App() {
  const [socketData, setSocketData]     = useState({});
  const [timestamps, setTimestamps]     = useState({});
  const [connected, setConnected]       = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);

  // ── Real backend data via TanStack Query (SQL Server → Node.js → React) ──
  const {
    data: apiData,
    isLoading: apiLoading,
    isError: apiError,
    error: apiErrorObj,
    dataUpdatedAt,
  } = useDashboardSummary();

  useEffect(() => {
    if (apiData) {
      console.log('📊 [TanStack] Dashboard API data:', apiData);
    }
  }, [apiData]);

  // ── STEP 3: WebSocket for real-time updates (overlays REST data) ──
  const updateSocketData = useCallback((newData, timestamp) => {
    setSocketData(prev => ({ ...prev, ...newData }));
    if (timestamp) {
      const ts = {};
      Object.keys(newData).forEach(k => ts[k] = timestamp);
      setTimestamps(prev => ({ ...prev, ...ts }));
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
      setShowConnectionBanner(true);
      setTimeout(() => setShowConnectionBanner(false), 3000);
      toast.success('Connected to live dashboard', { duration: 2000 });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      toast.error('Disconnected — reconnecting…', { duration: 4000 });
    });

    socket.on('dashboard:init', ({ data, timestamp }) => {
      console.log('🔌 [Socket] Initial data received:', data);
      updateSocketData(data, timestamp);
    });

    socket.on('dashboard:update', ({ data, timestamp }) => {
      console.log('🔄 [Socket] Live update received:', data);
      updateSocketData(data, timestamp);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [Socket] Connection error:', err.message);
    });

    return () => disconnectSocket();
  }, []);

  // ── Merge: socket data overlays API data (real-time wins) ──
  const dashboardData = { ...(apiData || {}), ...socketData };
  const lastUpdated = Object.values(timestamps)[0] || (dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null);

  const visibleAlerts = (dashboardData.alerts || []).filter(
    a => !dismissedAlerts.has(a.Dashboard_AlertConfiguration_AlertId)
  );

  // ── Loading state: only block UI on very first load, max 5 seconds ──
  const [loadingTimeout, setLoadingTimeout] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoadingTimeout(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const isFirstLoad = apiLoading && loadingTimeout && !apiData && !apiError && Object.keys(socketData).length === 0;

  if (isFirstLoad) {
    return (
      <div className="app-wrapper">
        <div className="loading-screen">
          <div className="spinner" />
          <div className="loading-text">Connecting to banking dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">🏛️</div>
          <div>
            <div className="header-title">Banking Dashboard</div>
            <div className="header-subtitle">Real-Time Operations Monitor</div>
          </div>
        </div>

        <div className="header-right">
          <div className="live-indicator">
            <span className={`live-dot ${connected ? '' : 'offline'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          {lastUpdated && (
            <div className="last-updated">
              Updated: {new Date(lastUpdated).toLocaleTimeString('en-IN')}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* API Error Banner */}
        {apiError && (
          <div className="error-screen" style={{ minHeight: 'auto', marginBottom: 20 }}>
            <div className="error-title">⚠️ API Error</div>
            <div className="error-msg">{apiErrorObj?.message || 'Failed to load data'}</div>
          </div>
        )}

        {/* Alert Banners */}
        <AlertBanners
          alerts={visibleAlerts}
          onDismiss={(id) => setDismissedAlerts(prev => new Set([...prev, id]))}
        />

        {/* Top KPI Cards (Max 6 shown in one line) */}
        {dashboardData.top_cards?.length > 0 && (
          <TopCards cards={dashboardData.top_cards.slice(0, 6)} />
        )}

        {/* Dashboard Sections */}
        <div className="dashboard-section">
          <div className="section-header">
            <span className="section-title">📊 Analytics & Monitoring</span>
            {apiLoading && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>↻ Refreshing...</span>}
          </div>

          <div className="dashboard-cards-grid">
            <CDRatioCard
              data={dashboardData.cd_ratio_analysis || []}
              timestamp={timestamps.cd_ratio_analysis}
            />
            <LiveTransactionsCard
              data={dashboardData.live_transactions || []}
              timestamp={timestamps.live_transactions}
            />
            <BankPositionCard
              data={dashboardData.bank_position || []}
              timestamp={timestamps.bank_position}
            />
            <CashPositionCard
              data={dashboardData.cash_position || []}
              timestamp={timestamps.cash_position}
            />
            <LoggedInUsersCard
              data={dashboardData.logged_in_users || []}
              timestamp={timestamps.logged_in_users}
            />
            <DayEndStatusCard
              data={dashboardData.day_end_status || []}
              timestamp={timestamps.day_end_status}
            />
          </div>
        </div>
      </main>

      {/* ── Connection Banner ── */}
      {showConnectionBanner && (
        <div className={`connection-banner ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '✅ Connected to live feed' : '🔌 Disconnected — reconnecting…'}
        </div>
      )}
    </div>
  );
}
