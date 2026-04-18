import React from 'react';

export default function StatCard({ value, label, className = '', valueStyle, trend = [], footer = '' }) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <h2 style={valueStyle}>{value}</h2>
      <p>{label}</p>
      {Array.isArray(trend) && trend.length > 0 ? (
        <div className="stat-trend" aria-hidden="true">
          {trend.map((item, index) => (
            <span key={`${label}-${index}`} style={{ height: `${Math.max(6, Math.min(26, item))}px` }} />
          ))}
        </div>
      ) : null}
      {footer ? <div className="stat-footer">{footer}</div> : null}
    </div>
  );
}
