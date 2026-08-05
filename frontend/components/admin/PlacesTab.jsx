'use client';

import { useEffect, useState } from 'react';
import { apiFetch, API_URL, getToken } from '../../lib/api';
import { PLACE_TYPE_LABELS } from '../../lib/places';

export default function PlacesTab() {
  const [places, setPlaces] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

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

  const downloadTemplate = () => {
    const url = `${API_URL}/api/admin/places/import/template?token=${encodeURIComponent(getToken())}`;
    window.open(url, '_blank');
  };

  const submitImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const data = await apiFetch('/api/admin/places/import', { method: 'POST', body: fd });
      setImportResult(data);
      load();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="card space-y-3">
        <h2 className="font-semibold">Import de lieux en masse</h2>
        <p className="text-sm text-neutral-500">
          Fichier Excel (.xlsx), CSV ou TXT avec une ligne d'en-têtes, une ligne par lieu. Colonnes attendues :
        </p>
        <ul className="text-xs text-neutral-500 list-disc list-inside space-y-0.5">
          <li><code>name</code> — obligatoire</li>
          <li><code>type</code> — SAUNA, LOVE_SHOP, HAMMAM, BAR, CLUB_VIDEO ou CINEMA</li>
          <li><code>department</code> — obligatoire, code département</li>
          <li><code>city</code> — optionnel</li>
          <li><code>description</code> — optionnel</li>
        </ul>
        <button type="button" className="btn-secondary text-sm" onClick={downloadTemplate}>Télécharger un modèle CSV</button>
        <form onSubmit={submitImport} className="flex items-center gap-3 pt-2">
          <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => setImportFile(e.target.files[0] || null)} />
          <button className="btn-primary text-sm" disabled={!importFile || importing}>{importing ? 'Import...' : 'Importer'}</button>
        </form>
        {importError && <p className="text-sm text-red-600">{importError}</p>}
        {importResult && (
          <div className="space-y-2">
            <p className="text-sm text-green-600">{importResult.created} lieu(x) créé(s).</p>
            {importResult.errors.length > 0 && (
              <div className="text-xs text-neutral-600 space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors.map((e, i) => <p key={i}>Ligne {e.row} ({e.name}) : {e.reason}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

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
