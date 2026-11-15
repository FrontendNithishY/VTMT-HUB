'use client';
import { useEffect, useState } from 'react';
import { Users, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/hod/attendance/heatmap')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data);
          setDate(res.date || '');
          setIsToday(!!res.isToday);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Heatmap fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading today&apos;s class attendance matrix...
      </div>
    );
  }

  // Group by Year (I, II, III, IV)
  const years = ['I', 'II', 'III', 'IV'];

  const getColorByPercentage = (pct: number, hasRecords: boolean) => {
    if (!hasRecords) return { bg: 'rgba(100, 116, 139, 0.08)', text: 'var(--text-muted)', border: 'var(--border-subtle)', badge: 'No Records' };
    if (pct >= 85) return { bg: 'rgba(34, 197, 94, 0.12)', text: '#15803d', border: '#22c55e', badge: `${pct}% Present` };
    if (pct >= 75) return { bg: 'rgba(234, 179, 8, 0.12)', text: '#ca8a04', border: '#eab308', badge: `${pct}% Average` };
    return { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: '#ef4444', badge: `${pct}% Low` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Subheader info bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Calendar size={15} style={{ color: 'var(--royal-blue)' }} />
          <span>Showing Attendance Date: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{date || 'Today'}</strong> {isToday ? '(Today)' : '(Latest Roll Call)'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem' }}>
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

      {/* Grid of Year Columns & Class Section Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {years.map(yr => {
          const yearClasses = data.filter(d => d.year === yr);
          return (
            <div
              key={yr}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {/* Year Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  YEAR {yr}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                  {yearClasses.length} Section{yearClasses.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Sections under this year */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {yearClasses.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem', textAlign: 'center' }}>
                    No active sections
                  </div>
                ) : (
                  yearClasses.map(item => {
                    const theme = getColorByPercentage(item.percentage, item.hasRecords);
                    return (
                      <div
                        key={item.classId}
                        style={{
                          backgroundColor: theme.bg,
                          borderLeft: `4px solid ${theme.border}`,
                          borderRadius: '8px',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)' }}>
                            {item.classId}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              color: theme.text,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.6)'
                            }}
                          >
                            {theme.badge}
                          </span>
                        </div>

                        {/* Attendance Progress Bar */}
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0, 0, 0, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${item.hasRecords ? item.percentage : 0}%`,
                              height: '100%',
                              backgroundColor: theme.border,
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }}
                          ></div>
                        </div>

                        {/* Roll call counts */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Users size={12} /> Section {item.section}
                          </span>
                          <span>
                            {item.hasRecords ? (
                              <strong style={{ color: theme.text }}>
                                {item.presentCount} / {item.totalCount} Present
                              </strong>
                            ) : (
                              <span>Period 1 Pending</span>
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
        })}
      </div>
    </div>
  );
}
