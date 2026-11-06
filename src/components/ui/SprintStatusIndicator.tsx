import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Maximize2,
  X,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export interface SprintComponentProps {
  sprintId: Id<"sprints">;
  className?: string;
  style?: React.CSSProperties;
}

export interface SprintProgressBarProps extends SprintComponentProps {
  showLabel?: boolean;
  showDetails?: boolean;
  height?: number;
}

export interface SprintHealthBadgeProps extends SprintComponentProps {
  compact?: boolean;
  showIcon?: boolean;
}

export interface BurndownChartProps extends SprintComponentProps {
  width?: string | number;
  height?: number;
  onExpand?: () => void;
}

export interface TaskStatusSummaryProps extends SprintComponentProps {
  variant?: 'chips' | 'text';
}

export interface SprintCountdownProps extends SprintComponentProps {
  showIcon?: boolean;
}

/* =========================================================================
 * 1. SPRINT PROGRESS BAR
 * ========================================================================= */
export const SprintProgressBar: React.FC<SprintProgressBarProps> = ({
  sprintId,
  showLabel = true,
  showDetails = true,
  height = 8,
  style,
}) => {
  const sprint = useQuery(api.sprints.getSprintDetails, { sprintId });

  if (sprint === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', ...style }}>
        {showLabel && (
          <div className="skeleton-shimmer" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
        )}
        <div
          className="skeleton-shimmer"
          style={{ width: '100%', height: `${height}px`, borderRadius: '999px' }}
        />
      </div>
    );
  }

  if (!sprint) return null;

  const totalPoints = sprint.totalPoints || sprint.capacity || 0;
  const completedPoints = sprint.completedPoints || 0;
  const percentage = totalPoints > 0 ? Math.min(100, Math.round((completedPoints / totalPoints) * 100)) : 0;

  // Color code: Green if >= 80%, Yellow if 50-79%, Red if < 50%
  let fillColor = '#ef4444'; // Red (<50%)
  if (percentage >= 80) {
    fillColor = '#10b981'; // Green (>=80%)
  } else if (percentage >= 50) {
    fillColor = '#f59e0b'; // Yellow (50-79%)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        ...style,
      }}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Sprint progress: ${completedPoints} of ${totalPoints} story points completed (${percentage}%)`}
    >
      {showLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          {showDetails ? (
            <span style={{ color: 'var(--slate-600)', fontWeight: 600 }}>
              {completedPoints} / {totalPoints} pts
            </span>
          ) : (
            <span style={{ color: 'var(--slate-600)', fontWeight: 600 }}>Progress</span>
          )}
          <span style={{ fontWeight: 800, color: 'var(--slate-900)' }}>{percentage}%</span>
        </div>
      )}

      {/* Progress track */}
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          backgroundColor: 'var(--slate-200)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: fillColor,
            borderRadius: '999px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
};

/* =========================================================================
 * 2. SPRINT HEALTH BADGE
 * ========================================================================= */
export const SprintHealthBadge: React.FC<SprintHealthBadgeProps> = ({
  sprintId,
  compact = false,
  showIcon = true,
  style,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const sprint = useQuery(api.sprints.getSprintDetails, { sprintId });

  const health = useMemo(() => {
    if (!sprint) return null;

    const now = currentTime;
    const defaultDuration = 14 * 24 * 60 * 60 * 1000;
    const start = sprint.startDate || now - defaultDuration / 2;
    const end = sprint.endDate || start + defaultDuration;

    const totalDuration = Math.max(1, end - start);
    const elapsed = Math.max(0, Math.min(totalDuration, now - start));
    const timeProgress = Math.round((elapsed / totalDuration) * 100);

    const totalPoints = sprint.totalPoints || sprint.capacity || 0;
    const completedPoints = sprint.completedPoints || 0;
    const pointsProgress = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    const diff = pointsProgress - timeProgress;

    if (diff < -20 || (now > end && pointsProgress < 100)) {
      return {
        status: 'critical' as const,
        label: 'Critical',
        explanation: `Velocity is behind pace by ${Math.abs(diff)}%. High risk of sprint carryover.`,
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        icon: <AlertCircle size={compact ? 11 : 13} />,
      };
    }
    if (diff < -5) {
      return {
        status: 'at_risk' as const,
        label: 'At Risk',
        explanation: `Velocity is slightly behind pace by ${Math.abs(diff)}%. Review blockers to stay on track.`,
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        icon: <AlertTriangle size={compact ? 11 : 13} />,
      };
    }
    return {
      status: 'on_track' as const,
      label: 'On Track',
      explanation: 'Sprint velocity is pacing on or ahead of the ideal burndown schedule.',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      icon: <CheckCircle2 size={compact ? 11 : 13} />,
    };
  }, [sprint, compact, currentTime]);

  if (sprint === undefined) {
    return (
      <div
        className="skeleton-shimmer"
        style={{
          width: compact ? '60px' : '80px',
          height: compact ? '20px' : '24px',
          borderRadius: '999px',
          ...style,
        }}
      />
    );
  }

  if (!health) return null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: compact ? '1px 6px' : '3px 9px',
          borderRadius: '999px',
          backgroundColor: health.bg,
          color: health.color,
          border: `1px solid ${health.border}`,
          fontSize: compact ? '10px' : '11px',
          fontWeight: 700,
          cursor: 'help',
          userSelect: 'none',
        }}
        aria-label={`Sprint health: ${health.label}. ${health.explanation}`}
      >
        {showIcon && health.icon}
        <span>{health.label}</span>
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--slate-900)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '11px',
            lineHeight: 1.3,
            whiteSpace: 'normal',
            width: '180px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {health.explanation}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 3. BURNDOWN CHART (MINI + EXPANDABLE)
 * ========================================================================= */
export const BurndownChart: React.FC<BurndownChartProps> = ({
  sprintId,
  width = '100%',
  height = 140,
  onExpand,
  style,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{ day: number; points: number | null; ideal: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const burndown = useQuery(api.sprints.getSprintBurndown, { sprintId });

  if (burndown === undefined) {
    return (
      <div
        className="skeleton-shimmer"
        style={{
          width,
          height: `${height}px`,
          borderRadius: 'var(--radius-sm)',
          ...style,
        }}
      />
    );
  }

  if (!burndown || !burndown.timeline) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${height}px`,
          color: 'var(--slate-400)',
          fontSize: '12px',
          fontStyle: 'italic',
        }}
      >
        No burndown data available
      </div>
    );
  }

  const totalDays = Math.max(1, burndown.totalDays);
  const maxPoints = Math.max(1, burndown.totalStoryPoints || 10);
  const chartW = 340;
  const chartH = 95;
  const padL = 30;
  const padT = 16;

  const actualPoints = burndown.timeline.filter((t) => t.pointsRemaining !== null);
  const actualPolyline = actualPoints
    .map((pt) => {
      const x = padL + (pt.day / totalDays) * chartW;
      const y = padT + (1 - pt.pointsRemaining! / maxPoints) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const handleChartClick = () => {
    if (onExpand) {
      onExpand();
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'relative',
          width,
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
      >
        {/* Header / Expand trigger */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="var(--primary)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-900)' }}>
              Burndown ({burndown.pointsRemaining} pts left)
            </span>
          </div>

          <button
            type="button"
            onClick={handleChartClick}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: 'var(--slate-400)',
            }}
            title="Expand Burndown Chart"
            aria-label="Expand Burndown Chart"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* SVG Mini Chart */}
        <div style={{ width: '100%', height: `${height}px` }}>
          <svg viewBox="0 0 390 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Gridlines */}
            <line x1={padL} y1={padT} x2={padL + chartW} y2={padT} stroke="var(--slate-200)" strokeDasharray="3 3" />
            <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="var(--slate-300)" />

            {/* Ideal Line (gray dotted) */}
            <line
              x1={padL}
              y1={padT}
              x2={padL + chartW}
              y2={padT + chartH}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Actual Curve (blue solid) */}
            {actualPolyline && (
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={actualPolyline}
              />
            )}

            {/* Points & Hover targets */}
            {actualPoints.map((pt) => {
              const cx = padL + (pt.day / totalDays) * chartW;
              const cy = padT + (1 - pt.pointsRemaining! / maxPoints) * chartH;

              return (
                <g
                  key={pt.day}
                  onMouseEnter={() => setHoveredDay({ day: pt.day, points: pt.pointsRemaining, ideal: pt.idealPoints })}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={cx} cy={cy} r="4" fill="#2563eb" stroke="white" strokeWidth="1.5" />
                  <circle cx={cx} cy={cy} r="10" fill="transparent" />
                </g>
              );
            })}

            {/* Y-axis labels */}
            <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="var(--slate-400)">
              {maxPoints}
            </text>
            <text x={padL - 6} y={padT + chartH + 3} textAnchor="end" fontSize="10" fill="var(--slate-400)">
              0
            </text>

            {/* X-axis labels */}
            <text x={padL} y={padT + chartH + 16} textAnchor="start" fontSize="9" fill="var(--slate-400)">
              Day 0
            </text>
            <text x={padL + chartW} y={padT + chartH + 16} textAnchor="end" fontSize="9" fill="var(--slate-400)">
              Day {totalDays}
            </text>
          </svg>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredDay && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--slate-900)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Day {hoveredDay.day}: {hoveredDay.points ?? 0} pts remaining (Ideal: {hoveredDay.ideal} pts)
          </div>
        )}
      </div>

      {/* Expanded Modal if no custom onExpand provided */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              maxWidth: '640px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Full Burndown Chart
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                  {burndown.name} · {burndown.completedStoryPoints} of {burndown.totalStoryPoints} points completed
                </span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ width: '100%', height: '240px' }}>
              <svg viewBox="0 0 540 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <line x1="40" y1="20" x2="520" y2="20" stroke="var(--slate-200)" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="520" y2="100" stroke="var(--slate-200)" strokeDasharray="3 3" />
                <line x1="40" y1="180" x2="520" y2="180" stroke="var(--slate-300)" />

                <line x1="40" y1="20" x2="520" y2="180" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

                {actualPolyline && (
                  <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    points={actualPoints
                      .map((pt) => {
                        const x = 40 + (pt.day / totalDays) * 480;
                        const y = 20 + (1 - pt.pointsRemaining! / maxPoints) * 160;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                )}

                <text x="32" y="24" textAnchor="end" fontSize="11" fill="var(--slate-400)">{maxPoints}</text>
                <text x="32" y="184" textAnchor="end" fontSize="11" fill="var(--slate-400)">0</text>
                <text x="40" y="202" textAnchor="start" fontSize="11" fill="var(--slate-400)">Day 0</text>
                <text x="520" y="202" textAnchor="end" fontSize="11" fill="var(--slate-400)">Day {totalDays}</text>
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '2px', backgroundColor: '#94a3b8', borderTop: '2px dashed #94a3b8' }} />
                <span>Ideal Burndown</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '3px', backgroundColor: '#2563eb', borderRadius: '1px' }} />
                <span style={{ fontWeight: 600 }}>Actual Progress</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* =========================================================================
 * 4. TASK STATUS SUMMARY
 * ========================================================================= */
