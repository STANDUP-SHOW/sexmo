'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import { GENDER_LABELS } from '../../lib/enums';
import { memberSinceLabel } from '../../lib/format';
import CityAutocomplete from '../../components/CityAutocomplete';

export default function DiscoverPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [meta, setMeta] = useState({ cities: [], genders: [] });
  const [filters, setFilters] = useState({ city: '', gender: '', minAge: '', maxAge: '' });
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
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
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
              <div className="aspect-[3/4] bg-neutral-200">
                {p.photos[0] ? (
                  <img src={mediaUrl(p.photos[0].url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Pas de photo</div>
                )}
              </div>
            </Link>
            <div className="p-3">
              <p className="font-medium">{p.pseudo}, {p.age ?? '—'}</p>
              <p className="text-xs text-neutral-500">{p.city} · {GENDER_LABELS[p.gender]}</p>
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
