import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export const formatCurrency = (val) => {
  if (val == null) return '₹0.00';
  // Remove formatting characters like ?, ₹, commas, etc.
  const cleanVal = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleanVal) || 0;

  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(2)}`;
};

export const formatNumber = (val) => {
  if (val == null) return '0';
  const cleanVal = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleanVal) || 0;
  return num.toLocaleString('en-IN');
};

export const formatDateTime = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return '—'; }
};

export const formatTimeAgo = (dt) => {
  if (!dt) return '—';
  try { return formatDistanceToNow(new Date(dt), { addSuffix: true }); }
  catch { return '—'; }
};

export function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle">
      <button
        className={`view-btn ${view === 'table' ? 'active' : ''}`}
        onClick={() => onChange('table')}
      >
        <span>☰</span> Table
      </button>
      <button
        className={`view-btn ${view === 'chart' ? 'active' : ''}`}
        onClick={() => onChange('chart')}
      >
        <span>📊</span> Chart
      </button>
    </div>
  );
}

export function NoData() {
  return (
    <div className="no-data">
      <div className="no-data-icon">📭</div>
      <div className="no-data-text">No data available</div>
    </div>
  );
}

export function UpdatedBadge({ timestamp }) {
  return (
    <div className="updated-badge">
      <span className="updated-dot" />
      {timestamp ? formatDateTime(timestamp) : 'Live'}
    </div>
  );
}

export function Badge({ type, children }) {
  const classMap = {
    CREDIT: 'badge-green', DEBIT: 'badge-red', TRANSFER: 'badge-blue',
    SUCCESS: 'badge-green', WARNING: 'badge-amber', INFO: 'badge-blue',
    DANGER: 'badge-red', BIRTHDAY: 'badge-purple', NOTICE: 'badge-cyan',
    ADMIN: 'badge-purple', MANAGER: 'badge-blue', SUPERVISOR: 'badge-cyan',
    TELLER: 'badge-amber', OFFICER: 'badge-green', ACTIVE: 'badge-green',
    INACTIVE: 'badge-gray', DONE: 'badge-green', PENDING: 'badge-amber',
  };
  const cls = classMap[type?.toUpperCase()] || 'badge-gray';
  return <span className={`badge ${cls}`}>{children}</span>;
}
