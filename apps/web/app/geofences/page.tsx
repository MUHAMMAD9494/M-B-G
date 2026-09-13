'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  active: boolean;
}

const DEFAULT_LAT = 12.0022; // Kano
const DEFAULT_LNG = 8.592;

export default function GeofencesPage() {
  const { token } = useAuth();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('Main Campus');
  const [lat, setLat] = useState(DEFAULT_LAT.toString());
  const [lng, setLng] = useState(DEFAULT_LNG.toString());
  const [radius, setRadius] = useState('200');
  const [saving, setSaving] = useState(false);

  const loadGeofences = useCallback(() => {
    api
      .get<Geofence[]>('/geofences', token ?? undefined)
      .then((r) => setGeofences(Array.isArray(r) ? r : []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load geofences.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadGeofences();
  }, [loadGeofences]);

  async function createGeofence(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.post(
        '/geofences',
        {
          name: name.trim(),
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          radius: parseInt(radius, 10),
        },
        token ?? undefined,
      );
      setShowAdd(false);
      setSuccess(true);
      loadGeofences();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create geofence.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(g: Geofence) {
    setError(null);
    try {
      await api.patch(
        `/geofences/${g.id}`,
        { active: !g.active },
        token ?? undefined,
      );
      setGeofences((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Geofences</h1>
            <p className="text-sm text-stone-500">
              Define authorized attendance zones. Teachers must be inside an active geofence to check in.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            {showAdd ? 'Cancel' : 'Add Geofence'}
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}
        {success && (
          <p className="mb-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Geofence created.</p>
        )}

        {showAdd && (
          <form
            onSubmit={createGeofence}
            className="mb-6 rounded-2xl border border-accent/30 bg-accent-soft/30 p-6"
          >
            <h2 className="mb-4 text-base font-semibold text-stone-900">New Geofence</h2>
            <p className="mb-4 text-xs text-stone-500">
              Tip: Find your school coordinates at <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-accent underline">Google Maps</a> — right-click the location and copy the lat/lng.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-stone-600">
                Name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Radius (meters)
                <input
                  type="number"
                  required
                  min={10}
                  max={5000}
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Latitude
                <input
                  type="number"
                  required
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Longitude
                <input
                  type="number"
                  required
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create Geofence'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : geofences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No geofences configured. Add one to enable location-based check-in.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-surface text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Radius</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {geofences.map((g) => (
                  <tr key={g.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">{g.name}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{g.radius}m</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          g.active
                            ? 'bg-success-soft text-success'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {g.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(g)}
                        className="text-xs font-medium text-stone-500 hover:text-stone-700"
                      >
                        {g.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
