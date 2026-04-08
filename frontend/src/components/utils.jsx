import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export const formatCurrency = (val) => {
  if (val == null) return '₹0.00';
  const cleanVal = String(val).replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleanVal) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export const formatCreatedOn = (dt) => {
  console.log('📅 formatCreatedOn received:', dt, 'Type:', typeof dt);
  if (!dt) {
    console.warn('⚠️ No CreatedOn date provided');
    return '—';
  }
  try {
    // SQL Server format: "2026-04-08 15:01:02.380"
    // Replace space with T for ISO format: "2026-04-08T15:01:02.380"
    const isoString = String(dt).replace(' ', 'T');
    console.log('🔄 ISO formatted string:', isoString);
    
    const date = new Date(isoString);
    console.log('✅ Parsed date:', date);
    
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date after parsing:', dt);
      return '—';
    }
    
    // Use UTC time since the datetime from SQL doesn't have timezone info
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth())).toLocaleDateString('en-IN', { month: 'short' });
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    const formatted = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    console.log('📌 Formatted date:', formatted);
    return formatted;
  } catch (e) {
    console.error('❌ Error formatting date:', e.message, 'Input:', dt);
    return '—';
  }
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
