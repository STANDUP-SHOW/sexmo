'use client';

import { useState } from 'react';
import { apiFetch, API_URL, getToken } from '../../lib/api';

export default function ImportTab() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetch('/api/admin/members/import', { method: 'POST', body: fd });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Fichier protégé par auth (token en query), pas un simple <a href>.
    const url = `${API_URL}/api/admin/members/import/template?token=${encodeURIComponent(getToken())}`;
    window.open(url, '_blank');
  };

  return (
    <section className="max-w-2xl space-y-6">
      <div className="card space-y-3">
        <h2 className="font-semibold">Import de membres en masse</h2>
        <p className="text-sm text-neutral-500">
          Fichier Excel (.xlsx), CSV ou TXT avec une ligne d'en-têtes, une ligne par membre. Colonnes attendues :
        </p>
        <ul className="text-xs text-neutral-500 list-disc list-inside space-y-0.5">
          <li><code>email</code> — obligatoire, unique</li>
          <li><code>password</code> — obligatoire, 8 caractères minimum</li>
          <li><code>pseudo</code> — obligatoire</li>
          <li><code>birthDate</code> — obligatoire, format AAAA-MM-JJ, le membre doit être majeur</li>
          <li><code>gender</code> — HOMME, FEMME, COUPLE_HOMME_FEMME, COUPLE_HOMME_HOMME, COUPLE_FEMME_FEMME, TRANS, NON_BINAIRE ou AUTRE</li>
          <li><code>orientation</code> — HETERO, HOMO, BI, CURIEUX ou AUTRE</li>
          <li><code>seeking</code> — une ou plusieurs valeurs de la liste "gender" séparées par un point-virgule, ex. <code>HOMME;COUPLE_HOMME_FEMME</code></li>
          <li><code>city</code> — obligatoire</li>
          <li><code>bio</code> — optionnel</li>
        </ul>
        <button className="btn-secondary text-sm" onClick={downloadTemplate}>Télécharger un modèle CSV</button>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => setFile(e.target.files[0] || null)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={!file || importing}>{importing ? 'Import en cours...' : 'Importer'}</button>
      </form>

      {result && (
        <div className="card space-y-3">
          <p className="text-sm text-green-600">{result.created} membre(s) créé(s).</p>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm text-red-600 mb-1">{result.errors.length} ligne(s) en erreur :</p>
              <div className="text-xs text-neutral-600 space-y-1 max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i}>Ligne {e.row} ({e.email}) : {e.reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
