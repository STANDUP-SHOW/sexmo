'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import { GENDER_LABELS, BODY_TYPE_LABELS, EYE_COLOR_LABELS, AD_CATEGORY_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../lib/enums';
import { memberSinceLabel } from '../../lib/format';
import CityAutocomplete from '../../components/CityAutocomplete';

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [meta, setMeta] = useState({ cities: [], genders: [], bodyTypes: [], eyeColors: [], adCategories: [] });
  const [filters, setFilters] = useState({ city: '', gender: '', minAge: '', maxAge: '', bodyType: '', eyeColor: '', adCategory: '', available: false });
  const [profiles, setProfiles] = useState([]);
  const [matchNotice, setMatchNotice] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    apiFetch('/api/browse/meta').then(setMeta).catch(() => {});
  }, []);

  const search = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (k === 'available') { if (v) params.set('available', 'true'); return; }
      if (v) params.set(k, v);
    });
    try {
      const { profiles } = await apiFetch(`/api/browse?${params.toString()}`);
      setProfiles(profiles);
    } catch {
      setProfiles([]);
    }
  };

  useEffect(() => {
    if (user) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const like = async (profileId) => {
    const res = await apiFetch(`/api/likes/${profileId}`, { method: 'POST' });
    if (res.matched) setMatchNotice(res);
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Découvrir</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="w-40">
          <CityAutocomplete className="input w-40" placeholder="Ville"
            value={filters.city} onChange={(city) => setFilters({ ...filters, city })} />
        </div>

        <select className="input w-48" value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
          <option value="">Tous profils</option>
          {meta.genders.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
        </select>

        <input type="number" min={18} className="input w-24" placeholder="Âge min"
          value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: e.target.value })} />
        <input type="number" min={18} className="input w-24" placeholder="Âge max"
          value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })} />

        <select className="input w-40" value={filters.bodyType} onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}>
          <option value="">Silhouette</option>
          {(meta.bodyTypes || []).map((k) => <option key={k} value={k}>{BODY_TYPE_LABELS[k]}</option>)}
        </select>
        <select className="input w-40" value={filters.eyeColor} onChange={(e) => setFilters({ ...filters, eyeColor: e.target.value })}>
          <option value="">Couleur des yeux</option>
          {(meta.eyeColors || []).map((k) => <option key={k} value={k}>{EYE_COLOR_LABELS[k]}</option>)}
        </select>
        <select className="input w-44" value={filters.adCategory} onChange={(e) => setFilters({ ...filters, adCategory: e.target.value })}>
          <option value="">Catégorie d'annonce</option>
          {(meta.adCategories || []).map((k) => <option key={k} value={k}>{AD_CATEGORY_LABELS[k]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={filters.available} onChange={(e) => setFilters({ ...filters, available: e.target.checked })} />
          Disponibles maintenant
        </label>

        <button className="btn-primary" onClick={search}>Filtrer</button>
      </div>

      {matchNotice && (
        <div className="card mb-6 flex items-center justify-between">
          <span>🎉 C'est un match !</span>
          <Link href="/messages" className="btn-primary text-sm" onClick={() => setMatchNotice(null)}>Voir la conversation</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <div key={p.id} className="card p-0 overflow-hidden">
            <Link href={`/profil/${p.id}`}>
              <div className="relative">
                {p.available && (
                  <span className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] bg-white/90 text-green-700 rounded-full px-2 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Disponible
                  </span>
                )}
                {p.photos.length > 0 ? (
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="aspect-square bg-neutral-200">
                        {p.photos[i] && <img src={mediaUrl(p.photos[i].url)} alt="" className="w-full h-full object-cover" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-[3/4] w-full flex items-center justify-center bg-neutral-200 text-neutral-600 text-xs">Pas de photo</div>
                )}
              </div>
            </Link>
            <div className="p-3">
              <p className="font-medium">{p.pseudo}, {p.age ?? '—'} {p.experienceLevel && <span className="text-sm">{EXPERIENCE_LEVEL_LABELS[p.experienceLevel]}</span>}</p>
              <p className="text-xs text-neutral-500">{p.city} · {GENDER_LABELS[p.gender]}</p>
              {p.adCategory && <p className="text-xs text-brand-600">{AD_CATEGORY_LABELS[p.adCategory]}</p>}
              {p.memberSinceDays != null && (
                <p className="text-[11px] text-neutral-600">{memberSinceLabel(p.memberSinceDays)}</p>
              )}
              <button onClick={() => like(p.id)} className="btn-secondary text-xs mt-2 w-full">J'aime</button>
            </div>
          </div>
        ))}
        {profiles.length === 0 && <p className="text-neutral-500 col-span-full">Aucun profil ne correspond à ces critères.</p>}
      </div>
    </div>
  );
}