export const TaskStatusSummary: React.FC<TaskStatusSummaryProps> = ({
  sprintId,
  variant = 'chips',
  style,
}) => {
  const sprint = useQuery(api.sprints.getSprintDetails, { sprintId });

  if (sprint === undefined) {
    return (
      <div className="skeleton-shimmer" style={{ width: '180px', height: '22px', borderRadius: '4px', ...style }} />
    );
  }

  if (!sprint || !sprint.statusCounts) return null;

  const { todo = 0, in_progress = 0, in_review = 0, done = 0 } = sprint.statusCounts;
  const total = todo + in_progress + in_review + done;

  if (variant === 'text') {
    return (
      <span style={{ fontSize: '12px', color: 'var(--slate-600)', ...style }}>
        <strong>{total} tasks</strong>: {done} done, {in_progress} in progress, {todo} todo
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        ...style,
      }}
      aria-label={`${total} total tasks: ${done} done, ${in_progress} in progress, ${in_review} in review, ${todo} to do`}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#ecfdf5',
          color: '#059669',
          border: '1px solid #a7f3d0',
        }}
      >
        <CheckCircle2 size={11} />
        <span>Done: {done}</span>
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          border: '1px solid #bfdbfe',
        }}
      >
        <Clock size={11} />
        <span>In Progress: {in_progress}</span>
      </span>

      {in_review > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#f5f3ff',
            color: '#7c3aed',
            border: '1px solid #ddd6fe',
          }}
        >
          <span>Review: {in_review}</span>
        </span>
      )}

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--slate-100)',
          color: 'var(--slate-600)',
          border: '1px solid var(--slate-200)',
        }}
      >
        <span>○ Todo: {todo}</span>
      </span>
    </div>
  );
};

