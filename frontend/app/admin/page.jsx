'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';

const REPORT_REASON_LABELS = {
  FAUX_PROFIL: 'Faux profil',
  CONTENU_ILLEGAL: 'Contenu illégal',
  MINEUR_SUSPECTE: 'Mineur suspecté',
  SOLLICITATION_COMMERCIALE: 'Sollicitation commerciale',
  HARCELEMENT: 'Harcèlement',
  AUTRE: 'Autre',
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.push('/');
  }, [loading, user, router]);

  const load = () => {
    apiFetch('/api/admin/stats').then(setStats).catch(() => {});
    apiFetch('/api/admin/photos/pending').then((d) => setPendingPhotos(d.photos)).catch(() => {});
    apiFetch('/api/admin/reports?status=PENDING').then((d) => setReports(d.reports)).catch(() => {});
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  const moderatePhoto = async (id, status) => {
    await apiFetch(`/api/admin/photos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setPendingPhotos((p) => p.filter((ph) => ph.id !== id));
  };

  const reviewReport = async (id, status, banTarget = false) => {
    await apiFetch(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status, banTarget }) });
    setReports((r) => r.filter((rep) => rep.id !== id));
  };

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Modération</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card text-center"><p className="text-2xl font-bold">{stats.users}</p><p className="text-xs text-neutral-500">Comptes</p></div>
          <div className="card text-center"><p className="text-2xl font-bold">{stats.profiles}</p><p className="text-xs text-neutral-500">Profils</p></div>
          <div className="card text-center"><p className="text-2xl font-bold">{stats.pendingPhotos}</p><p className="text-xs text-neutral-500">Photos en attente</p></div>
          <div className="card text-center"><p className="text-2xl font-bold">{stats.pendingReports}</p><p className="text-xs text-neutral-500">Signalements en attente</p></div>
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3">Photos à valider</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {pendingPhotos.map((p) => (
            <div key={p.id} className="card p-2 space-y-2">
              <img src={mediaUrl(p.url)} alt="" className="aspect-square object-cover rounded-lg w-full" />
              <p className="text-xs text-neutral-400">{p.profile.pseudo}</p>
              <div className="flex gap-2">
                <button className="btn-primary text-xs flex-1" onClick={() => moderatePhoto(p.id, 'APPROVED')}>Valider</button>
                <button className="btn-secondary text-xs flex-1" onClick={() => moderatePhoto(p.id, 'REJECTED')}>Refuser</button>
              </div>
            </div>
          ))}
          {pendingPhotos.length === 0 && <p className="text-neutral-500 text-sm">Aucune photo en attente.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Signalements</h2>
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card">
              <p className="text-sm">
                <span className="font-medium">{REPORT_REASON_LABELS[r.reason]}</span> — cible :{' '}
                {r.targetUser.profile?.pseudo || r.targetUser.email}
              </p>
              {r.details && <p className="text-sm text-neutral-400 mt-1">{r.details}</p>}
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary text-xs" onClick={() => reviewReport(r.id, 'DISMISSED')}>Rejeter</button>
                <button className="btn-secondary text-xs" onClick={() => reviewReport(r.id, 'ACTION_TAKEN')}>Marquer traité</button>
                <button className="btn-primary text-xs" onClick={() => reviewReport(r.id, 'ACTION_TAKEN', true)}>Bannir le compte</button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-neutral-500 text-sm">Aucun signalement en attente.</p>}
        </div>
      </section>
    </div>
  );
}
