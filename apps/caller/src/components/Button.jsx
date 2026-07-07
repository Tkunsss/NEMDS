// src/components/Button.jsx
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  onClick,
  type = 'button',
  disabled = false,
  icon = null
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    transition: 'transform 0.08s ease, opacity 0.15s ease',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
    minHeight: 'var(--tap-min)'
  };

  const sizes = {
    sm: { padding: '0.5rem 1rem', fontSize: 'var(--text-sm)' },
    md: { padding: '0.875rem 1.5rem', fontSize: 'var(--text-base)' },
    lg: { padding: '1.125rem 2rem', fontSize: 'var(--text-lg)' }
  };

  const variants = {
    primary: { background: 'var(--color-emergency)', color: '#fff' },
    secondary: { background: 'var(--color-surface)', color: 'var(--color-ink)', border: '1.5px solid var(--color-line)' },
    ghost: { background: 'transparent', color: 'var(--color-ink-soft)' },
    success: { background: 'var(--color-success)', color: '#fff' }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon}
      {children}
    </button>
  );
}
