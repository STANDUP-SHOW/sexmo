'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';
import ModerationTab from '../../components/admin/ModerationTab';
import VideosTab from '../../components/admin/VideosTab';
import PagesTab from '../../components/admin/PagesTab';
import CommentsTab from '../../components/admin/CommentsTab';
import TestimonialsTab from '../../components/admin/TestimonialsTab';
import SettingsTab from '../../components/admin/SettingsTab';

const TABS = [
  { id: 'moderation', label: 'Modération' },
  { id: 'videos', label: 'Vidéos' },
  { id: 'pages', label: 'Pages' },
  { id: 'comments', label: 'Commentaires' },
  { id: 'testimonials', label: 'Avis' },
  { id: 'settings', label: 'Personnalisation' },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('moderation');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.push('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === 'ADMIN') apiFetch('/api/admin/stats').then(setStats).catch(() => {});
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Back-office</h1>

      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.users}</p><p className="text-xs text-neutral-500">Comptes</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.profiles}</p><p className="text-xs text-neutral-500">Profils</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.pendingPhotos}</p><p className="text-xs text-neutral-500">Photos</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.pendingVideos}</p><p className="text-xs text-neutral-500">Vidéos</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.pendingReports}</p><p className="text-xs text-neutral-500">Signalements</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.pendingComments}</p><p className="text-xs text-neutral-500">Commentaires</p></div>
          <div className="card text-center py-3"><p className="text-xl font-bold">{stats.pendingTestimonials}</p><p className="text-xs text-neutral-500">Avis</p></div>
        </div>
      )}

      <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition ${
              tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'moderation' && <ModerationTab />}
      {tab === 'videos' && <VideosTab />}
      {tab === 'pages' && <PagesTab />}
      {tab === 'comments' && <CommentsTab />}
      {tab === 'testimonials' && <TestimonialsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
