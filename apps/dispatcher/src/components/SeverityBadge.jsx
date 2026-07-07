// src/components/SeverityBadge.jsx
const CONFIG = {
  critical: { color: 'var(--color-critical)', label: 'Critical' },
  urgent: { color: 'var(--color-urgent)', label: 'Urgent' },
  moderate: { color: 'var(--color-moderate)', label: 'Moderate' },
  unknown: { color: 'var(--color-unknown)', label: 'Unknown' }
};

export default function SeverityBadge({ severity }) {
  const cfg = CONFIG[severity] || CONFIG.unknown;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '999px',
      background: `${cfg.color}22`, color: cfg.color,
      fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}
