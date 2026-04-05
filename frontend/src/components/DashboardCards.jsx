import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { ViewToggle, NoData, UpdatedBadge, formatCurrency, Badge } from './utils.jsx';
import { useRef, useEffect } from 'react';

// ============================================================
// Auto Scroll Container 
// ============================================================
function AutoScrollContainer({ children, scrollActive }) {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!scrollActive || isHovered) return;
    const el = scrollRef.current;
    if (!el) return;

    let direction = 1; // 1 for down, -1 for up
    let prevScrollTop = -1;

    let intervalId = setInterval(() => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += direction;
        
        if (direction === 1 && (el.scrollTop >= el.scrollHeight - el.clientHeight - 1 || el.scrollTop === prevScrollTop)) {
          direction = -1; // Reverse to scroll UP
        } else if (direction === -1 && (el.scrollTop <= 0 || el.scrollTop === prevScrollTop)) {
          direction = 1; // Reverse to scroll DOWN
        }
        
        prevScrollTop = el.scrollTop;
      }
    }, 40);

    return () => clearInterval(intervalId);
  }, [scrollActive, isHovered]);

  return (
    <div 
      className="card-body" 
      ref={scrollRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ scrollBehavior: 'auto' }}
    >
      {children}
    </div>
  );
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// Custom tooltip for recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#141929', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '3px 0' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ============================================================
// CDRatioCard
// ============================================================
export function CDRatioCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>📈</div>
          <div>
            <div className="card-title">CD Ratio Analysis</div>
            <div className="card-subtitle">Credit-Deposit ratio by branch</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Deposits</th>
                <th>Loans</th>
                <th>CD Ratio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.CDRatioAnalysisId}>
                  <td>{row.BranchName}</td>
                  <td className="num">{formatCurrency(row.Deposits)}</td>
                  <td className="num">{formatCurrency(row.Loans)}</td>
                  <td>
                    <span className={`badge ${parseFloat(row.CDRatio) >= 70 ? 'badge-green' : 'badge-amber'}`}>
                      {parseFloat(row.CDRatio).toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="BranchName" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v.split(' ')[0]} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Deposits" name="Deposits" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Loans" name="Loans" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}

// ============================================================
// LiveTransactionsCard
// ============================================================
export function LiveTransactionsCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  const chartData = data.slice(0, 15).map(r => ({
    name: r.CustomerName?.split(' ')[0] || 'N/A',
    Amount: parseFloat(r.TransactionAmount) || 0,
    type: r.TransactionType,
  }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#065f46,#10b981)' }}>💳</div>
          <div>
            <div className="card-title">Live Transactions</div>
            <div className="card-subtitle">Real-time transaction stream</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row) => (
                <tr key={row.LiveTransactionsId}>
                  <td>{row.CustomerName}</td>
                  <td className="dim">{row.BranchName}</td>
                  <td><Badge type={row.TransactionType}>{row.TransactionType}</Badge></td>
                  <td className="num">{formatCurrency(row.TransactionAmount)}</td>
                  <td className="dim" style={{ fontSize: 11 }}>
                    {new Date(row.TransactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Amount" name="Amount" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index}
                      fill={entry.type === 'CREDIT' ? '#10b981' : entry.type === 'DEBIT' ? '#ef4444' : '#3b82f6'}
                    />
                  ))}
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} transactions</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}

