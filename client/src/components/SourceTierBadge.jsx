/**
 * SourceTierBadge.jsx
 * 
 * Visual indicator cho source tier (Tier 1/2/3)
 * Hiển thị source, freshness, và đất link nếu có
 */

import React from 'react';
import { AlertCircle, Database, HardDrive } from 'lucide-react';
import './source-tier-badge.css';

const TIER_CONFIG = {
  1: {
    label: 'Cập nhật từ vbpl.vn',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.08)',
    icon: '🌐',
    description: 'Dữ liệu thời gian thực từ Brave Search',
  },
  2: {
    label: 'Từ cơ sở dữ liệu pháp lý',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    icon: '💾',
    description: 'Từ cơ sở dữ liệu PostgreSQL',
  },
  3: {
    label: 'Từ dữ liệu local',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.08)',
    icon: '⚠️',
    description: 'Từ UTS VLC (có thể chưa cập nhật)',
  },
};

/**
 * Compact badge (inline)
 */
export function SourceTierBadgeInline({ tier, size = 'sm' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[3];

  const sizeClass = {
    xs: 'stb-inline-xs',
    sm: 'stb-inline-sm',
    md: 'stb-inline-md',
  }[size];

  return (
    <span className={`stb-inline ${sizeClass}`} style={{ borderColor: config.color, color: config.color }}>
      {config.icon} {config.label}
    </span>
  );
}

/**
 * Full badge (block)
 */
export function SourceTierBadgeBlock({ tier, sourceUrl = null, showIcon = true }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[3];

  return (
    <div className="stb-block" style={{ backgroundColor: config.bgColor, borderColor: config.color }}>
      <div className="stb-block-head">
        <div className="stb-block-title">
          {showIcon && <span className="stb-icon">{config.icon}</span>}
          <span className="stb-label" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        {tier === 3 && <AlertCircle size={14} color={config.color} />}
      </div>
      <p className="stb-description">{config.description}</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="stb-link">
          Xem nguồn →
        </a>
      )}
    </div>
  );
}

/**
 * Tooltip badge (on hover)
 */
export function SourceTierBadgeWithTooltip({ tier, sourceUrl = null }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[3];
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div
      className="stb-tooltip-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`stb-tooltip-trigger tier-${tier}`} style={{ color: config.color }}>
        {config.icon}
      </span>

      {showTooltip && (
        <div className="stb-tooltip-content" style={{ borderColor: config.color }}>
          <div className="stb-tooltip-title">{config.label}</div>
          <div className="stb-tooltip-desc">{config.description}</div>
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="stb-tooltip-link">
              Xem nguồn →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default SourceTierBadgeInline;
