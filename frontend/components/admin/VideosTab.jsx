'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';

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

export default function VideosTab() {
  const [pendingVideos, setPendingVideos] = useState([]);
  const [selected, setSelected] = useState(new Set());

  const load = () => {
    apiFetch('/api/admin/videos/pending').then((d) => setPendingVideos(d.videos)).catch(() => {});
  };

  useEffect(load, []);

  const days = useMemo(() => groupByDay(pendingVideos), [pendingVideos]);

  const moderate = async (id, status) => {
    await apiFetch(`/api/admin/videos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setPendingVideos((v) => v.filter((vid) => vid.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleDay = (dayItems) => {
    const ids = dayItems.map((v) => v.id);
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
    await apiFetch('/api/admin/videos/batch', { method: 'POST', body: JSON.stringify({ ids, status }) });
    setPendingVideos((v) => v.filter((vid) => !ids.includes(vid.id)));
    setSelected(new Set());
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Vidéos à valider ({pendingVideos.length})</h2>
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
                checked={day.items.every((v) => selected.has(v.id))}
                onChange={() => toggleDay(day.items)} />
              <span className="capitalize">{day.label}</span>
              <span className="text-neutral-400">({day.items.length})</span>
            </label>
            <div className="grid sm:grid-cols-3 gap-4">
              {day.items.map((v) => (
                <div key={v.id} className="card p-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} className="mt-1" />
                    <video src={mediaUrl(v.url)} controls className="aspect-video w-full rounded-lg bg-black" />
                  </div>
                  <p className="text-xs text-neutral-400">{v.profile.pseudo}</p>
                  <div className="flex gap-2">
                    <button className="btn-primary text-xs flex-1" onClick={() => moderate(v.id, 'APPROVED')}>Valider</button>
                    <button className="btn-secondary text-xs flex-1" onClick={() => moderate(v.id, 'REJECTED')}>Refuser</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {pendingVideos.length === 0 && <p className="text-neutral-500 text-sm">Aucune vidéo en attente.</p>}
      </div>
    </section>
  );
}