// ============================================================
// BankPositionCard
// ============================================================
export function BankPositionCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  const chartData = data.slice(0, 10).map(r => ({
    name: r.BranchName?.split(' ')[0] || 'N/A',
    Opening: parseFloat(r.OpeningBankPosition) || 0,
    Current: parseFloat(r.CurrentBankPosition) || 0,
    Assets: parseFloat(r.AssetPosition) || 0,
    Liabilities: parseFloat(r.LiabilityPosition) || 0,
  }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#5b21b6,#8b5cf6)' }}>🏦</div>
          <div>
            <div className="card-title">Bank Position</div>
            <div className="card-subtitle">Asset &amp; liability overview</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Account Head</th>
                <th>Opening</th>
                <th>Current</th>
                <th>Assets</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.BankPositionId}>
                  <td>{row.BranchName}</td>
                  <td className="dim">{row.AccountHeadName}</td>
                  <td className="num">{formatCurrency(row.OpeningBankPosition)}</td>
                  <td className="num" style={{ color: '#60a5fa' }}>{formatCurrency(row.CurrentBankPosition)}</td>
                  <td className="num" style={{ color: '#34d399' }}>{formatCurrency(row.AssetPosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Opening" name="Opening" fill="#64748b" radius={[4,4,0,0]} />
                <Bar dataKey="Current" name="Current" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Assets" name="Assets" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} records</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}

// ============================================================
// CashPositionCard
// ============================================================
export function CashPositionCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  const chartData = data.map(r => ({
    name: r.BranchName?.split(' ')[0] || 'N/A',
    Opening: parseFloat(r.OpeningCashPosition) || 0,
    Current: parseFloat(r.CurrentCashPosition) || 0,
    Deposits: parseFloat(r.DepositPosition) || 0,
    Withdrawals: parseFloat(r.WithdrawlPosition) || 0,
  }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#92400e,#f59e0b)' }}>💰</div>
          <div>
            <div className="card-title">Cash Position</div>
            <div className="card-subtitle">Branch-wise cash flow</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Opening</th>
                <th>Deposits</th>
                <th>Withdrawals</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.CashPositionId}>
                  <td>{row.BranchName}</td>
                  <td className="num">{formatCurrency(row.OpeningCashPosition)}</td>
                  <td className="num" style={{ color: '#34d399' }}>+{formatCurrency(row.DepositPosition)}</td>
                  <td className="num" style={{ color: '#f87171' }}>-{formatCurrency(row.WithdrawlPosition)}</td>
                  <td className="num" style={{ color: '#60a5fa', fontWeight: 600 }}>{formatCurrency(row.TotalCashPosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="Deposits" name="Deposits" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Withdrawals" name="Withdrawals" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="Current" name="Net Position" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}

// ============================================================
// LoggedInUsersCard
// ============================================================
export function LoggedInUsersCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  const activeCount = data.filter(u => u.IsActive === 1).length;
  const roleData = data.reduce((acc, u) => {
    const role = u.UserRole || 'OTHER';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(roleData).map(([role, count]) => ({ name: role, count }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#164e63,#06b6d4)' }}>👥</div>
          <div>
            <div className="card-title">Logged-in Users</div>
            <div className="card-subtitle">{activeCount}/{data.length} currently active</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Username</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.LogedInUserId}>
                  <td>
                    <div className="user-status">
                      <span className={`status-dot ${row.IsActive === 1 ? 'active' : 'inactive'}`} />
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{row.UserName}</td>
                  <td><Badge type={row.UserRole}>{row.UserRole}</Badge></td>
                  <td className="dim">{row.BranchName}</td>
                  <td className="dim" style={{ fontSize: 11 }}>
                    {new Date(row.LastLoginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Users" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} users</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}

// ============================================================
// DayEndStatusCard
// ============================================================
export function DayEndStatusCard({ data = [], timestamp }) {
  const [view, setView] = useState('table');

  const statusCount = data.reduce((acc, r) => {
    const done = r.DayEndDoneAt ? 'Completed' : 'Pending';
    acc[done] = (acc[done] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(statusCount).map(([s, c]) => ({ name: s, count: c }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'linear-gradient(135deg,#9b1c1c,#ef4444)' }}>🌙</div>
          <div>
            <div className="card-title">Day End Status</div>
            <div className="card-subtitle">EOD processing tracker</div>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <AutoScrollContainer scrollActive={view === 'table'}>
        {data.length === 0 ? <NoData /> : view === 'table' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Day End By</th>
                <th>Day End At</th>
                <th>Day Begin By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.Dashboard_DayEndStatusId}>
                  <td>{row.BranchName}</td>
                  <td className="dim">{row.DayEndDoneBy || '—'}</td>
                  <td className="dim" style={{ fontSize: 11 }}>
                    {row.DayEndDoneAt ? new Date(row.DayEndDoneAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="dim">{row.DayBeginBy || '—'}</td>
                  <td>
                    <Badge type={row.DayEndDoneAt ? 'DONE' : 'PENDING'}>
                      {row.DayEndDoneAt ? 'Done' : 'Pending'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Branches" radius={[4,4,0,0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'Completed' ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <UpdatedBadge timestamp={timestamp} />
      </div>
    </div>
  );
}
