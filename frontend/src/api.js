import axios from 'axios';

// ============================================================
// Axios instance — configured with base URL + API key header
// ============================================================
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const API_KEY     = import.meta.env.VITE_API_KEY      || 'Trust@2026#$XYZ';

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================================
// API Functions — used by TanStack Query hooks
// ============================================================

// ── Real backend: all dashboard data in one call ──
export const fetchDashboardSummary = async () => {
  console.log('📡 [TanStack] Calling dashboard summary API...');
  const { data } = await apiClient.get('/api/dashboard/summary');
  console.log('✅ [TanStack] Dashboard data received:', data);
  return data;
};

// ── Individual endpoints (for granular re-fetching) ──
export const fetchTopCards       = async () => (await apiClient.get('/api/dashboard/top-cards')).data;
export const fetchCDRatio        = async () => (await apiClient.get('/api/dashboard/cd-ratio')).data;
export const fetchLiveTransactions = async () => (await apiClient.get('/api/dashboard/live-transactions')).data;
export const fetchBankPosition   = async () => (await apiClient.get('/api/dashboard/bank-position')).data;
export const fetchCashPosition   = async () => (await apiClient.get('/api/dashboard/cash-position')).data;
export const fetchLoggedInUsers  = async () => (await apiClient.get('/api/dashboard/logged-in-users')).data;
export const fetchDayEndStatus   = async () => (await apiClient.get('/api/dashboard/day-end-status')).data;
export const fetchAlerts         = async () => (await apiClient.get('/api/dashboard/alerts')).data;
