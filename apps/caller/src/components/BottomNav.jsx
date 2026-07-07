// src/components/BottomNav.jsx
import { NavLink } from 'react-router-dom';
import { Siren, Clock } from 'lucide-react';

const items = [
  { to: '/', label: 'Emergency', icon: Siren },
  { to: '/history', label: 'History', icon: Clock }
];

export default function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--color-surface)',
      borderTop: '1px solid var(--color-line)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: 'var(--space-2) var(--space-2) max(var(--space-2), env(safe-area-inset-bottom))',
      zIndex: 50
    }}>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: 'var(--space-2) var(--space-4)',
            color: isActive ? 'var(--color-emergency)' : 'var(--color-ink-soft)',
            textDecoration: 'none',
            minWidth: 'var(--tap-min)'
          })}
        >
          <Icon size={22} strokeWidth={2.2} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
