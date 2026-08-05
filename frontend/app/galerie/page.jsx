'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';

export default function GaleriePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('photos');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/gallery/photos').then((d) => setPhotos(d.photos)).catch(() => {});
    apiFetch('/api/gallery/videos').then((d) => setVideos(d.videos)).catch(() => {});
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Galerie des membres</h1>
      <p className="text-sm text-neutral-500 mb-6">Photos et vidéos publiées par les membres depuis leur profil.</p>

      <div className="flex gap-2 border-b border-neutral-200 mb-6">
        {[['photos', `Photos (${photos.length})`], ['videos', `Vidéos (${videos.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3 py-2 text-sm border-b-2 transition ${
              tab === id ? 'border-brand-500 text-brand-500' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'photos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((p) => (
            <Link key={p.id} href={`/profil/${p.profile.id}`} className="group block">
              <div className="aspect-square rounded-lg overflow-hidden bg-neutral-200">
                <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover group-hover:opacity-90 transition" />
              </div>
              <p className="text-xs text-neutral-600 mt-1 truncate">{p.profile.pseudo} · {p.profile.city}</p>
            </Link>
          ))}
          {photos.length === 0 && <p className="text-neutral-500 col-span-full">Aucune photo publiée pour l'instant.</p>}
        </div>
      )}

      {tab === 'videos' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id}>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <video src={mediaUrl(v.url)} controls className="w-full h-full object-cover" />
              </div>
              <Link href={`/profil/${v.profile.id}`} className="text-xs text-neutral-600 mt-1 block hover:text-brand-600 truncate">
                {v.profile.pseudo} · {v.profile.city}
              </Link>
            </div>
          ))}
          {videos.length === 0 && <p className="text-neutral-500 col-span-full">Aucune vidéo publiée pour l'instant.</p>}
        </div>
      )}
    </div>
  );
}
