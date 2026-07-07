// src/pages/StaffScreen.jsx
import { useState, useEffect } from 'react';
import { Plus, X, UserX, UserCheck, Pencil } from 'lucide-react';
import { listUsers, createStaffUser, updateUser, deactivateUser, reactivateUser, deleteUser, listHospitals } from '../api/admin';

const ROLES = ['dispatcher', 'driver', 'admin'];
const HOSPITAL_REQUIRED_ROLES = ['dispatcher', 'driver'];

export default function StaffScreen() {
  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone_number: '', email: '', password: '', role: 'dispatcher', hospital_id: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', hospital_id: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function refresh() {
    listUsers().then(setUsers).catch(console.error);
  }

  useEffect(() => {
    refresh();
    listHospitals().then(setHospitals).catch(console.error);
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const formNeedsHospital = HOSPITAL_REQUIRED_ROLES.includes(form.role);
  const editNeedsHospital = editingUser != null && HOSPITAL_REQUIRED_ROLES.includes(users.find((u) => u.user_id === editingUser)?.role);

  async function handleCreate(e) {
    e.preventDefault();
    if (formNeedsHospital && !form.hospital_id) {
      setError('A hospital is required for dispatcher and driver accounts');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createStaffUser({
        ...form,
        hospital_id: formNeedsHospital ? Number(form.hospital_id) : null
      });
      setShowForm(false);
      setForm({ full_name: '', phone_number: '', email: '', password: '', role: 'dispatcher', hospital_id: '' });
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create user');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(u) {
    setEditingUser(u.user_id);
    setEditForm({ full_name: u.full_name, email: u.email || '', hospital_id: u.hospital_id || '' });
    setError(null);
  }

  async function handleSaveEdit(userId) {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateUser(userId, {
        ...editForm,
        hospital_id: editForm.hospital_id ? Number(editForm.hospital_id) : null
      });
      setEditingUser(null);
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update user');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(userId) {
    await deactivateUser(userId);
    refresh();
  }

  async function handleReactivate(userId) {
    await reactivateUser(userId);
    refresh();
  }

  async function handleDelete(userId) {
    if (!window.confirm('Delete this staff account permanently?')) return;
    await deleteUser(userId);
    refresh();
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Staff accounts</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)', background: 'var(--color-accent)',
            color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 'var(--text-sm)'
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New staff account'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)',
          padding: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)'
        }}>
          <input placeholder="Full name" value={form.full_name} required onChange={(e) => update('full_name', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          <input placeholder="Phone number" value={form.phone_number} required onChange={(e) => update('phone_number', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => update('email', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          <input type="password" placeholder="Temporary password" value={form.password} required minLength={6} onChange={(e) => update('password', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          <select value={form.role} onChange={(e) => update('role', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {formNeedsHospital && (
            <select
              value={form.hospital_id}
              onChange={(e) => update('hospital_id', e.target.value)}
              required
              style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}
            >
              <option value="">Select hospital…</option>
              {hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gridColumn: formNeedsHospital ? 'auto' : '1 / -1' }}>
            <button type="submit" disabled={isSubmitting} style={{
              padding: 'var(--space-3) var(--space-5)', background: 'var(--color-success)',
              color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700
            }}>
              {isSubmitting ? 'Creating…' : 'Create account'}
            </button>
          </div>
          {hospitals.length === 0 && formNeedsHospital && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', gridColumn: '1 / -1' }}>
              No hospitals exist yet — add one from the Hospitals screen first.
            </p>
          )}
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', gridColumn: '1 / -1' }}>{error}</p>}
        </form>
      )}

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table>
          <thead>
            <tr style={{ background: 'var(--color-bg)' }}>
              {['Name', 'Phone', 'Role', 'Hospital', 'Status', ''].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const needsHospital = HOSPITAL_REQUIRED_ROLES.includes(u.role);
              return (
                <tr key={u.user_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                  {editingUser === u.user_id ? (
                    <>
                      <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                        <input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                          style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)' }}>{u.phone_number}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{u.role}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                        {needsHospital ? (
                          <select
                            value={editForm.hospital_id}
                            onChange={(e) => setEditForm((f) => ({ ...f, hospital_id: e.target.value }))}
                            style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', width: '100%' }}
                          >
                            <option value="">Select hospital…</option>
                            {hospitals.map((h) => <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>)}
                          </select>
                        ) : <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>—</span>}
                      </td>
                      <td colSpan={2} style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right' }}>
                        <button onClick={() => handleSaveEdit(u.user_id)} disabled={isSubmitting} style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 'var(--text-xs)', marginRight: 'var(--space-3)' }}>
                          Save
                        </button>
                        <button onClick={() => setEditingUser(null)} style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{u.full_name}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-soft)' }}>{u.phone_number}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>{u.role}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                        {needsHospital
                          ? (u.hospital_name || <span style={{ color: 'var(--color-danger)' }}>Unassigned</span>)
                          : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span style={{
                          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                          background: u.is_active ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                          color: u.is_active ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(u)} style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 600, marginRight: 'var(--space-3)' }}>
                          <Pencil size={14} /> Edit
                        </button>
                        {u.is_active ? (
                          <>
                            <button onClick={() => handleDeactivate(u.user_id)} style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 600, marginRight: 'var(--space-3)' }}>
                              <UserX size={14} /> Deactivate
                            </button>
                            <button onClick={() => handleDelete(u.user_id)} style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleReactivate(u.user_id)} style={{ color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 600, marginRight: 'var(--space-3)' }}>
                              <UserCheck size={14} /> Reactivate
                            </button>
                            <button onClick={() => handleDelete(u.user_id)} style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && editingUser === null && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>{error}</p>}
    </div>
  );
}
