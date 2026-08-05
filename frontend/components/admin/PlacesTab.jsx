'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { PLACE_TYPE_LABELS } from '../../lib/places';

export default function PlacesTab() {
  const [places, setPlaces] = useState([]);

  const load = () => {
    apiFetch('/api/admin/places/pending').then((d) => setPlaces(d.places)).catch(() => {});
  };

  useEffect(load, []);

  const moderate = async (id, status) => {
    await apiFetch(`/api/admin/places/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setPlaces((p) => p.filter((x) => x.id !== id));
  };

  const remove = async (id) => {
    await apiFetch(`/api/admin/places/${id}`, { method: 'DELETE' });
    setPlaces((p) => p.filter((x) => x.id !== id));
  };

  return (
    <section>
      <h2 className="font-semibold mb-3">Lieux à valider ({places.length})</h2>
      <div className="space-y-2">
        {places.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <p className="font-medium">{p.name}</p>
              <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{PLACE_TYPE_LABELS[p.type]}</span>
            </div>
            <p className="text-xs text-neutral-500">{p.city ? `${p.city} · ` : ''}Département {p.department} · {p.addedByUser.email}</p>
            {p.description && <p className="text-sm text-neutral-700 mt-1">{p.description}</p>}
            <div className="flex gap-2 mt-3">
              <button className="btn-primary text-xs" onClick={() => moderate(p.id, 'APPROVED')}>Valider</button>
              <button className="btn-secondary text-xs" onClick={() => moderate(p.id, 'REJECTED')}>Refuser</button>
              <button className="btn-secondary text-xs" onClick={() => remove(p.id)}>Supprimer</button>
            </div>
          </div>
        ))}
        {places.length === 0 && <p className="text-neutral-500 text-sm">Aucun lieu en attente.</p>}
      </div>
    </section>
  );
}
