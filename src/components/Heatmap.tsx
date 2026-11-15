'use client';
import { useEffect, useState, useCallback } from 'react';
import { Users, Calendar, Clock, RefreshCw } from 'lucide-react';

interface ClassAttendanceItem {
  classId: string;
  year: string;
  department: string;
  section: string;
  percentage: number;
  presentCount: number;
  totalCount: number;
  hasRecords: boolean;
}

export default function Heatmap() {
  const [data, setData] = useState<ClassAttendanceItem[]>([]);
  const [date, setDate] = useState<string>('');
  const [isToday, setIsToday] = useState<boolean>(true);
  const [period, setPeriod] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchAttendance = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    try {
      const res = await fetch(`/api/hod/attendance/heatmap?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setDate(json.date || '');
        setIsToday(!!json.isToday);
        setPeriod(json.period || 1);
        setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Heatmap fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchAttendance();

    // Auto-refresh interval (polling every 15 seconds so uploaded attendance reflects automatically)
    const interval = setInterval(() => {
      fetchAttendance(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchAttendance]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Period 1 class attendance...
      </div>
    );
  }

  const getColorByPercentage = (pct: number, hasRecords: boolean) => {
    if (!hasRecords) return { bg: 'rgba(100, 116, 139, 0.08)', text: 'var(--text-muted)', border: 'var(--border-subtle)', badge: 'Period 1 Pending' };
    if (pct >= 85) return { bg: 'rgba(34, 197, 94, 0.12)', text: '#15803d', border: '#22c55e', badge: `${pct}% Present` };
    if (pct >= 75) return { bg: 'rgba(234, 179, 8, 0.12)', text: '#ca8a04', border: '#eab308', badge: `${pct}% Average` };
    return { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: '#ef4444', badge: `${pct}% Low` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Subheader info bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={15} style={{ color: 'var(--royal-blue)' }} />
            <span>Date: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{date || 'Today'}</strong> {isToday ? '(Today)' : '(Latest Available)'}</span>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--sky-blue)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700', fontSize: '0.78rem' }}>
            <Clock size={12} /> Period {period} Attendance Only
          </span>
          {lastUpdated && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={11} className={refreshing ? 'spin' : ''} style={{ color: refreshing ? 'var(--royal-blue)' : 'var(--text-muted)', transition: 'transform 0.5s' }} />
              Live Synced: {lastUpdated}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
          <button
            onClick={() => fetchAttendance(true)}
            disabled={refreshing}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: 'var(--text-main)'
            }}
          >
            <RefreshCw size={11} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Now'}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#15803d' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span> &gt;=85% High
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ca8a04' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eab308' }}></span> 75-84% Normal
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#dc2626' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> &lt;75% Low
          </span>
        </div>
      </div>

      {/* Grid of active class sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {data.length === 0 ? (
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>
            No active classes found for today.
          </div>
        ) : (
          data.map(item => {
            const theme = getColorByPercentage(item.percentage, item.hasRecords);
            return (
              <div
                key={item.classId}
                style={{
                  backgroundColor: theme.bg,
                  borderLeft: `5px solid ${theme.border}`,
                  borderRadius: '12px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: '1px solid var(--border-subtle)',
                  borderLeftWidth: '5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Year {item.year} • Dept of {item.department}
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0 0', fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-main)' }}>
                      {item.classId}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      color: theme.text,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.75)',
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    {theme.badge}
                  </span>
                </div>

                {/* Attendance Progress Bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0, 0, 0, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.hasRecords ? item.percentage : 0}%`,
                      height: '100%',
                      backgroundColor: theme.border,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }}
                  ></div>
                </div>

                {/* Roll call counts vs Total students in class */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                    <Users size={14} /> Section {item.section}
                  </span>
                  <span>
                    {item.hasRecords ? (
                      <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                        Students Came: <strong style={{ color: theme.text, fontSize: '0.95rem' }}>{item.presentCount}</strong> / Total: <strong style={{ fontSize: '0.95rem' }}>{item.totalCount}</strong>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Total: <strong>{item.totalCount}</strong> students (Roll call pending)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
