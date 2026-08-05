'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { GENDER_LABELS, ORIENTATION_LABELS } from '../../lib/enums';
import CityAutocomplete from '../../components/CityAutocomplete';

const GENDERS = Object.keys(GENDER_LABELS);
const ORIENTATIONS = Object.keys(ORIENTATION_LABELS);

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    birthDate: '',
    pseudo: '',
    gender: 'HOMME',
    orientation: 'HETERO',
    seeking: [],
    city: '',
    agreeTerms: false,
  });

  const toggleSeeking = (g) => {
    setForm((f) => ({
      ...f,
      seeking: f.seeking.includes(g) ? f.seeking.filter((x) => x !== g) : [...f.seeking, g],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.agreeTerms) return setError("Vous devez confirmer être majeur·e et accepter les CGU.");
    if (form.seeking.length === 0) return setError('Sélectionnez au moins un profil recherché.');

    const birth = new Date(form.birthDate);
    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
    if (!form.birthDate || age < 18) return setError('Ce site est réservé aux personnes majeures (18 ans et plus).');

    setLoading(true);
    try {
      await signup(form);
      router.push('/decouvrir');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Créer un profil</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm text-neutral-400">Pseudo</label>
          <input className="input" required maxLength={30}
            value={form.pseudo} onChange={(e) => setForm({ ...form, pseudo: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-neutral-400">E-mail</label>
          <input type="email" className="input" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-neutral-400">Mot de passe (8 caractères min.)</label>
          <input type="password" className="input" required minLength={8}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-neutral-400">Date de naissance</label>
          <input type="date" className="input" required
            value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        </div>

        <div>
          <label className="text-sm text-neutral-400">Vous êtes</label>
          <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-neutral-400">Orientation</label>
          <select className="input" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
            {ORIENTATIONS.map((o) => <option key={o} value={o}>{ORIENTATION_LABELS[o]}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-neutral-400 block mb-1">Vous recherchez</label>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <button type="button" key={g}
                onClick={() => toggleSeeking(g)}
                className={`text-xs rounded-full px-3 py-1.5 border ${form.seeking.includes(g) ? 'bg-brand-500 border-brand-500 text-white' : 'border-neutral-300 text-neutral-600'}`}>
                {GENDER_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-neutral-400">Ville</label>
          <CityAutocomplete required
            value={form.city} onChange={(city) => setForm({ ...form, city })} />
        </div>

        <label className="flex items-start gap-2 text-sm text-neutral-400">
          <input type="checkbox" className="mt-1"
            checked={form.agreeTerms} onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })} />
          <span>Je certifie être majeur·e (18 ans ou plus) et j'accepte les CGU. Toute sollicitation à
          caractère commercial est interdite sur ce site.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Création...' : 'Créer mon profil'}
        </button>
      </form>
    </div>
  );
}
