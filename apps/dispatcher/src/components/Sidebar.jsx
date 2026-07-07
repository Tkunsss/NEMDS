// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Truck, Users, LogOut, Siren } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Active calls', icon: LayoutGrid },
  { to: '/crew', label: 'Crew assignment', icon: Users },
  { to: '/fleet', label: 'Fleet status', icon: Truck }
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--color-panel)',
      borderRight: '1px solid var(--color-border)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-5) var(--space-3)'
    }}>
      <div style={{ padding: '0 var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Siren size={22} color="var(--color-critical)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)' }}>NCEMDS</span>
        </div>
        {user?.hospital_name && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: '4px', paddingLeft: '30px' }}>
            {user.hospital_name}
          </p>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-3)', borderRadius: 'var(--radius-sm)',
              color: isActive ? 'var(--color-text)' : 'var(--color-text-soft)',
              background: isActive ? 'var(--color-panel-raised)' : 'transparent',
              textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 600
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>
          {user?.full_name}
        </p>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
            padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-soft)', fontSize: 'var(--text-sm)', fontWeight: 600
          }}
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </aside>
  );
}
