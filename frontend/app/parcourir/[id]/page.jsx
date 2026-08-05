'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, mediaUrl } from '../../../lib/api';
import { GENDER_LABELS, ORIENTATION_LABELS, BODY_TYPE_LABELS, EYE_COLOR_LABELS, AD_CATEGORY_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../../lib/enums';
import { memberSinceLabel } from '../../../lib/format';
import { PRACTICE_LABELS } from '../../../lib/practices';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/api/public/profiles/${id}`).then((d) => setProfile(d.profile)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {profile.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {profile.photos.map((p) => (
            <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-neutral-200">
              <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">
          {profile.pseudo}, {profile.age ?? '—'}
          {profile.experienceLevel && <span className="text-base font-normal ml-2">{EXPERIENCE_LEVEL_LABELS[profile.experienceLevel]}</span>}
        </h1>
        <p className="text-neutral-500">{profile.city} · {GENDER_LABELS[profile.gender]} · {ORIENTATION_LABELS[profile.orientation]}</p>

        <div className="flex flex-wrap gap-2 mt-2">
          {profile.available && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-300 rounded-full px-2.5 py-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Disponible maintenant
            </span>
          )}
          {profile.memberSinceDays != null && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{memberSinceLabel(profile.memberSinceDays)}</span>
          )}
          {profile.bodyType && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">{BODY_TYPE_LABELS[profile.bodyType]}</span>
          )}
          {profile.eyeColor && (
            <span className="text-xs bg-neutral-200 rounded-full px-2.5 py-1">Yeux {EYE_COLOR_LABELS[profile.eyeColor]}</span>
          )}
          {profile.adCategory && (
            <span className="text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-2.5 py-1">{AD_CATEGORY_LABELS[profile.adCategory]}</span>
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

      <div className="card text-center space-y-2">
        <p className="text-sm text-neutral-600">Créez un compte gratuit pour liker ce profil et échanger en message.</p>
        <Link href="/signup" className="btn-primary inline-block">Créer mon profil</Link>
      </div>
    </div>
  );
}
