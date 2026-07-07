// src/pages/RecordsScreen.jsx
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { getSystemRecords, getUnassignedCalls } from '../api/admin';

const STATUS_COLORS = {
  pending: 'var(--color-warning)',
  assigned: 'var(--color-accent)',
  en_route: 'var(--color-accent)',
  on_scene: 'var(--color-accent)',
  transporting: 'var(--color-warning)',
  completed: 'var(--color-success)',
  cancelled: 'var(--color-text-faint)'
};

const PAGE_SIZE = 25;

export default function RecordsScreen() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unassigned, setUnassigned] = useState([]);

  useEffect(() => {
    setIsLoading(true);
    getSystemRecords(PAGE_SIZE, page * PAGE_SIZE)
      .then((res) => {
        const safeRecords = Array.isArray(res?.data) ? res.data : [];
        const safeTotal = Number(res?.meta?.total || safeRecords.length || 0);
        setRecords(safeRecords);
        setTotal(safeTotal);
      })
      .catch((err) => {
        console.error(err);
        setRecords([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  }, [page]);

  useEffect(() => {
    getUnassignedCalls().then(setUnassigned).catch(console.error);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>System records</h1>
        <span style={{ color: 'var(--color-text-soft)', fontSize: 'var(--text-sm)' }}>{total} total calls</span>
      </div>

      {unassigned.length > 0 && (
        <div style={{
          display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
          padding: 'var(--space-4)', background: 'var(--color-danger-soft)',
          border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)'
        }}>
          <AlertTriangle size={18} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
              {unassigned.length} active call{unassigned.length > 1 ? 's' : ''} could not be routed to a hospital
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', marginTop: '2px' }}>
              No dispatcher will see these until a hospital with coordinates exists nearby. Check that your hospitals have latitude/longitude set.
            </p>
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {unassigned.map((c) => (
                <p key={c.call_id} style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>
                  {c.emergency_id} · {new Date(c.created_at).toLocaleString()}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && <p style={{ color: 'var(--color-text-faint)' }}>Loading…</p>}

      {!isLoading && records.length === 0 && (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--color-text-soft)' }}>No system records are available right now.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {records.map((r) => {
          const isExpanded = expandedId === r.call_id;
          return (
            <div key={r.call_id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : r.call_id)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Call #{r.call_id}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', textTransform: 'capitalize' }}>{r.emergency_type?.replace('_', ' ')}</span>
                  <span style={{
                    fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                    color: STATUS_COLORS[r.status], background: `${STATUS_COLORS[r.status]}1A`, textTransform: 'capitalize'
                  }}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {isExpanded ? <ChevronUp size={18} color="var(--color-text-faint)" /> : <ChevronDown size={18} color="var(--color-text-faint)" />}
              </button>

              {isExpanded && (
                <div style={{ padding: '0 var(--space-4) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)', margin: 'var(--space-3) 0' }}>
                    {r.caller_phone ? `Caller: ${r.caller_phone}` : 'Caller: anonymous'} {r.address_text && `· ${r.address_text}`}
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-3)' }}>
                    Routed to: {r.assigned_hospital_id ? `Hospital #${r.assigned_hospital_id}` : 'Not assigned'}
                  </p>
                  {r.description && <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{r.description}</p>}

                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>STATUS TIMELINE</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {r.timeline.map((t) => (
                      <div key={t.log_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{t.status.replace('_', ' ')}{t.note ? ` — ${t.note}` : ''}</span>
                        <span style={{ color: 'var(--color-text-faint)' }}>{new Date(t.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', opacity: page === 0 ? 0.4 : 1 }}>
          Previous
        </button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)', alignSelf: 'center' }}>Page {page + 1} of {totalPages}</span>
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
          Next
        </button>
      </div>
    </div>
  );
}
