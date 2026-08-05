'use client';

import { useEffect, useState } from 'react';
import { apiFetch, mediaUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { GENDER_LABELS, ORIENTATION_LABELS } from '../../lib/enums';

const STATUS_LABELS = { ACTIVE: 'Actif', SUSPENDED: 'Suspendu', BANNED: 'Banni' };
const STATUS_COLORS = { ACTIVE: 'bg-green-700 text-white', SUSPENDED: 'bg-yellow-600 text-white', BANNED: 'bg-red-700 text-white' };

export default function MembersTab() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    apiFetch(`/api/admin/members?${params.toString()}`).then((d) => { setMembers(d.members); setTotal(d.total); }).catch(() => {});
  };

  useEffect(load, [q]);

  if (selectedId) {
    return <MemberDetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Membres ({total})</h2>
        <button className="btn-primary text-sm" onClick={() => setShowCreate(true)}>Créer un membre</button>
      </div>

      <input className="input" placeholder="Rechercher par e-mail ou pseudo..." value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{m.profile?.pseudo || '(sans profil)'} <span className="text-neutral-400 font-normal text-sm">· {m.email}</span></p>
              <p className="text-xs text-neutral-500">{m.profile?.city || '—'} · membre depuis {new Date(m.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
              <button className="btn-secondary text-xs" onClick={() => setSelectedId(m.id)}>Voir / modifier</button>
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="text-neutral-500 text-sm">Aucun membre trouvé.</p>}
      </div>

      {showCreate && <CreateMemberModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </section>
  );
}

function CreateMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', pseudo: '', birthDate: '', gender: 'HOMME', orientation: 'HETERO', seeking: ['FEMME'], city: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiFetch('/api/admin/members', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 z-50">
      <form onSubmit={submit} className="card max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold">Créer un membre</h3>
        <input required type="email" className="input" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" className="input" placeholder="Mot de passe (8 caractères min.)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input required className="input" placeholder="Pseudo" value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} />
        <input required type="date" className="input" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
          {Object.entries(ORIENTATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input required className="input" placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Création...' : 'Créer'}</button>
        </div>
      </form>
    </div>
  );
}

function MemberDetail({ id, onBack }) {
  const { impersonate } = useAuth();
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    apiFetch(`/api/admin/members/${id}`).then((d) => setMember(d.member)).catch((e) => setError(e.message));
  };
  useEffect(load, [id]);

  if (error) return <div><button className="btn-secondary text-sm mb-4" onClick={onBack}>← Retour</button><p className="text-red-600">{error}</p></div>;
  if (!member) return <p className="text-neutral-500">Chargement...</p>;

  const patch = async (data) => {
    const { member: updated } = await apiFetch(`/api/admin/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    setMember(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const doImpersonate = async () => {
    const data = await apiFetch(`/api/admin/members/${id}/impersonate`, { method: 'POST' });
    impersonate(data);
    router.push('/decouvrir');
  };

  const remove = async () => {
    if (!confirm(`Supprimer définitivement le compte ${member.email} ? Cette action est irréversible.`)) return;
    await apiFetch(`/api/admin/members/${id}`, { method: 'DELETE' });
    onBack();
  };

  const uploadPhoto = async (file, isPrivate) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('isPrivate', String(isPrivate));
      await apiFetch(`/api/admin/members/${id}/photos`, { method: 'POST', body: fd });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId) => {
    await apiFetch(`/api/photos/${photoId}`, { method: 'DELETE' });
    load();
  };

  const deleteVideo = async (videoId) => {
    await apiFetch(`/api/videos/${videoId}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <button className="btn-secondary text-sm" onClick={onBack}>← Retour à la liste</button>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{member.profile?.pseudo || '(sans profil)'}</h3>
            <p className="text-sm text-neutral-500">{member.email} · inscrit le {new Date(member.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={doImpersonate}>Se connecter en tant que ce membre</button>
            <button className="btn-secondary text-sm text-red-600" onClick={remove}>Supprimer le compte</button>
          </div>
        </div>

        <div>
          <label className="text-sm text-neutral-400">Statut du compte</label>
          <select className="input" value={member.status} onChange={(e) => patch({ status: e.target.value })}>
            <option value="ACTIVE">Actif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="BANNED">Banni</option>
          </select>
        </div>

        {member.profile && (
          <>
            <div>
              <label className="text-sm text-neutral-400">Pseudo</label>
              <input className="input" defaultValue={member.profile.pseudo} onBlur={(e) => patch({ pseudo: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-neutral-400">Ville</label>
              <input className="input" defaultValue={member.profile.city} onBlur={(e) => patch({ city: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-neutral-400">Bio / annonce</label>
              <textarea className="input" rows={3} defaultValue={member.profile.bio} onBlur={(e) => patch({ bio: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input type="checkbox" checked={member.profile.visible} onChange={(e) => patch({ visible: e.target.checked })} />
              Profil public
            </label>
          </>
        )}
        {saved && <span className="text-sm text-green-600">Enregistré</span>}
      </div>

      {member.profile && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Photos ({member.profile.photos?.length || 0})</h3>
            <label className="btn-secondary text-sm cursor-pointer">
              {uploading ? 'Envoi...' : 'Ajouter une photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading}
                onChange={(e) => { e.target.files[0] && uploadPhoto(e.target.files[0], false); e.target.value = ''; }} />
            </label>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {(member.profile.photos || []).map((p) => (
              <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200">
                <img src={mediaUrl(p.url)} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-1 left-1 text-[9px] bg-black/70 text-white rounded px-1">{p.isPrivate ? 'privée' : p.moderationStatus}</span>
                <button onClick={() => deletePhoto(p.id)} className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 hover:bg-black">Suppr.</button>
              </div>
            ))}
          </div>

          {(member.profile.videos || []).length > 0 && (
            <>
              <h3 className="font-semibold pt-2">Vidéos ({member.profile.videos.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {member.profile.videos.map((v) => (
                  <div key={v.id} className="relative aspect-video rounded-lg overflow-hidden border border-neutral-200 bg-black">
                    <video src={mediaUrl(v.url)} controls className="w-full h-full object-cover" />
                    <button onClick={() => deleteVideo(v.id)} className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white rounded px-1.5 py-0.5 hover:bg-black">Suppr.</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
