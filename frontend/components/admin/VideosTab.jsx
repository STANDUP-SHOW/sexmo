'use client';

import { useEffect, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';

export default function VideosTab() {
  const [pendingVideos, setPendingVideos] = useState([]);

  const load = () => {
    apiFetch('/api/admin/videos/pending').then((d) => setPendingVideos(d.videos)).catch(() => {});
  };

  useEffect(load, []);

  const moderate = async (id, status) => {
    await apiFetch(`/api/admin/videos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setPendingVideos((v) => v.filter((vid) => vid.id !== id));
  };

  return (
    <section>
      <h2 className="font-semibold mb-3">Vidéos à valider</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {pendingVideos.map((v) => (
          <div key={v.id} className="card p-2 space-y-2">
            <video src={mediaUrl(v.url)} controls className="aspect-video w-full rounded-lg bg-black" />
            <p className="text-xs text-neutral-400">{v.profile.pseudo}</p>
            <div className="flex gap-2">
              <button className="btn-primary text-xs flex-1" onClick={() => moderate(v.id, 'APPROVED')}>Valider</button>
              <button className="btn-secondary text-xs flex-1" onClick={() => moderate(v.id, 'REJECTED')}>Refuser</button>
            </div>
          </div>
        ))}
        {pendingVideos.length === 0 && <p className="text-neutral-500 text-sm">Aucune vidéo en attente.</p>}
      </div>
    </section>
  );
}
