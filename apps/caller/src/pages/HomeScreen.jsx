// src/pages/HomeScreen.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdInterval = useRef(null);

  const HOLD_DURATION_MS = 1200;

  function startHold() {
    setIsHolding(true);
    const startTime = Date.now();
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdInterval.current);
        navigate('/confirm-location');
      }
    }, 16);
  }

  function cancelHold() {
    setIsHolding(false);
    setHoldProgress(0);
    clearInterval(holdInterval.current);
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '90px' }}>
      <header style={{ padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
          Need medical help now?
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-soft)', marginTop: '4px' }}>
          No sign-up needed. Just hold the button below.
        </p>
      </header>

      {/* SOS hold-to-send button — the signature element */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6) var(--space-5)' }}>
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          aria-label="Hold to continue to emergency request"
          style={{
            position: 'relative',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'var(--color-emergency)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 800,
            letterSpacing: '0.03em',
            boxShadow: isHolding ? 'var(--shadow-raised)' : '0 8px 30px rgba(211,47,47,0.3)',
            transform: isHolding ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.1s ease',
            overflow: 'hidden',
            animation: isHolding ? 'none' : 'sos-pulse 2.2s ease-in-out infinite'
          }}
        >
          <svg width="220" height="220" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="110" cy="110" r="104" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
            <circle
              cx="110" cy="110" r="104" fill="none" stroke="#fff" strokeWidth="6"
              strokeDasharray={2 * Math.PI * 104}
              strokeDashoffset={2 * Math.PI * 104 * (1 - holdProgress / 100)}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <span style={{ position: 'relative', zIndex: 1 }}>
            {isHolding ? 'KEEP HOLDING' : 'HOLD FOR SOS'}
          </span>
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-ink-soft)', padding: '0 var(--space-6) var(--space-4)' }}>
        Press and hold for 1 second — you'll confirm your location next
      </p>

      <style>{`
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(211,47,47,0.3), 0 0 0 0 rgba(211,47,47,0.4); }
          50% { box-shadow: 0 8px 30px rgba(211,47,47,0.3), 0 0 0 18px rgba(211,47,47,0); }
        }
      `}</style>
    </div>
  );
}
