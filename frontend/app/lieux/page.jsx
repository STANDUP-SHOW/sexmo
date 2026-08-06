'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';
import { PLACE_TYPE_LABELS } from '../../lib/places';
import MapSearchBlock from '../../components/MapSearchBlock';
import { useSearchLocation } from '../../lib/useSearchLocation';

export default function LieuxPage() {
  const { user } = useAuth();
  const { city, radiusKm, setCity, setRadiusKm } = useSearchLocation();
  const [meta, setMeta] = useState({ departments: [], types: [] });
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [places, setPlaces] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    apiFetch('/api/places/meta').then(setMeta).catch(() => {});
  }, []);

  // La carte donne une ville + un rayon, mais les lieux sont référencés par
  // département (pas de coordonnées précises) : dès que la ville est
  // résolue, on présélectionne son département dans le filtre existant.
  const onMapResolved = (d) => {
    if (d.department) setDepartment(d.department);
  };

  const search = () => {
    const params = new URLSearchParams();
    if (department) params.set('department', department);
    if (type) params.set('type', type);
    apiFetch(`/api/places?${params.toString()}`).then((d) => setPlaces(d.places)).catch(() => {});
  };

  useEffect(search, [department, type]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lieux de rencontre</h1>
          <p className="text-sm text-neutral-500">Établissements référencés par les membres, par département.</p>
        </div>
        {user && <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}>Ajouter un lieu</button>}
      </div>

      <MapSearchBlock city={city} radiusKm={radiusKm} onCityChange={setCity} onRadiusChange={setRadiusKm} onResolved={onMapResolved} />

      <div className="flex flex-wrap gap-3">
        <select className="input w-44" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">Tous départements</option>
          {meta.departments.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
        </select>
        <select className="input w-44" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous types</option>
          {meta.types.map((t) => <option key={t} value={t}>{PLACE_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {places.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <p className="font-medium">{p.name}</p>
              <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{PLACE_TYPE_LABELS[p.type]}</span>
            </div>
            <p className="text-xs text-neutral-500">{p.city ? `${p.city} · ` : ''}Département {p.department}</p>
            {p.description && <p className="text-sm text-neutral-700 mt-1">{p.description}</p>}
          </div>
        ))}
        {places.length === 0 && <p className="text-sm text-neutral-500">Aucun lieu référencé pour ces critères.</p>}
      </div>

      {showAdd && <AddPlaceModal meta={meta} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); search(); }} />}
    </div>
  );
}

function AddPlaceModal({ meta, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(meta.types[0] || '');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { notice } = await apiFetch('/api/places', {
        method: 'POST',
        body: JSON.stringify({ name, type, department, city, description }),
      });
      setNotice(notice);
      setTimeout(onCreated, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
      <form onSubmit={submit} className="card max-w-md w-full space-y-3">
        <h3 className="font-semibold">Ajouter un lieu</h3>
        <input required className="input" placeholder="Nom de l'établissement" value={name} onChange={(e) => setName(e.target.value)} />
        <select required className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {meta.types.map((t) => <option key={t} value={t}>{PLACE_TYPE_LABELS[t]}</option>)}
        </select>
        <select required className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">Département</option>
          {meta.departments.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.name}</option>)}
        </select>
        <input className="input" placeholder="Ville (optionnel)" value={city} onChange={(e) => setCity(e.target.value)} />
        <textarea className="input" rows={3} maxLength={500} placeholder="Description (optionnel)"
          value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-green-600">{notice}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={saving || notice}>{saving ? 'Envoi...' : 'Envoyer'}</button>
        </div>
      </form>
    </div>
  );
}
