'use client';

import { useState } from 'react';
import { apiFetch, API_URL, getToken } from '../../lib/api';

export default function ImportTab() {
  const [file, setFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Sélection d'un dossier entier (ex. "membres 1") : on y récupère le
  // fichier de données (xlsx/csv/txt) et toutes les photos, en un seul clic.
  const pickFolder = (fileList) => {
    const all = Array.from(fileList || []);
    const data = all.find((f) => /\.(xlsx|xls|csv|txt)$/i.test(f.name));
    const photos = all.filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
    setFile(data || null);
    setPhotoFiles(photos);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      photoFiles.forEach((p) => fd.append('photos', p));
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
          <li><code>orientation</code> — HETERO, HOMO, BI, CURIEUX, PANSEXUEL ou AUTRE</li>
          <li><code>seeking</code> — une ou plusieurs valeurs de la liste "gender" séparées par un point-virgule, ex. <code>HOMME;COUPLE_HOMME_FEMME</code></li>
          <li><code>city</code> — obligatoire</li>
          <li><code>bio</code> — optionnel</li>
          <li><code>sexRole</code> — optionnel : ACTIF, PASSIF ou VERSA</li>
          <li><code>available</code> — optionnel : true/false (disponible pour discuter maintenant)</li>
          <li><code>bodyType</code> — optionnel : ATHLETIQUE, SVELTE, MOYENNE, ENROBEE ou RONDE</li>
          <li><code>eyeColor</code> — optionnel : MARRON, BLEU, VERT, GRIS ou NOISETTE</li>
          <li><code>adCategory</code> — optionnel : EPHEMERE, ECHANGISME, PLURALISME, VOYEURISME ou GROUPE</li>
          <li><code>experienceLevel</code> — optionnel : DEBUTANT, AMATEUR, EXPERIMENTE ou EXPERT</li>
          <li><code>heightCm</code> / <code>weightKg</code> — optionnels, nombres entiers</li>
          <li><code>interests</code> — optionnel, centres d'intérêt libres séparés par des virgules</li>
          <li><code>practices</code> — optionnel, une ou plusieurs pratiques séparées par un point-virgule (voir la liste sur la page profil), ex. <code>ECHANGE_SOFT;TRIOLISME;LINGERIE</code></li>
          <li><code>photoPrefix</code> — optionnel, voir import des photos ci-dessous</li>
        </ul>
        <button className="btn-secondary text-sm" onClick={downloadTemplate}>Télécharger un modèle CSV</button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Import groupé des photos (jusqu'à 25 par membre)</h2>
        <p className="text-sm text-neutral-500">
          Un dossier (ex. « membres 1 ») contenant le fichier de données ET les photos. Chaque photo doit être nommée
          <code> {'{prefix}'}-photo1</code> à <code>{'{prefix}'}-photo25</code>
          (ex. <code>jeanne_d-photo1.jpg</code>), où <code>{'{prefix}'}</code> est la colonne <code>photoPrefix</code> de la ligne,
          ou à défaut le <code>pseudo</code> (accents, espaces et casse ignorés dans la comparaison). Les photos 1 à 5 vont dans la
          galerie publique, les photos 6 à 25 dans la galerie privée (mêmes quotas que sur un profil : 5 publiques / 20 privées) ;
          au-delà, les suivantes sont ignorées.
        </p>
        <label className="btn-secondary text-sm cursor-pointer inline-block">
          Choisir le dossier « membres »
          <input type="file" multiple webkitdirectory="" directory="" className="hidden"
            onChange={(e) => pickFolder(e.target.files)} />
        </label>
        {file && (
          <p className="text-xs text-neutral-500">
            Fichier de données : <strong>{file.name}</strong> · {photoFiles.length} photo(s) détectée(s) dans le dossier
          </p>
        )}
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <p className="text-sm text-neutral-500">
          Ou sélectionnez seulement le fichier de données (sans photos) :
        </p>
        <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={(e) => { setFile(e.target.files[0] || null); setPhotoFiles([]); }} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={!file || importing}>{importing ? 'Import en cours...' : 'Importer'}</button>
      </form>

      {result && (
        <div className="card space-y-3">
          <p className="text-sm text-green-600">{result.created} membre(s) créé(s){result.photosImported > 0 ? `, ${result.photosImported} photo(s) importée(s)` : ''}.</p>
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
