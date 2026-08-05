'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../../lib/api';
import { GENDER_LABELS, ORIENTATION_LABELS, BODY_TYPE_LABELS, EYE_COLOR_LABELS } from '../../../lib/enums';
import { memberSinceLabel } from '../../../lib/format';
import { PRACTICE_LABELS } from '../../../lib/practices';

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
  const [accessStatus, setAccessStatus] = useState(null);
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
    apiFetch(`/api/photo-access/status/${id}`).then((d) => setAccessStatus(d.status)).catch(() => {});
  }, [id, user]);

  if (!user) return null;
  if (error) return <p className="text-red-600">{error}</p>;
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

  const requestAccess = async () => {
    await apiFetch(`/api/photo-access/request/${profile.id}`, { method: 'POST' });
    setAccessStatus('PENDING');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="grid sm:grid-cols-2 gap-2">
        {profile.photos.length > 0 ? profile.photos.map((p) => (
          <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-neutral-200">
            <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
          </div>
        )) : <p className="text-neutral-500">Pas de photo publique pour ce profil.</p>}
      </div>

      {profile.videos?.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {profile.videos.map((v) => (
            <video key={v.id} src={mediaUrl(v.url)} controls className="aspect-video w-full rounded-lg bg-black" />
          ))}
        </div>
      )}

      <PrivatePhotosSection profile={profile} accessStatus={accessStatus} onRequest={requestAccess} />

      <div>
        <h1 className="text-2xl font-bold">{profile.pseudo}, {profile.age ?? '—'}</h1>
        <p className="text-neutral-400">{profile.city} · {GENDER_LABELS[profile.gender]} · {ORIENTATION_LABELS[profile.orientation]}</p>

        <div className="flex flex-wrap gap-2 mt-2">
          {profile.available && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-300 rounded-full px-2.5 py-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Disponible maintenant
            </span>
          )}
          {profile.memberSinceDays != null && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{memberSinceLabel(profile.memberSinceDays)}</span>
          )}
          {profile.reputation?.responseRatePct != null && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">Taux de réponse : {profile.reputation.responseRatePct}%</span>
          )}
          {profile.reputation?.exemplary && (
            <span className="text-xs bg-brand-500 text-white rounded-full px-2.5 py-1">✓ Membre exemplaire</span>
          )}
          {profile.bodyType && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{BODY_TYPE_LABELS[profile.bodyType]}</span>
          )}
          {profile.eyeColor && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">Yeux {EYE_COLOR_LABELS[profile.eyeColor]}</span>
          )}
        </div>

        {profile.bio && <p className="mt-3 text-neutral-800 whitespace-pre-line">{profile.bio}</p>}

        {profile.practices?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.practices.map((key) => (
              <span key={key} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1">
                {PRACTICE_LABELS[key] || key}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button className="btn-primary" onClick={like}>J'aime</button>
        <button className="btn-secondary" onClick={() => setShowReport(true)}>Signaler</button>
        <button className="btn-secondary" onClick={block}>Bloquer</button>
      </div>

      {notice && <p className="text-sm text-green-600">{notice}</p>}

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

function PrivatePhotosSection({ profile, accessStatus, onRequest }) {
  if (profile.hasPrivateAccess) {
    if (!profile.privatePhotos?.length) return null;
    return (
      <div>
        <p className="text-xs text-neutral-500 mb-2">🔓 Photos privées</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {profile.privatePhotos.map((p) => (
            <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-neutral-200">
              <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile.privatePhotoCount) return null;

  return (
    <div className="card flex items-center justify-between">
      <span className="text-sm text-neutral-400">
        🔒 {profile.privatePhotoCount} photo{profile.privatePhotoCount > 1 ? 's' : ''} privée{profile.privatePhotoCount > 1 ? 's' : ''}
      </span>
      {accessStatus === 'PENDING' ? (
        <span className="text-xs text-neutral-500">Demande envoyée</span>
      ) : accessStatus === 'DENIED' ? (
        <span className="text-xs text-neutral-500">Accès refusé</span>
      ) : (
        <button className="btn-secondary text-sm" onClick={onRequest}>Demander l'accès</button>
      )}
    </div>
  );
}
