// src/pages/HospitalsScreen.jsx
import { useState, useEffect } from 'react';
import { Plus, X, Building2, Search, MapPin, CheckCircle2, Trash2 } from 'lucide-react';
import { listHospitals, createHospital, deleteHospital } from '../api/admin';
import { searchHospitalsByText } from '../api/places';

export default function HospitalsScreen() {
  const [hospitals, setHospitals] = useState([]);
  const [mode, setMode] = useState(null); // null | 'manual' | 'search'

  // Manual add form state
  const [form, setForm] = useState({ name: '', address: '', phone_number: '', latitude: '', longitude: '' });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/import state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [importedIds, setImportedIds] = useState(new Set());
  const [importingId, setImportingId] = useState(null);

  function refresh() {
    listHospitals().then(setHospitals).catch(console.error);
  }

  useEffect(refresh, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createHospital({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null
      });
      setMode(null);
      setForm({ name: '', address: '', phone_number: '', latitude: '', longitude: '' });
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create hospital');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const results = await searchHospitalsByText(query.trim());
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed — is GOOGLE_PLACES_API_KEY configured on the backend?');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleImport(place) {
    setImportingId(place.place_id);
    try {
      await createHospital({
        name: place.name,
        address: place.address,
        phone_number: place.phone_number,
        latitude: place.latitude,
        longitude: place.longitude
      });
      setImportedIds((prev) => new Set(prev).add(place.place_id));
      refresh();
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Could not import this hospital');
    } finally {
      setImportingId(null);
    }
  }

  async function handleDeleteHospital(hospitalId) {
    if (!window.confirm('Delete this hospital? This cannot be undone.')) return;
    await deleteHospital(hospitalId);
    refresh();
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>Hospitals</h1>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            onClick={() => setMode(mode === 'search' ? null : 'search')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)', background: mode === 'search' ? 'var(--color-danger)' : 'var(--color-surface)',
              color: mode === 'search' ? '#fff' : 'var(--color-accent)', border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 'var(--text-sm)'
            }}
          >
            {mode === 'search' ? <X size={16} /> : <Search size={16} />}
            {mode === 'search' ? 'Cancel' : 'Search real hospitals'}
          </button>
          <button
            onClick={() => setMode(mode === 'manual' ? null : 'manual')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)', background: 'var(--color-accent)',
              color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 'var(--text-sm)'
            }}
          >
            {mode === 'manual' ? <X size={16} /> : <Plus size={16} />}
            {mode === 'manual' ? 'Cancel' : 'Add manually'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginBottom: 'var(--space-5)' }}>
        "Search real hospitals" looks up actual hospitals via Google Places — use it once to
        populate this list, then manage capacity from the cards below. It's a one-time import
        tool, not something the live dispatch system depends on.
      </p>

      {mode === 'search' && (
        <div style={{
          padding: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "hospital Phnom Penh" or "Calmette Hospital"'
              style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}
            />
            <button type="submit" disabled={isSearching} style={{
              padding: 'var(--space-3) var(--space-5)', background: 'var(--color-accent)',
              color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700
            }}>
              {isSearching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{searchError}</p>}

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {searchResults.map((place) => {
                const isImported = importedIds.has(place.place_id);
                return (
                  <div key={place.place_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)'
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{place.name}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {place.address || 'No address available'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleImport(place)}
                      disabled={isImported || importingId === place.place_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                        padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                        background: isImported ? 'var(--color-success-soft)' : 'var(--color-success)',
                        color: isImported ? 'var(--color-success)' : '#fff',
                        fontSize: 'var(--text-xs)', fontWeight: 700
                      }}
                    >
                      {isImported ? <CheckCircle2 size={14} /> : null}
                      {isImported ? 'Added' : importingId === place.place_id ? 'Adding…' : 'Add to database'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleCreate} style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)',
          padding: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)'
        }}>
          <input placeholder="Hospital name" value={form.name} required onChange={(e) => update('name', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', gridColumn: '1 / -1' }} />
          <input placeholder="Address" value={form.address} onChange={(e) => update('address', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', gridColumn: '1 / -1' }} />
          <input placeholder="Phone number" value={form.phone_number} onChange={(e) => update('phone_number', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input placeholder="Latitude" value={form.latitude} onChange={(e) => update('latitude', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', flex: 1 }} />
            <input placeholder="Longitude" value={form.longitude} onChange={(e) => update('longitude', e.target.value)} style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', flex: 1 }} />
          </div>
          <button type="submit" disabled={isSubmitting} style={{
            gridColumn: '1 / -1', padding: 'var(--space-3)', background: 'var(--color-success)',
            color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700
          }}>
            {isSubmitting ? 'Saving…' : 'Save hospital'}
          </button>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', gridColumn: '1 / -1' }}>{error}</p>}
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
        {hospitals.map((h) => (
          <div key={h.hospital_id} style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Building2 size={16} color="var(--color-accent)" />
                <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{h.name}</p>
              </div>
              <button
                onClick={() => handleDeleteHospital(h.hospital_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-danger)', fontSize: 'var(--text-xs)', fontWeight: 700 }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-soft)' }}>{h.address}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-2)', textTransform: 'capitalize' }}>
              Capacity: {h.capacity_status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
