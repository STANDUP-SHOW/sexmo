'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch } from '../../lib/api';
import { GENDER_LABELS, ORIENTATION_LABELS, BODY_TYPE_LABELS, EYE_COLOR_LABELS, AD_CATEGORY_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../lib/enums';
import { memberSinceLabel } from '../../lib/format';
import ProfileCardPhotos from '../../components/ProfileCardPhotos';
import MapSearchBlock from '../../components/MapSearchBlock';
import { useSearchLocation } from '../../lib/useSearchLocation';

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { city, radiusKm, setCity, setRadiusKm, ready } = useSearchLocation();
  const [meta, setMeta] = useState({ cities: [], genders: [], orientations: [], bodyTypes: [], eyeColors: [], adCategories: [] });
  const [filters, setFilters] = useState({ gender: '', orientation: '', minAge: '', maxAge: '', bodyType: '', eyeColor: '', adCategory: '', available: false });
  const [profiles, setProfiles] = useState([]);
  const [matchNotice, setMatchNotice] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [likeError, setLikeError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    apiFetch('/api/browse/meta').then(setMeta).catch(() => {});
  }, []);

  const search = async () => {
    const params = new URLSearchParams();
    if (city) { params.set('city', city); params.set('radiusKm', String(radiusKm)); }
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
    if (user && ready) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ready]);

  const like = async (profileId) => {
    setLikeError('');
    try {
      const res = await apiFetch(`/api/likes/${profileId}`, { method: 'POST' });
      setLikedIds((s) => new Set(s).add(profileId));
      if (res.matched) setMatchNotice(res);
    } catch (err) {
      setLikeError(err.message);
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Découvrir</h1>

      <div className="mb-6">
        <MapSearchBlock city={city} radiusKm={radiusKm} onCityChange={setCity} onRadiusChange={setRadiusKm} />
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select className="input w-48" value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
          <option value="">Tous profils</option>
          {meta.genders.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
        </select>

        <select className="input w-40" value={filters.orientation} onChange={(e) => setFilters({ ...filters, orientation: e.target.value })}>
          <option value="">Toutes orientations</option>
          {(meta.orientations || []).map((k) => <option key={k} value={k}>{ORIENTATION_LABELS[k]}</option>)}
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
      {likeError && <p className="text-sm text-red-600 mb-4">{likeError}</p>}

      <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {profiles.map((p) => {
          const liked = likedIds.has(p.id);
          return (
            <div key={p.id} className="card p-0 overflow-hidden">
              <Link href={`/profil/${p.id}`}>
                <ProfileCardPhotos photos={p.photos} available={p.available} />
              </Link>
              <div className="p-3">
                <p className="font-medium">{p.pseudo}, {p.age ?? '—'} {p.experienceLevel && <span className="text-sm">{EXPERIENCE_LEVEL_LABELS[p.experienceLevel]}</span>}</p>
                <p className="text-xs text-neutral-500">{p.city} · {GENDER_LABELS[p.gender]}</p>
                {p.adCategory && <p className="text-xs text-brand-600">{AD_CATEGORY_LABELS[p.adCategory]}</p>}
                {p.memberSinceDays != null && (
                  <p className="text-[11px] text-neutral-600">{memberSinceLabel(p.memberSinceDays)}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Link href={`/profil/${p.id}`} className="btn-secondary text-xs flex-1 text-center">Voir profil</Link>
                  <button onClick={() => like(p.id)} disabled={liked}
                    className={liked
                      ? 'text-xs flex-1 rounded-lg py-2 px-3 font-medium bg-brand-50 text-brand-600 border border-brand-200 cursor-default'
                      : 'btn-primary text-xs flex-1'}>
                    {liked ? '♥ Aimé' : "♡ J'aime"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {profiles.length === 0 && <p className="text-neutral-500 col-span-full">Aucun profil ne correspond à ces critères.</p>}
      </div>
    </div>
  );
}
