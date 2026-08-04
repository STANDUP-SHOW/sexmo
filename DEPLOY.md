# Déployer LibertineConnect en ligne

Trois briques à héberger séparément : une base PostgreSQL, le backend
(Express + Socket.io), et le frontend (Next.js). Ce guide utilise des offres
gratuites pour démarrer — suffisant pour tester le site en vrai, pas pour
une mise en production avec de vrais utilisateurs (voir le README, section
"À faire avant toute mise en production").

Le code est déjà sur GitHub : dépôt `STANDUP-SHOW/sexmo`, branche `main`.

---

## 1. Base de données + backend — [Railway](https://railway.app)

Railway héberge les deux dans un seul projet.

1. **New Project** → **Provision PostgreSQL** → Railway crée la base et
   expose automatiquement une variable `DATABASE_URL` dans le projet.
2. Dans le même projet : **New** → **GitHub Repo** → connectez votre compte
   GitHub → sélectionnez `STANDUP-SHOW/sexmo`, branche `main`.
3. Sur ce service, onglet **Settings** :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npx prisma generate`
   - **Start Command** : `npx prisma migrate deploy && node src/server.js`
4. Onglet **Variables** :
   - `DATABASE_URL` → référencez la variable exposée par le service
     PostgreSQL (Railway propose un bouton "Add Reference" pour la lier
     automatiquement plutôt que de la recopier à la main)
   - `JWT_SECRET` → une chaîne aléatoire longue et unique, générée par
     exemple avec `openssl rand -hex 32` (dans un terminal local) — ne
     réutilisez jamais un secret partagé ou trouvé ailleurs
   - `MIN_AGE` → `18`
   - `UPLOAD_DIR` → `./uploads`
   - `ANTHROPIC_API_KEY` → optionnel, active l'assistant IA de conversation
     (suggestions de messages) ; sans elle, cette fonctionnalité répond
     simplement "indisponible", le reste du site fonctionne normalement
   - `CORS_ORIGIN` → laissez temporairement `http://localhost:3100`, vous le
     corrigerez à l'étape 3 une fois l'URL Vercel connue
   - Ne définissez pas `PORT` manuellement — Railway le fournit automatiquement.
5. **Deploy**. Une fois en ligne, onglet **Settings** → **Networking** →
   **Generate Domain** pour obtenir une URL publique (ex.
   `https://libertine-api.up.railway.app`).
6. Ouvrez l'onglet **Shell** (ou lancez une commande one-off) et exécutez :
   `npm run seed` → crée le compte admin `admin@libertine.local` /
   `ChangeMe123!` (à changer après votre première connexion).

## 2. Frontend — [Vercel](https://vercel.com) (gratuit)

1. **Add New** → **Project** → importez le même dépôt GitHub, même branche.
2. **Root Directory** : `frontend`
3. **Environment Variable** : `NEXT_PUBLIC_API_URL` → l'URL Railway de
   l'étape 1 (ex. `https://libertine-api.up.railway.app`)
4. **Deploy**. Vercel vous donne une URL publique, ex.
   `https://libertine-connect.vercel.app` — **c'est votre lien à partager**.

## 3. Finir le câblage

1. Retournez dans Railway → variables d'environnement du service backend →
   mettez à jour `CORS_ORIGIN` avec l'URL Vercel obtenue à l'étape 2 →
   redéployez.
2. Ouvrez votre URL Vercel dans un navigateur : le site est en ligne.

---

## À savoir

- **Disque éphémère** : les photos uploadées (`UPLOAD_DIR`) sont perdues à
  chaque redéploiement sur Railway sans volume persistant — ajoutez un
  **Volume** (Settings → Volumes, montez-le sur `/app/uploads`) pour les
  conserver, ou migrez vers un bucket S3 (voir README, déjà noté comme point
  à corriger avant toute utilisation réelle).
- Ce reste un **MVP de démonstration** : la checklist "à faire avant mise en
  production" du README (vérification d'âge renforcée, modération de
  contenu automatisée, conformité RGPD) s'applique toujours avant d'inviter
  de vrais utilisateurs.
