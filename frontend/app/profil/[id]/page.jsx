'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../../lib/api';
import { GENDER_LABELS, ORIENTATION_LABELS } from '../../../lib/enums';

const REPORT_REASONS = {
  FAUX_PROFIL: 'Faux profil',
  CONTENU_ILLEGAL: 'Contenu illégal',
  MINEUR_SUSPECTE: 'Mineur suspecté',
  SOLLICITATION_COMMERCIALE: 'Sollicitation commerciale',
  HARCELEMENT: 'Harcèlement',
  AUTRE: 'Autre',
};

export default function ProfileDetailPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('FAUX_PROFIL');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch(`/api/profiles/${id}`).then((d) => setProfile(d.profile)).catch((e) => setError(e.message));
  }, [id, user]);

  if (!user) return null;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!profile) return <p className="text-neutral-500">Chargement...</p>;

  const like = async () => {
    const res = await apiFetch(`/api/likes/${profile.id}`, { method: 'POST' });
    setNotice(res.matched ? "C'est un match ! Rendez-vous dans vos messages." : 'Profil aimé.');
  };

  const block = async () => {
    await apiFetch(`/api/reports/block/${profile.id}`, { method: 'POST' });
    setNotice('Profil bloqué.');
  };

  const submitReport = async () => {
    await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ targetProfileId: profile.id, reason: reportReason, details: reportDetails }),
    });
    setShowReport(false);
    setNotice('Signalement envoyé, merci.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="grid sm:grid-cols-2 gap-2">
        {profile.photos.length > 0 ? profile.photos.map((p) => (
          <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-neutral-800">
            <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
          </div>
        )) : <p className="text-neutral-500">Pas de photo pour ce profil.</p>}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{profile.pseudo}, {profile.age ?? '—'}</h1>
        <p className="text-neutral-400">{profile.city} · {GENDER_LABELS[profile.gender]} · {ORIENTATION_LABELS[profile.orientation]}</p>
        {profile.bio && <p className="mt-3 text-neutral-200 whitespace-pre-line">{profile.bio}</p>}
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" onClick={like}>J'aime</button>
        <button className="btn-secondary" onClick={() => setShowReport(true)}>Signaler</button>
        <button className="btn-secondary" onClick={block}>Bloquer</button>
      </div>

      {notice && <p className="text-sm text-green-400">{notice}</p>}

      {showReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
          <div className="card max-w-sm w-full space-y-3">
            <h2 className="font-semibold">Signaler ce profil</h2>
            <select className="input" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
              {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <textarea className="input" rows={3} placeholder="Détails (optionnel)"
              value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setShowReport(false)}>Annuler</button>
              <button className="btn-primary" onClick={submitReport}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
