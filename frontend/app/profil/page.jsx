'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { apiFetch, mediaUrl } from '../../lib/api';
import { getCroppedImageBlob } from '../../lib/cropImage';
import PhotoCropModal from '../../components/PhotoCropModal';
import CityAutocomplete from '../../components/CityAutocomplete';
import { PRACTICE_CATEGORIES } from '../../lib/practices';
import { GENDER_LABELS, ORIENTATION_LABELS, SEX_ROLE_LABELS, BODY_TYPE_LABELS, EYE_COLOR_LABELS, AD_CATEGORY_LABELS, EXPERIENCE_LEVEL_LABELS } from '../../lib/enums';

const MAX_PUBLIC_PHOTOS = 5;
const MAX_PRIVATE_PHOTOS = 20;
const MAX_VIDEOS = 3;

const MODERATION_LABELS = { APPROVED: 'validée', REJECTED: 'refusée', PENDING: 'en attente' };
const MODERATION_COLORS = { APPROVED: 'bg-green-700 text-white', REJECTED: 'bg-red-700 text-white', PENDING: 'bg-yellow-600 text-white' };

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [practices, setPractices] = useState([]);
  const [orientation, setOrientation] = useState('');
  const [sexRole, setSexRole] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [adCategory, setAdCategory] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [visible, setVisible] = useState(true);
  const [available, setAvailable] = useState(false);
  const [privatePhotosAccess, setPrivatePhotosAccess] = useState('ON_REQUEST');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [matches, setMatches] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [batchNotice, setBatchNotice] = useState('');
  const [error, setError] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTargetPrivate, setCropTargetPrivate] = useState(false);
  const [quality, setQuality] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const refreshQuality = () => {
    apiFetch('/api/profiles/me/quality').then(setQuality).catch(() => {});
  };

  const refreshRequests = () => {
    apiFetch('/api/photo-access/requests').then((d) => setAccessRequests(d.requests)).catch(() => {});
  };

  const refreshLikesAndMatches = () => {
    apiFetch('/api/likes/received').then((d) => setLikesReceived(d.profiles)).catch(() => {});
    apiFetch('/api/messages/conversations').then((d) => setMatches(d.conversations)).catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    setBio(user.profile?.bio || '');
    setCity(user.profile?.city || '');
    setInterestsText((user.profile?.interests || []).join(', '));
    setPractices(user.profile?.practices || []);
    setOrientation(user.profile?.orientation || '');
    setSexRole(user.profile?.sexRole || '');
    setHeightCm(user.profile?.heightCm ?? '');
    setWeightKg(user.profile?.weightKg ?? '');
    setBodyType(user.profile?.bodyType || '');
    setEyeColor(user.profile?.eyeColor || '');
    setAdCategory(user.profile?.adCategory || '');
    setExperienceLevel(user.profile?.experienceLevel || '');
    setUseGeolocation(user.profile?.useGeolocation ?? false);
    setRadiusKm(user.profile?.radiusKm ?? 0);
    setVisible(user.profile?.visible ?? true);
    setAvailable(user.profile?.available ?? false);
    setPrivatePhotosAccess(user.profile?.privatePhotosAccess || 'ON_REQUEST');
    apiFetch('/api/photos/mine').then((d) => setPhotos(d.photos)).catch(() => {});
    apiFetch('/api/videos/mine').then((d) => setVideos(d.videos)).catch(() => {});
    refreshQuality();
    refreshRequests();
    refreshLikesAndMatches();
  }, [user]);

  if (!user) return null;

  const publicPhotos = photos.filter((p) => !p.isPrivate);
  const privatePhotos = photos.filter((p) => p.isPrivate);

  const toggleAvailable = async () => {
    const next = !available;
    setAvailable(next);
    try {
      await apiFetch('/api/profiles/me', { method: 'PATCH', body: JSON.stringify({ available: next }) });
    } catch (err) {
      setAvailable(!next);
      setError(err.message);
    }
  };

  const locateMe = () => {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { profile } = await apiFetch('/api/profiles/me', {
            method: 'PATCH',
            body: JSON.stringify({
              useGeolocation: true,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          setUseGeolocation(true);
          setCity(profile.city);
        } catch (err) {
          setLocateError(err.message);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocateError('Localisation refusée ou indisponible.');
        setLocating(false);
      }
    );
  };

  const disableGeolocation = async () => {
    setUseGeolocation(false);
    await apiFetch('/api/profiles/me', { method: 'PATCH', body: JSON.stringify({ useGeolocation: false }) });
  };

  const saveRadius = async (km) => {
    setRadiusKm(km);
    await apiFetch('/api/profiles/me', { method: 'PATCH', body: JSON.stringify({ radiusKm: km }) });
  };

  const togglePractice = (key) => {
    setPractices((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };

  const save = async () => {
    setError('');
    try {
      const interests = interestsText.split(',').map((s) => s.trim()).filter(Boolean);
      await apiFetch('/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({
          bio, city, visible, interests, practices, privatePhotosAccess,
          orientation: orientation || undefined, sexRole: sexRole || null,
          heightCm: heightCm === '' ? null : Number(heightCm), weightKg: weightKg === '' ? null : Number(weightKg),
          bodyType: bodyType || null, eyeColor: eyeColor || null, adCategory: adCategory || null,
          experienceLevel: experienceLevel || null,
        }),
      });
      setSaved(true);
      refreshQuality();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadPhoto = async (blob, isPrivate) => {
    const max = isPrivate ? MAX_PRIVATE_PHOTOS : MAX_PUBLIC_PHOTOS;
    const current = isPrivate ? privatePhotos.length : publicPhotos.length;
    if (current >= max) return setError(`Maximum ${max} photos ${isPrivate ? 'privées' : 'publiques'}.`);
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('photo', blob, 'photo.jpg');
      fd.append('isPrivate', String(isPrivate));
      const { photo } = await apiFetch('/api/photos', { method: 'POST', body: fd });
      setPhotos((p) => [...p, photo]);
      refreshQuality();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (file, isPrivate) => {
    if (!file) return;
    setCropTargetPrivate(isPrivate);
    setCropSrc(URL.createObjectURL(file));
  };

  // Sélection multiple ou dossier entier : pas de recadrage (trop de photos à
  // traiter une par une), envoi direct au serveur qui ne garde que ce qu'il
  // reste de quota (5 publiques / 20 privées) et ignore le reste.
  const uploadBatch = async (files, isPrivate) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      fd.append('isPrivate', String(isPrivate));
      const { photos: created, notice } = await apiFetch('/api/photos/batch', { method: 'POST', body: fd });
      setPhotos((p) => [...p, ...created]);
      setError('');
      if (notice) { setSaved(false); setBatchNotice(notice); setTimeout(() => setBatchNotice(''), 6000); }
      refreshQuality();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onFilesSelected = (files, isPrivate) => {
    if (!files || files.length === 0) return;
    if (files.length === 1) return onFileSelected(files[0], isPrivate);
    uploadBatch(files, isPrivate);
  };

  const featurePhoto = async (id) => {
    const { photos: updated } = await apiFetch(`/api/photos/${id}/feature`, { method: 'PATCH' });
    setPhotos(updated);
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const confirmCrop = async (croppedAreaPixels) => {
    const blob = await getCroppedImageBlob(cropSrc, croppedAreaPixels);
    const isPrivate = cropTargetPrivate;
    closeCrop();
    await uploadPhoto(blob, isPrivate);
  };

  const deletePhoto = async (id) => {
    await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((ph) => ph.id !== id));
    refreshQuality();
  };

  const toggleGalleryPhoto = async (id, publishedToGallery) => {
    const { photo } = await apiFetch(`/api/photos/${id}/gallery`, {
      method: 'PATCH',
      body: JSON.stringify({ publishedToGallery }),
    });
    setPhotos((p) => p.map((ph) => (ph.id === id ? photo : ph)));
  };

  const uploadVideo = async (file) => {
    if (videos.length >= MAX_VIDEOS) return setError(`Maximum ${MAX_VIDEOS} vidéos.`);
    setUploadingVideo(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('video', file);
      const { video } = await apiFetch('/api/videos', { method: 'POST', body: fd });
      setVideos((v) => [...v, video]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const deleteVideo = async (id) => {
    await apiFetch(`/api/videos/${id}`, { method: 'DELETE' });
    setVideos((v) => v.filter((vid) => vid.id !== id));
  };

  const toggleGalleryVideo = async (id, publishedToGallery) => {
    const { video } = await apiFetch(`/api/videos/${id}/gallery`, {
      method: 'PATCH',
      body: JSON.stringify({ publishedToGallery }),
    });
    setVideos((v) => v.map((vid) => (vid.id === id ? video : vid)));
  };

  const respondToRequest = async (id, status) => {
    await apiFetch(`/api/photo-access/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setAccessRequests((r) => r.filter((req) => req.id !== id));
  };

  const likeBack = async (profileId) => {
    const res = await apiFetch(`/api/likes/${profileId}`, { method: 'POST' });
    setLikesReceived((l) => l.filter((p) => p.id !== profileId));
    if (res.matched) refreshLikesAndMatches();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href={`/profil/${user.profile?.id}`} className="btn-primary w-full text-center block">
        Voir mon profil public
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-sm text-neutral-500">{user.profile?.pseudo} · {user.email}</p>
        </div>
        <button type="button" onClick={toggleAvailable}
          className={`flex items-center gap-2 text-sm rounded-full px-3 py-1.5 border transition ${
            available ? 'bg-green-50 border-green-300 text-green-700' : 'border-neutral-300 text-neutral-500'
          }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${available ? 'bg-green-500' : 'bg-neutral-300'}`} />
          {available ? 'Disponible pour discuter' : 'Se déclarer disponible'}
        </button>
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Informations</h2>
        <div>
          <label className="text-sm text-neutral-400">Ville</label>
          <CityAutocomplete value={city} onChange={setCity} disabled={useGeolocation} />
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" checked={useGeolocation}
              onChange={(e) => (e.target.checked ? locateMe() : disableGeolocation())} />
            Me localiser automatiquement (votre ville est calculée depuis votre position)
          </label>
          {useGeolocation ? (
            <button type="button" className="btn-secondary text-xs" onClick={locateMe} disabled={locating}>
              {locating ? 'Localisation...' : 'Actualiser ma position'}
            </button>
          ) : (
            <p className="text-xs text-neutral-500">Sinon, l'annonce reste classée dans la ville indiquée ci-dessus.</p>
          )}
          {locateError && <p className="text-xs text-red-600">{locateError}</p>}
          {useGeolocation && (
            <div>
              <label className="text-xs text-neutral-500">Étendre la visibilité à {radiusKm} km autour de {city}</label>
              <input type="range" min={0} max={200} step={10} value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                onMouseUp={(e) => saveRadius(Number(e.target.value))}
                onTouchEnd={(e) => saveRadius(Number(e.target.value))}
                className="w-full" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-400">Orientation</label>
            <select className="input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
              {Object.entries(ORIENTATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400">Position</label>
            <select className="input" value={sexRole} onChange={(e) => setSexRole(e.target.value)}>
              <option value="">Non précisé</option>
              {Object.entries(SEX_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-400">Taille (cm)</label>
            <input type="number" min={100} max={250} className="input" placeholder="ex. 175"
              value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-400">Poids (kg)</label>
            <input type="number" min={30} max={250} className="input" placeholder="ex. 68"
              value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-400">Silhouette</label>
            <select className="input" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
              <option value="">Non précisé</option>
              {Object.entries(BODY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400">Couleur des yeux</label>
            <select className="input" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)}>
              <option value="">Non précisé</option>
              {Object.entries(EYE_COLOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Catégorie d'annonce</label>
          <select className="input" value={adCategory} onChange={(e) => setAdCategory(e.target.value)}>
            <option value="">Non précisé</option>
            {Object.entries(AD_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Badge de niveau (affiché sur votre profil)</label>
          <select className="input" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
            <option value="">Aucun badge</option>
            {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Votre annonce</label>
          <textarea className="input" rows={4} maxLength={1000} placeholder="Décrivez-vous, ce que vous recherchez, ce que vous pratiquez..."
            value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Centres d'intérêt (séparés par des virgules)</label>
          <input className="input" placeholder="cinéma, voyages, cuisine..."
            value={interestsText} onChange={(e) => setInterestsText(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Qui peut voir mes photos privées</label>
          <select className="input" value={privatePhotosAccess} onChange={(e) => setPrivatePhotosAccess(e.target.value)}>
            <option value="ON_REQUEST">Sur demande (j'approuve chaque accès)</option>
            <option value="EVERYONE">Tout le monde (visible sans demande)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Profil public (visible dans la recherche et par les visiteurs sans compte). Décochez pour le masquer.
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Enregistrer</button>
          {saved && <span className="text-sm text-green-600">Enregistré</span>}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Vos pratiques</h2>
        <p className="text-sm text-neutral-500">Cochez ce qui vous correspond, affiché sur votre profil public.</p>
        <div className="space-y-4">
          {PRACTICE_CATEGORIES.map((cat) => (
            <div key={cat.key}>
              <h3 className="text-sm font-medium text-neutral-700 mb-2">{cat.label}</h3>
              <div className="flex flex-wrap gap-2">
                {cat.practices.map((p) => {
                  const checked = practices.includes(p.key);
                  return (
                    <button type="button" key={p.key} onClick={() => togglePractice(p.key)}
                      className={`text-xs rounded-full px-3 py-1.5 border transition ${
                        checked ? 'bg-brand-500 border-brand-500 text-white' : 'border-neutral-300 text-neutral-600 hover:border-brand-300'
                      }`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Enregistrer</button>
          {saved && <span className="text-sm text-green-600">Enregistré</span>}
        </div>
      </section>

      {quality && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Qualité du profil</h2>
            <span className="text-sm text-neutral-400">{quality.score} / {quality.maxScore}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full bg-brand-500" style={{ width: `${(quality.score / quality.maxScore) * 100}%` }} />
          </div>
          {quality.suggestions.length > 0 ? (
            <ul className="text-sm text-neutral-400 list-disc list-inside space-y-1">
              {quality.suggestions.map((s) => <li key={s}>{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-green-600">Profil complet, bravo !</p>
          )}
        </section>
      )}

      {likesReceived.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Qui vous aime ({likesReceived.length})</h2>
          {likesReceived.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <Link href={`/profil/${p.id}`} className="text-sm hover:text-brand-600">
                {p.pseudo} vous aime bien, et vous ? <span className="text-neutral-500">· {p.city}</span>
              </Link>
              <button className="btn-primary text-xs shrink-0" onClick={() => likeBack(p.id)}>J'aime aussi</button>
            </div>
          ))}
        </section>
      )}

      {matches.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Mes matchs ({matches.length})</h2>
          {matches.map((m) => (
            <Link key={m.conversationId} href={`/messages/${m.conversationId}`}
              className="flex items-center justify-between text-sm hover:text-brand-600">
              <span>🎉 {m.otherProfile.pseudo} <span className="text-neutral-500">· {m.otherProfile.city}</span></span>
              <span className="text-xs text-neutral-400">Voir la conversation</span>
            </Link>
          ))}
        </section>
      )}

      {accessRequests.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Demandes d'accès à vos photos privées</h2>
          {accessRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between">
              <span className="text-sm">{r.requesterProfile.pseudo} · {r.requesterProfile.city}</span>
              <div className="flex gap-2">
                <button className="btn-primary text-xs" onClick={() => respondToRequest(r.id, 'APPROVED')}>Accepter</button>
                <button className="btn-secondary text-xs" onClick={() => respondToRequest(r.id, 'DENIED')}>Refuser</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {batchNotice && <p className="text-sm text-brand-600 -mb-4">{batchNotice}</p>}

      <PhotoGrid
        title="Photos publiques" max={MAX_PUBLIC_PHOTOS} photos={publicPhotos}
        uploading={uploading} onFilesSelected={(files) => onFilesSelected(files, false)} onDelete={deletePhoto}
        onToggleGallery={toggleGalleryPhoto} onFeature={featurePhoto}
        hint="La 1ère photo (mise en avant) sert de vignette principale. Une photo approuvée peut en plus être publiée dans la galerie « Photos des membres » du site."
      />

      <PhotoGrid
        title="Photos privées" max={MAX_PRIVATE_PHOTOS} photos={privatePhotos}
        uploading={uploading} onFilesSelected={(files) => onFilesSelected(files, true)} onDelete={deletePhoto}
        hint="Visibles selon le réglage ci-dessus (tout le monde ou sur demande)."
      />

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Vidéos ({videos.length}/{MAX_VIDEOS})</h2>
          <label className="btn-secondary text-sm cursor-pointer">
            {uploadingVideo ? 'Envoi...' : 'Ajouter une vidéo'}
            <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
              disabled={uploadingVideo || videos.length >= MAX_VIDEOS}
              onChange={(e) => { e.target.files[0] && uploadVideo(e.target.files[0]); e.target.value = ''; }} />
          </label>
        </div>
        <p className="text-xs text-neutral-500">Vérifiée par la modération avant d'apparaître publiquement. Formats acceptés : mp4, mov, webm (80 Mo max).</p>
        <p className="text-xs text-neutral-500">Une vidéo approuvée peut en plus être publiée dans la galerie « Vidéos des membres » du site.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {videos.map((v) => (
            <div key={v.id} className="relative aspect-video rounded-lg overflow-hidden border border-neutral-200 bg-black">
              <video src={mediaUrl(v.url)} controls className="w-full h-full object-cover" />
              <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${MODERATION_COLORS[v.moderationStatus]}`}>
                {MODERATION_LABELS[v.moderationStatus]}
              </span>
              <button onClick={() => deleteVideo(v.id)}
                className="absolute bottom-1 right-1 text-[10px] bg-black/70 rounded px-1.5 py-0.5 hover:bg-black">
                Supprimer
              </button>
              {v.moderationStatus === 'APPROVED' && (
                <label className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 cursor-pointer">
                  <input type="checkbox" checked={v.publishedToGallery}
                    onChange={(e) => toggleGalleryVideo(v.id, e.target.checked)} />
                  Galerie
                </label>
              )}
            </div>
          ))}
        </div>
      </section>

      {cropSrc && (
        <PhotoCropModal imageSrc={cropSrc} onCancel={closeCrop} onConfirm={confirmCrop} />
      )}
    </div>
  );
}

function PhotoGrid({ title, max, photos, uploading, onFilesSelected, onDelete, onToggleGallery, onFeature, hint }) {
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">{title} ({photos.length}/{max})</h2>
        <div className="flex gap-2">
          <label className="btn-secondary text-sm cursor-pointer">
            {uploading ? 'Envoi...' : 'Ajouter des photos'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              disabled={uploading || photos.length >= max}
              onChange={(e) => { onFilesSelected(e.target.files); e.target.value = ''; }} />
          </label>
          <label className="btn-secondary text-sm cursor-pointer">
            Importer un dossier
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple webkitdirectory="" directory="" className="hidden"
              disabled={uploading || photos.length >= max}
              onChange={(e) => { onFilesSelected(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
      </div>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((p, i) => (
          <div key={p.id} className={`relative aspect-square rounded-lg overflow-hidden border ${i === 0 && onFeature ? 'border-brand-500 ring-2 ring-brand-300' : 'border-neutral-200'}`}>
            <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
            <span className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${MODERATION_COLORS[p.moderationStatus]}`}>
              {MODERATION_LABELS[p.moderationStatus]}
            </span>
            {onFeature && (i === 0 ? (
              <span className="absolute top-1 right-1 text-[10px] bg-brand-500 text-white rounded px-1.5 py-0.5">Vignette</span>
            ) : (
              <button onClick={() => onFeature(p.id)}
                className="absolute top-1 right-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 hover:bg-black">
                Mettre en avant
              </button>
            ))}
            <button onClick={() => onDelete(p.id)}
              className="absolute bottom-1 right-1 text-[10px] bg-black/70 rounded px-1.5 py-0.5 hover:bg-black">
              Supprimer
            </button>
            {onToggleGallery && p.moderationStatus === 'APPROVED' && (
              <label className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 cursor-pointer">
                <input type="checkbox" checked={p.publishedToGallery}
                  onChange={(e) => onToggleGallery(p.id, e.target.checked)} />
                Galerie
              </label>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