/* =========================================================================
 * 5. SPRINT COUNTDOWN
 * ========================================================================= */
export const SprintCountdown: React.FC<SprintCountdownProps> = ({
  sprintId,
  showIcon = true,
  style,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const sprint = useQuery(api.sprints.getSprintDetails, { sprintId });

  const countdown = useMemo(() => {
    if (!sprint) return null;

    const now = currentTime;
    const isClosed = sprint.status === 'closed';

    if (isClosed) {
      const end = sprint.endDate || sprint.updatedAt;
      const daysAgo = Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24)));
      return {
        text: daysAgo === 0 ? 'Sprint ended today' : `Sprint ended ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`,
        isUrgent: false,
        isClosed: true,
        exactDate: sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'N/A',
      };
    }

    if (!sprint.endDate) {
      return {
        text: 'No end date set',
        isUrgent: false,
        isClosed: false,
        exactDate: 'No end date scheduled',
      };
    }

    const diffDays = Math.ceil((sprint.endDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)}d`,
        isUrgent: true,
        isClosed: false,
        exactDate: `Target date was ${new Date(sprint.endDate).toLocaleDateString()}`,
      };
    }

    if (diffDays === 0) {
      return {
        text: 'Ends today!',
        isUrgent: true,
        isClosed: false,
        exactDate: `Ends today at midnight`,
      };
    }

    if (diffDays === 1) {
      return {
        text: '1 day left',
        isUrgent: true,
        isClosed: false,
        exactDate: `Ends tomorrow (${new Date(sprint.endDate).toLocaleDateString()})`,
      };
    }

    const isUrgent = diffDays <= 2;
    return {
      text: `${diffDays} days left`,
      isUrgent,
      isClosed: false,
      exactDate: `Target end date: ${new Date(sprint.endDate).toLocaleDateString()}`,
    };
  }, [sprint, currentTime]);

  if (sprint === undefined) {
    return (
      <div className="skeleton-shimmer" style={{ width: '80px', height: '18px', borderRadius: '4px', ...style }} />
    );
  }

  if (!countdown) return null;

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', ...style }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: countdown.isUrgent ? 800 : 600,
          color: countdown.isUrgent ? '#dc2626' : countdown.isClosed ? 'var(--slate-500)' : 'var(--slate-700)',
          cursor: 'pointer',
        }}
        aria-label={`${countdown.text}. ${countdown.exactDate}`}
      >
        {showIcon && (
          <Clock size={13} color={countdown.isUrgent ? '#dc2626' : 'var(--slate-400)'} />
        )}
        <span>{countdown.text}</span>
      </span>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--slate-900)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {countdown.exactDate}
        </div>
      )}
    </div>
  );
};
