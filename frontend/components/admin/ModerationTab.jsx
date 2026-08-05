'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';

const REPORT_REASON_LABELS = {
  FAUX_PROFIL: 'Faux profil',
  CONTENU_ILLEGAL: 'Contenu illégal',
  MINEUR_SUSPECTE: 'Mineur suspecté',
  SOLLICITATION_COMMERCIALE: 'Sollicitation commerciale',
  HARCELEMENT: 'Harcèlement',
  AUTRE: 'Autre',
};

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function groupByDay(items) {
  const groups = new Map();
  for (const item of items) {
    const key = new Date(item.createdAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, label: DAY_LABEL.format(new Date(key)), items }));
}

export default function ModerationTab() {
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const load = () => {
    apiFetch('/api/admin/photos/pending').then((d) => setPendingPhotos(d.photos)).catch(() => {});
    apiFetch('/api/admin/reports?status=PENDING').then((d) => setReports(d.reports)).catch(() => {});
  };

  useEffect(load, []);

  const days = useMemo(() => groupByDay(pendingPhotos), [pendingPhotos]);

  const moderatePhoto = async (id, status) => {
    await apiFetch(`/api/admin/photos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setPendingPhotos((p) => p.filter((ph) => ph.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleDay = (dayItems) => {
    const ids = dayItems.map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id)));
      return n;
    });
  };

  const batchModerate = async (status) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    await apiFetch('/api/admin/photos/batch', { method: 'POST', body: JSON.stringify({ ids, status }) });
    setPendingPhotos((p) => p.filter((ph) => !ids.includes(ph.id)));
    setSelected(new Set());
  };

  const reviewReport = async (id, status, banTarget = false) => {
    await apiFetch(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status, banTarget }) });
    setReports((r) => r.filter((rep) => rep.id !== id));
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Photos à valider ({pendingPhotos.length})</h2>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">{selected.size} sélectionnée(s)</span>
              <button className="btn-primary text-xs" onClick={() => batchModerate('APPROVED')}>Valider la sélection</button>
              <button className="btn-secondary text-xs" onClick={() => batchModerate('REJECTED')}>Refuser la sélection</button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <label className="flex items-center gap-2 text-sm text-neutral-600 mb-2 cursor-pointer">
                <input type="checkbox"
                  checked={day.items.every((p) => selected.has(p.id))}
                  onChange={() => toggleDay(day.items)} />
                <span className="capitalize">{day.label}</span>
                <span className="text-neutral-400">({day.items.length})</span>
              </label>
              <div className="grid sm:grid-cols-4 gap-4">
                {day.items.map((p) => (
                  <div key={p.id} className="card p-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="mt-1" />
                      <img src={mediaUrl(p.url)} alt="" className="aspect-square object-cover rounded-lg w-full" />
                    </div>
                    <p className="text-xs text-neutral-400">{p.profile.pseudo}</p>
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs flex-1" onClick={() => moderatePhoto(p.id, 'APPROVED')}>Valider</button>
                      <button className="btn-secondary text-xs flex-1" onClick={() => moderatePhoto(p.id, 'REJECTED')}>Refuser</button>
                    </div>
                  </div>
                ))}
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
