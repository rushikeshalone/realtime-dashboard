import React, { useState, useRef, useEffect } from 'react';
import C3Chart from './C3Chart.jsx';
import { ViewToggle, NoData, UpdatedBadge, formatCurrency, Badge, formatCreatedOn } from './utils.jsx';

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

    let direction = 1;
    let prevScrollTop = -1;

    let intervalId = setInterval(() => {
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTop += direction;
        if (direction === 1 && (el.scrollTop >= el.scrollHeight - el.clientHeight - 1 || el.scrollTop === prevScrollTop)) {
          direction = -1;
        } else if (direction === -1 && (el.scrollTop <= 0 || el.scrollTop === prevScrollTop)) {
          direction = 1;
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
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
// Helper: get active columns sorted by Sequence for a card
// ============================================================
function getActiveColumns(configs, cardName) {
  if (!configs || configs.length === 0) return null;
  return configs
    .filter(c => c.CardName === cardName && c.IsDisplay === 1)
    .sort((a, b) => a.Sequence - b.Sequence);
}

// Render a cell value with special formatting
function renderCell(col, row) {
  const val = row[col.ColumnName];
  // Date/Time columns
  if (col.ColumnName === 'TransactionDate' || col.ColumnName === 'LastLoginTime' || col.ColumnName === 'DayEndDoneAt' || col.ColumnName === 'DayBeginAt' || col.ColumnName === 'LastDayEndDate' || col.ColumnName === 'CurrentDate') {
    if (!val) return '—';
    return new Date(val).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  }
  // Currency columns
  if (['Deposits', 'Loans', 'OpeningCashPosition', 'CurrentCashPosition', 'DepositPosition', 'WithdrawlPosition', 'TotalCashPosition', 'OpeningBankPosition', 'CurrentBankPosition', 'LiabilityPosition', 'AssetPosition', 'TransactionAmount'].includes(col.ColumnName)) {
    return <span className="num">{formatCurrency(val)}</span>;
  }
  // CD Ratio
  if (col.ColumnName === 'CDRatio') {
    return (
      <span className={`badge ${parseFloat(val) >= 70 ? 'badge-green' : 'badge-amber'}`}>
        {parseFloat(val).toFixed(2)}%
      </span>
    );
  }
  // Transaction Type
  if (col.ColumnName === 'TransactionType') {
    return <Badge type={val}>{val}</Badge>;
  }
  // User Role
  if (col.ColumnName === 'UserRole') {
    return <Badge type={val}>{val}</Badge>;
  }
  // IsActive
  if (col.ColumnName === 'IsActive') {
    return (
      <div className="user-status">
        <span className={`status-dot ${val === 1 ? 'active' : 'inactive'}`} />
      </div>
    );
  }
  // Day End status (DayEndDoneBy / DayBeginBy)
  return val ?? '—';
}

// ============================================================
// Generic Dynamic Table
// ============================================================
function DynamicTable({ data, columns }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.ColumnName}>{col.DisplayName || col.ColumnName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {columns.map(col => (
              <td key={col.ColumnName}>{renderCell(col, row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================
// CDRatioCard
// ============================================================
export function CDRatioCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'CD Ratio Analysis');

  useEffect(() => {
    if (data.length > 0) {
      console.log('📊 CDRatioCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

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
          activeCols ? (
            <DynamicTable data={data} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Branch</th><th>Deposits</th><th>Loans</th><th>CD Ratio</th></tr></thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.CDRatioAnalysisId}>
                    <td>{row.BranchName}</td>
                    <td className="num">{formatCurrency(row.Deposits)}</td>
                    <td className="num">{formatCurrency(row.Loans)}</td>
                    <td><span className={`badge ${parseFloat(row.CDRatio) >= 70 ? 'badge-green' : 'badge-amber'}`}>{parseFloat(row.CDRatio).toFixed(2)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="spline"
              data={[
                ['Deposits', ...data.map(d => d.Deposits)],
                ['Loans', ...data.map(d => d.Loans)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: data.map(d => d.BranchName?.split(' ')[0]),
                    tick: {
                      rotate: 0,
                      multiline: false,
                    }
                  },
                  y: {
                    tick: {
                      format: v => formatCurrency(v).replace('₹', '')
                    }
                  }
                },
                color: {
                  pattern: ['#3b82f6', '#8b5cf6']
                },
                grid: {
                  y: { show: true }
                },
                legend: {
                  show: true
                }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}

// ============================================================
// LiveTransactionsCard
// ============================================================
export function LiveTransactionsCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'Live Transactions');

  useEffect(() => {
    if (data.length > 0) {
      console.log('💳 LiveTransactionsCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

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
          activeCols ? (
            <DynamicTable data={data.slice(0, 50)} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Branch</th><th>Type</th><th>Amount</th><th>Time</th></tr></thead>
              <tbody>
                {data.slice(0, 50).map((row) => (
                  <tr key={row.LiveTransactionsId}>
                    <td>{row.CustomerName}</td>
                    <td className="dim">{row.BranchName}</td>
                    <td><Badge type={row.TransactionType}>{row.TransactionType}</Badge></td>
                    <td className="num">{formatCurrency(row.TransactionAmount)}</td>
                    <td className="dim" style={{ fontSize: 11 }}>{new Date(row.TransactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="spline"
              data={[
                ['Amount', ...chartData.map(d => d.Amount)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: chartData.map(d => d.name),
                  },
                  y: {
                    tick: { format: v => formatCurrency(v).replace('₹', '') }
                  }
                },
                color: {
                  pattern: ['#10b981']
                },
                grid: { y: { show: true } }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} transactions</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}

// ============================================================
// BankPositionCard
// ============================================================
export function BankPositionCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'Bank Position');

  useEffect(() => {
    if (data.length > 0) {
      console.log('🏦 BankPositionCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

  const chartData = data.slice(0, 10).map(r => ({
    name: r.BranchName?.split(' ')[0] || 'N/A',
    Opening: parseFloat(r.OpeningBankPosition) || 0,
    Current: parseFloat(r.CurrentBankPosition) || 0,
    Assets: parseFloat(r.AssetPosition) || 0,
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
          activeCols ? (
            <DynamicTable data={data} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Branch</th><th>Account Head</th><th>Opening</th><th>Current</th><th>Assets</th></tr></thead>
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
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="area"
              data={[
                ['Opening', ...chartData.map(d => d.Opening)],
                ['Current', ...chartData.map(d => d.Current)],
                ['Assets', ...chartData.map(d => d.Assets)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: chartData.map(d => d.name),
                  },
                  y: {
                    tick: { format: v => formatCurrency(v).replace('₹', '') }
                  }
                },
                color: {
                  pattern: ['#64748b', '#3b82f6', '#10b981']
                },
                grid: { y: { show: true } }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} records</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}

// ============================================================
// CashPositionCard
// ============================================================
export function CashPositionCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'Cash Position');

  useEffect(() => {
    if (data.length > 0) {
      console.log('💰 CashPositionCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

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
          activeCols ? (
            <DynamicTable data={data} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Branch</th><th>Opening</th><th>Deposits</th><th>Withdrawals</th><th>Total</th></tr></thead>
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
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="area-spline"
              data={[
                ['Deposits', ...chartData.map(d => d.Deposits)],
                ['Withdrawals', ...chartData.map(d => d.Withdrawals)],
                ['Net Position', ...chartData.map(d => d.Current)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: chartData.map(d => d.name),
                  },
                  y: {
                    tick: { format: v => formatCurrency(v).replace('₹', '') }
                  }
                },
                color: {
                  pattern: ['#10b981', '#ef4444', '#3b82f6']
                },
                grid: { y: { show: true } }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}

// ============================================================
// LoggedInUsersCard
// ============================================================
export function LoggedInUsersCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'Logged In Users');

  useEffect(() => {
    if (data.length > 0) {
      console.log('👥 LoggedInUsersCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

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
          activeCols ? (
            <DynamicTable data={data} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Status</th><th>Username</th><th>Role</th><th>Branch</th><th>Last Login</th></tr></thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.LogedInUserId}>
                    <td><div className="user-status"><span className={`status-dot ${row.IsActive === 1 ? 'active' : 'inactive'}`} /></div></td>
                    <td style={{ fontWeight: 500 }}>{row.UserName}</td>
                    <td><Badge type={row.UserRole}>{row.UserRole}</Badge></td>
                    <td className="dim">{row.BranchName}</td>
                    <td className="dim" style={{ fontSize: 11 }}>{new Date(row.LastLoginTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="area-spline"
              data={[
                ['Users', ...chartData.map(d => d.count)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: chartData.map(d => d.name),
                  },
                  y: {
                    tick: {
                      format: v => Math.floor(v)
                    }
                  }
                },
                color: {
                  pattern: COLORS
                },
                grid: { y: { show: true } },
                legend: { show: true }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} users</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}

// ============================================================
// DayEndStatusCard
// ============================================================
export function DayEndStatusCard({ data = [], timestamp, configs = [] }) {
  const [view, setView] = useState('table');
  const activeCols = getActiveColumns(configs, 'Day End Status');

  useEffect(() => {
    if (data.length > 0) {
      console.log('🌙 DayEndStatusCard data:', data[0]);
      console.log('📅 CreatedOn field:', data[0].CreatedOn);
    }
  }, [data]);

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
          activeCols ? (
            <DynamicTable data={data} columns={activeCols} />
          ) : (
            <table className="data-table">
              <thead><tr><th>Branch</th><th>Day End By</th><th>Day End At</th><th>Day Begin By</th><th>Status</th></tr></thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.Dashboard_DayEndStatusId}>
                    <td>{row.BranchName}</td>
                    <td className="dim">{row.DayEndDoneBy || '—'}</td>
                    <td className="dim" style={{ fontSize: 11 }}>{row.DayEndDoneAt ? new Date(row.DayEndDoneAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="dim">{row.DayBeginBy || '—'}</td>
                    <td><Badge type={row.DayEndDoneAt ? 'DONE' : 'PENDING'}>{row.DayEndDoneAt ? 'Done' : 'Pending'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="chart-wrapper">
            <C3Chart
              type="area-spline"
              data={[
                ['Count', ...chartData.map(d => d.count)]
              ]}
              options={{
                axis: {
                  x: {
                    type: 'category',
                    categories: chartData.map(d => d.name),
                  },
                  y: {
                    tick: {
                      format: v => Math.floor(v)
                    }
                  }
                },
                color: {
                  pattern: ['#10b981', '#f59e0b']
                },
                grid: { y: { show: true } },
                legend: { show: true }
              }}
            />
          </div>
        )}
      </AutoScrollContainer>

      <div className="card-footer">
        <span className="card-count">{data.length} branches</span>
        <div className="created-on-date">{data.length > 0 && data[0].CreatedOn ? formatCreatedOn(data[0].CreatedOn) : '—'}</div>
      </div>
    </div>
  );
}
