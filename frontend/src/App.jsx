import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSocket, disconnectSocket, API_KEY, BACKEND_URL } from './socket.js';
import { fetchDashboardSummary, fetchConfigurations, fetchBankName } from './api.js';
import ConfigurationModal from './components/ConfigurationModal.jsx';
import {
  CDRatioCard,
  LiveTransactionsCard,
  BankPositionCard,
  CashPositionCard,
  LoggedInUsersCard,
  DayEndStatusCard,
} from './components/DashboardCards.jsx';
import { formatCurrency, formatNumber } from './components/utils.jsx';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { AlertModal, AlertBanners, triggerToast } from './components/AlertDisplay.jsx';

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

function useDashboardConfigs() {
  return useQuery({
    queryKey: ['dashboard-configs'],
    queryFn: fetchConfigurations,
    refetchOnWindowFocus: false,
  });
}

function useBankName() {
  return useQuery({
    queryKey: ['bank-name'],
    queryFn: fetchBankName,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

// ========================================================
// Alert Banner Component
// ========================================================
// Existing AlertBanners removed (moved to AlertDisplay.jsx)

// ========================================================
// Top Metric Cards — Draggable with localStorage
// ========================================================
function TopCards({ cards }) {
  const icons = {
    'Total Deposits': '🏦', 'Total Loans': '💳', 'Net Profit': '📈',
    'Active Customers': '👥', 'Today Transactions': '⚡', 'CD Ratio': '📊',
    'Total Branches': '🏢', 'NPA %': '⚠️', 'Profit This Month': '💰',
    'Pending Clearance': '🕐',
  };
  const gradients = {
    'Total Deposits': 'linear-gradient(135deg,#1e40af,#3b82f6)',
    'Total Loans': 'linear-gradient(135deg,#5b21b6,#8b5cf6)',
    'Net Profit': 'linear-gradient(135deg,#065f46,#10b981)',
    'Active Customers': 'linear-gradient(135deg,#164e63,#06b6d4)',
    'Today Transactions': 'linear-gradient(135deg,#92400e,#f59e0b)',
    'CD Ratio': 'linear-gradient(135deg,#9b1c1c,#ef4444)',
    'Total Branches': 'linear-gradient(135deg,#1e3a5f,#2563eb)',
    'NPA %': 'linear-gradient(135deg,#7f1d1d,#dc2626)',
    'Profit This Month': 'linear-gradient(135deg,#14532d,#16a34a)',
    'Pending Clearance': 'linear-gradient(135deg,#78350f,#d97706)',
  };

  const formatValue = (card) => {
    if (card.DataType === 'CURRENCY') return formatCurrency(card.Value);
    if (card.DataType === 'PERCENTAGE' || card.DataType === 'PERCENT') {
      const cleanVal = String(card.Value).replace(/[^0-9.-]+/g, "");
      return `${parseFloat(cleanVal || 0).toFixed(2)}%`;
    }
    return formatNumber(card.Value);
  };

  // Drag-and-drop order from localStorage
  const getOrder = () => {
    try {
      const saved = localStorage.getItem('topCardsOrder');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const [order, setOrder] = useState(() => getOrder());
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const orderedCards = (() => {
    if (!order) return cards;
    return order
      .map(id => cards.find(c => c.TopCardsId === id))
      .filter(Boolean)
      .concat(cards.filter(c => !order.includes(c.TopCardsId)));
  })();

  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e, idx) => { e.preventDefault(); setOverIdx(idx); };
  const onDragLeave = () => setOverIdx(null);
  const onDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }
    const newOrder = [...orderedCards];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    const ids = newOrder.map(c => c.TopCardsId);
    setOrder(ids);
    localStorage.setItem('topCardsOrder', JSON.stringify(ids));
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div className="top-cards-grid">
      {orderedCards.map((card, i) => (
        <div
          key={card.TopCardsId}
          className="metric-card"
          draggable
          onDragStart={e => onDragStart(e, i)}
          onDragOver={e => onDragOver(e, i)}
          onDragLeave={onDragLeave}
          onDrop={e => onDrop(e, i)}
          onDragEnd={onDragEnd}
          style={{
            '--card-accent': gradients[card.Particular] || 'var(--gradient-blue)',
            opacity: dragIdx === i ? 0.4 : 1,
            border: overIdx === i ? '2px dashed #3b82f6' : undefined,
            cursor: 'grab',
            transition: 'opacity 0.2s, border 0.2s',
          }}
        >
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

// Component mapping moved outside to keep state persistent
const cardComponents = {
  CDRatioCard: CDRatioCard,
  LiveTransactionsCard: LiveTransactionsCard,
  BankPositionCard: BankPositionCard,
  CashPositionCard: CashPositionCard,
  LoggedInUsersCard: LoggedInUsersCard,
  DayEndStatusCard: DayEndStatusCard,
};

// ========================================================
// Draggable Dashboard Grid — bottom cards reordering
// ========================================================
function DraggableDashboardGrid({ dashboardData, timestamps, apiConfigs }) {

  const defaultOrder = [
    { id: 'CDRatioCard', key: 'cd_ratio_analysis' },
    { id: 'LiveTransactionsCard', key: 'live_transactions' },
    { id: 'BankPositionCard', key: 'bank_position' },
    { id: 'CashPositionCard', key: 'cash_position' },
    { id: 'LoggedInUsersCard', key: 'logged_in_users' },
    { id: 'DayEndStatusCard', key: 'day_end_status' },
  ];

  const getSavedOrder = () => {
    try {
      const saved = localStorage.getItem('dashboardCardsOrder');
      return saved ? JSON.parse(saved) : defaultOrder;
    } catch {
      return defaultOrder;
    }
  };

  const [order, setOrder] = useState(getSavedOrder());
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, idx) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const onDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }

    const newOrder = [...order];
    const [movedItem] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, movedItem);

    setOrder(newOrder);
    localStorage.setItem('dashboardCardsOrder', JSON.stringify(newOrder));
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="dashboard-section">
      <div className="dashboard-cards-grid">
        {order.map((item, i) => {
          const Component = cardComponents[item.id];
          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStart(e, i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                opacity: dragIdx === i ? 0.4 : 1,
                border: overIdx === i ? '2px dashed #3b82f6' : 'none',
                borderRadius: '12px',
                cursor: 'grab',
                transition: 'all 0.2s ease',
              }}
            >
              <Component
                data={dashboardData[item.key] || []}
                timestamp={timestamps[item.key]}
                configs={apiConfigs || []}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================================
// Main App
// ========================================================
export default function App() {
  const { theme, setTheme } = useTheme();
  const [socketData, setSocketData] = useState({});
  const [timestamps, setTimestamps] = useState({});
  const [connected, setConnected] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [toastedAlerts, setToastedAlerts] = useState(new Set());
  const [activeModalAlert, setActiveModalAlert] = useState(null);

  // ── Real backend data via TanStack Query (SQL Server → Node.js → React) ──
  const {
    data: apiData,
    isLoading: apiLoading,
    isError: apiError,
    error: apiErrorObj,
    dataUpdatedAt,
  } = useDashboardSummary();

  const {
    data: apiConfigs,
    refetch: refetchConfigs
  } = useDashboardConfigs();

  const { data: bankNameData } = useBankName();
  const bankName = bankNameData?.name || 'Banking Dashboard';

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

  // ── Alert Handler (Toast & Modal) ──
  useEffect(() => {
    if (!visibleAlerts.length) return;

    visibleAlerts.forEach(alert => {
      // Handle Toasts
      if (alert.DisplayType === 'TOAST' && !toastedAlerts.has(alert.Dashboard_AlertConfiguration_AlertId)) {
        triggerToast(alert);
        setToastedAlerts(prev => new Set([...prev, alert.Dashboard_AlertConfiguration_AlertId]));
      }

      // Handle Modals (Pick the first one)
      if (alert.DisplayType === 'MODAL' && !activeModalAlert) {
        setActiveModalAlert(alert);
      }
    });
  }, [visibleAlerts, toastedAlerts, activeModalAlert]);

  const bannerAlerts = visibleAlerts.filter(a => a.DisplayType === 'BANNER');

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
            <div className="header-title">{bankName}</div>
            <div className="header-subtitle">Real-Time Operations Monitor</div>
          </div>
        </div>

        <div className="header-right">
          <div className="live-indicator">
            <span className={`live-dot ${connected ? '' : 'offline'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          <button
            onClick={() => setIsConfigOpen(true)}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            title="Configure Dashboard Settings"
          >
            ⚙️
          </button>

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
          alerts={bannerAlerts}
          onDismiss={(id) => setDismissedAlerts(prev => new Set([...prev, id]))}
        />

        {/* Top KPI Cards (Max 5 shown in one line) */}
        {dashboardData.top_cards?.length > 0 && (
          <TopCards cards={dashboardData.top_cards.slice(0, 5)} />
        )}

        {/* Dashboard Grid (Main Section) — exactly 2 rows of 3 */}
        <div className="dashboard-section" style={{ flex: 1, minHeight: 0 }}>
          <DraggableDashboardGrid dashboardData={dashboardData} timestamps={timestamps} apiConfigs={apiConfigs} />
        </div>
      </main>

      {/* ── Connection Banner ── */}
      {showConnectionBanner && (
        <div className={`connection-banner ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '✅ Connected to live feed' : '🔌 Disconnected — reconnecting…'}
        </div>
      )}

      {/* ── Alert Modal ── */}
      <AlertModal
        alert={activeModalAlert}
        onClose={() => {
          if (activeModalAlert) {
            setDismissedAlerts(prev => new Set([...prev, activeModalAlert.Dashboard_AlertConfiguration_AlertId]));
            setActiveModalAlert(null);
          }
        }}
      />

      {/* ── Configuration Modal ── */}
      <ConfigurationModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={() => refetchConfigs()}
      />

      {/* ── Toast Container ── */}
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}
