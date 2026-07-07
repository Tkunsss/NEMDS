// src/components/StatCard.jsx
export default function StatCard({ label, value, accentColor = 'var(--color-accent)' }) {
  return (
    <div style={{
      padding: 'var(--space-5)', background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)'
    }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
        {label}
      </p>
      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: accentColor }}>
        {value}
      </p>
    </div>
  );
}
