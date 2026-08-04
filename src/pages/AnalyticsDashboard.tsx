import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface AnalyticsRow {
  id: string;
  event: string;
  path: string;
  referrer: string;
  session_id: string;
  metadata: string | null;
  created_at: string;
}

type StatPeriod = '24h' | '7d' | '30d' | '90d';

const PERIODS: { key: StatPeriod; label: string }[] = [
  { key: '24h', label: 'Day' },
  { key: '7d', label: 'Week' },
  { key: '30d', label: 'Month' },
  { key: '90d', label: '3M' },
];

function fmtTime(ts: number) {
  const pref = localStorage.getItem('dl-time-format') || '12h';
  if (pref === '24h') return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatPeriod>('7d');
  const isAdmin = profile?.email === 'dukahub05@gmail.com';

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const now = new Date();
    let since: Date;
    if (period === '24h') { since = new Date(now); since.setHours(since.getHours() - 24); }
    else if (period === '7d') { since = new Date(now); since.setDate(since.getDate() - 7); }
    else if (period === '30d') { since = new Date(now); since.setDate(since.getDate() - 30); }
    else { since = new Date(now); since.setDate(since.getDate() - 90); }

    supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!error && data) setRows(data as AnalyticsRow[]);
        setLoading(false);
      });
  }, [period, isAdmin]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const pageViews = rows.filter(r => r.event === 'page_view').length;
    const uniqueSessions = new Set(rows.map(r => r.session_id)).size;
    const purchases = rows.filter(r => r.event === 'purchase');
    const totalRevenue = purchases.reduce((s, r) => {
      try {
        const meta = r.metadata ? JSON.parse(r.metadata) : {};
        return s + (Number(meta.value) || 0);
      } catch { return s; }
    }, 0);
    const addToCarts = rows.filter(r => r.event === 'add_to_cart').length;
    const conversionRate = pageViews > 0 ? ((purchases.length / pageViews) * 100).toFixed(1) : '0.0';

    // Top pages
    const pageCount = new Map<string, number>();
    rows.filter(r => r.event === 'page_view').forEach(r => {
      pageCount.set(r.path, (pageCount.get(r.path) || 0) + 1);
    });
    const topPages = Array.from(pageCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Top referrers
    const refCount = new Map<string, number>();
    rows.filter(r => r.referrer).forEach(r => {
      const host = (() => { try { return new URL(r.referrer).hostname; } catch { return r.referrer; } })();
      if (host && host !== window.location.hostname) {
        refCount.set(host, (refCount.get(host) || 0) + 1);
      }
    });
    const topReferrers = Array.from(refCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Events over time — buckets follow the selected period
    const dailyEvents: { date: string; count: number }[] = [];
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('en-KE', { weekday: 'short' });
    if (period === '24h') {
      // Hourly buckets for the last 24h
      const hourMap = new Map<string, number>();
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now); d.setHours(d.getHours() - i, 0, 0, 0);
        hourMap.set(d.getHours().toString(), 0);
      }
      rows.forEach(r => {
        const h = new Date(r.created_at).getHours().toString();
        if (hourMap.has(h)) hourMap.set(h, (hourMap.get(h) || 0) + 1);
      });
      dailyEvents.push(...Array.from(hourMap.entries()).map(([h, count]) => ({ date: `${h}:00`, count })));
    } else if (period === '90d') {
      // Weekly buckets (last 13 weeks)
      const weekMap = new Map<string, number>();
      for (let i = 12; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7);
        weekMap.set(fmt(d), 0);
      }
      rows.forEach(r => {
        const d = new Date(r.created_at);
        const diff = Math.floor((now.getTime() - d.getTime()) / (7 * 86400000));
        const key = fmt(new Date(now.getTime() - Math.min(diff, 12) * 7 * 86400000));
        if (weekMap.has(key)) weekMap.set(key, (weekMap.get(key) || 0) + 1);
      });
      dailyEvents.push(...Array.from(weekMap.entries()).map(([date, count]) => ({ date, count })));
    } else {
      // Daily buckets (7d / 30d)
      const days = period === '7d' ? 7 : 30;
      const dayMap = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dayMap.set(fmt(d), 0);
      }
      rows.forEach(r => {
        const d = new Date(r.created_at).toLocaleDateString('en-KE', { weekday: 'short' });
        if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + 1);
      });
      dailyEvents.push(...Array.from(dayMap.entries()).map(([date, count]) => ({ date, count })));
    }
    const maxDaily = Math.max(...dailyEvents.map(d => d.count), 1);

    return { pageViews, uniqueSessions, purchases: purchases.length, totalRevenue, addToCarts, conversionRate, topPages, topReferrers, dailyEvents, maxDaily };
  }, [rows, period]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <div className="card-v2 text-center py-12">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Admin only</h3>
          <p className="text-sm text-[var(--text-secondary)]">Analytics are available to the account owner only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Privacy-first · No personal data · Kenya DPA compliant</p>
        </div>
        <div className="segment-picker">
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className={period === p.key ? 'active' : ''}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-v2 text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">No data yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">Analytics events will appear here as users browse the app.</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="stat-v2 stat-v2-accent">
              <span className="stat-label-v2">Page Views</span>
              <span className="stat-value-v2">{stats.pageViews.toLocaleString()}</span>
              <span className="stat-desc-v2">{stats.uniqueSessions} unique sessions</span>
            </div>
            <div className="stat-v2">
              <span className="stat-label-v2">Purchases</span>
              <span className="stat-value-v2 text-[var(--color-success)]">{stats.purchases}</span>
              <span className="stat-desc-v2">{stats.conversionRate}% conversion</span>
            </div>
            <div className="stat-v2">
              <span className="stat-label-v2">Revenue Tracked</span>
              <span className="stat-value-v2 text-[var(--color-info)]">KES {stats.totalRevenue.toLocaleString()}</span>
              <span className="stat-desc-v2">from ecommerce events</span>
            </div>
            <div className="stat-v2">
              <span className="stat-label-v2">Add to Cart</span>
              <span className="stat-value-v2 text-[var(--color-warning)]">{stats.addToCarts}</span>
              <span className="stat-desc-v2">items added</span>
            </div>
            <div className="stat-v2">
              <span className="stat-label-v2">Total Events</span>
              <span className="stat-value-v2 text-[var(--color-success)]">{rows.length}</span>
              <span className="stat-desc-v2">{period} period</span>
            </div>
          </div>

          {/* Daily Events — minimalist line chart on dark grid */}
          {stats.dailyEvents.length > 0 && (
            <div className="card-v2 chart-grid-dark">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activity</h3>
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">events</span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyEvents} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} dy={6} />
                    <YAxis tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#1C1E22',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      }}
                      labelStyle={{ color: '#8E8E93', fontWeight: 600 }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#FF453A" strokeWidth={2.5} dot={{ r: 3, fill: '#FF453A', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#FF9500' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Pages & Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-v2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Pages</h3>
              <div className="space-y-1.5">
                {stats.topPages.map(([path, count]) => {
                  const maxCount = stats.topPages[0]?.[1] || 1;
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={path} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] flex-1 truncate font-mono">{path}</span>
                      <div className="flex-1 h-4 rounded-md bg-[var(--bg-surface2)] overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-300" style={{
                          width: `${pct}%`,
                          background: 'var(--gradient-brand)',
                          opacity: 0.6,
                        }} />
                      </div>
                      <span className="text-xs text-[var(--text-muted)] font-medium w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-v2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Referrers</h3>
              {stats.topReferrers.length > 0 ? (
                <div className="space-y-1.5">
                  {stats.topReferrers.map(([ref, count]) => {
                    const maxCount = stats.topReferrers[0]?.[1] || 1;
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={ref} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">{ref}</span>
                        <div className="flex-1 h-4 rounded-md bg-[var(--bg-surface2)] overflow-hidden">
                          <div className="h-full rounded-md transition-all duration-300" style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                            opacity: 0.6,
                          }} />
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-medium w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No external referrers yet</p>
              )}
            </div>
          </div>

          {/* Recent Events Table */}
          <div className="card-v2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Events</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)] text-xs uppercase tracking-wider">
                    <th className="text-left py-2 pr-2 font-semibold">Time</th>
                    <th className="text-left py-2 px-2 font-semibold">Event</th>
                    <th className="text-left py-2 px-2 font-semibold">Path</th>
                    <th className="text-left py-2 px-2 font-semibold">Referrer</th>
                    <th className="text-left py-2 pl-2 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-surface2)]/50 transition-colors">
                      <td className="py-2 pr-2 text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} {fmtTime(new Date(r.created_at).getTime())}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`badge-v2 text-[10px] ${
                          r.event === 'purchase' ? 'badge-v2-success' :
                          r.event === 'add_to_cart' ? 'badge-v2-warning' :
                          r.event === 'page_view' ? 'badge-v2-info' : ''
                        }`}>{r.event}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-[var(--text-secondary)] font-mono max-w-[120px] truncate">{r.path}</td>
                      <td className="py-2 px-2 text-xs text-[var(--text-muted)] max-w-[120px] truncate">
                        {r.referrer ? (() => { try { return new URL(r.referrer).hostname; } catch { return r.referrer; } })() : '—'}
                      </td>
                      <td className="py-2 pl-2 text-xs text-[var(--text-muted)] max-w-[150px] truncate">
                        {r.metadata ? (() => {
                          try {
                            const meta = JSON.parse(r.metadata);
                            if (r.event === 'purchase') return `KES ${meta.value?.toLocaleString() || ''}`;
                            if (r.event === 'add_to_cart') return meta.item_name || '';
                            return '';
                          } catch { return ''; }
                        })() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 30 && (
              <p className="text-xs text-[var(--text-muted)] text-center mt-3">Showing last 30 of {rows.length} events</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}