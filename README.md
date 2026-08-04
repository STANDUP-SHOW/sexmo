# LibertineConnect

Application de rencontre pour adultes consentants (célibataires et couples ouverts d'esprit),
partout en France.

> Il ne s'agit pas d'un site d'escorting / de travail sexuel : aucun paiement n'est lié à une
> rencontre. Toute sollicitation à caractère commercial doit être signalée et entraîne un bannissement.

## Architecture

```
.
├── backend/     API REST (Express) + PostgreSQL (Prisma) + Socket.io
└── frontend/    Application web (Next.js 14, App Router) + Tailwind CSS
```

**Stack :** Node.js/Express, Prisma ORM, PostgreSQL, JWT, Socket.io (messagerie temps réel),
Zod (validation), Multer (upload photos), Next.js App Router, Tailwind CSS.

**Modèle de données** (`backend/prisma/schema.prisma`) : `User`, `Profile`, `Photo`, `Like`,
`Match`, `Conversation`/`Message`, `Report`, `BlockedProfile`.

## Fonctionnalités incluses (MVP)

| Fonctionnalité | Statut |
|---|---|
| Inscription / connexion, JWT | ✅ |
| Vérification d'âge déclarative (18+ obligatoire, rejet serveur) | ✅ |
| Profils : pseudo, genre, orientation, recherché, ville, bio | ✅ |
| Jusqu'à 20 photos par profil, avec file de modération | ✅ |
| Recherche / filtres (ville, genre, âge) sur les grandes villes de France | ✅ |
| Likes mutuels → match → conversation | ✅ |
| Messagerie temps réel (Socket.io) | ✅ |
| Signalement de profil + blocage | ✅ |
| Back-office modération (photos, signalements, bannissement) (`/admin`) | ✅ |
| Recadrage photo avant envoi | ✅ |
| Distance approximative (arrondie, ville à ville) entre profils déjà matchés | ✅ |
| Badges de réputation (ancienneté, taux de réponse, "membre exemplaire") — calculés sur des données existantes, sans IA | ✅ |
| Score de qualité de profil + suggestions d'amélioration — règles déterministes, sans IA | ✅ |
| Assistant IA de conversation (suggestions de messages via l'API Claude, optionnel) | ✅ |
| Vérification d'identité forte (KYC), paiement, notifications e-mail | ⏳ non inclus |

## ⚠️ À faire avant toute mise en production

Ce projet est un **point de départ technique**, pas un produit conforme prêt à être lancé.
Avant d'ouvrir le site à de vrais utilisateurs en France, il faut impérativement :

1. **Vérification d'âge robuste** — la case à cocher + date de naissance ne suffit pas
   légalement pour un site à caractère adulte. Intégrer une solution de vérification d'âge
   tierce conforme aux référentiels CNIL/ARCOM (double anonymat, aucune photo d'ID stockée
   par la plateforme elle-même).
2. **Modération de contenu renforcée** — la file d'attente manuelle du MVP doit être doublée
   d'un scan automatique (détection de nudité non consentie, de contenu impliquant des mineurs,
   hashs connus type PhotoDNA/CSAM) *avant* publication, pas seulement après signalement.
3. **RGPD** — les données de genre/orientation sont des données "sensibles" au sens RGPD :
   base légale de traitement (consentement explicite déjà recueilli à l'inscription), registre
   de traitement, chiffrement au repos, politique de conservation/suppression, DPO si le volume
   le justifie.
4. **CGU / CGV** claires interdisant explicitement toute offre commerciale à caractère sexuel,
   avec application effective (bannissement automatique en cas de signalement confirmé).
5. **Hébergement des photos** — remplacer le stockage disque local (`uploads/`) par un bucket
   S3/Cloud privé avec URLs signées, en particulier pour les photos marquées `isPrivate`.
6. **Signalement "mineur suspecté" et "contenu illégal"** — actuellement stocké en base comme
   les autres motifs ; brancher une alerte immédiate vers l'équipe de modération humaine.

## Démarrage rapide

### 1. Base de données

```bash
docker compose up -d          # PostgreSQL sur localhost:5434
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed                  # crée un compte admin
npm run dev                   # http://localhost:4100
```

Compte admin créé par le seed : `admin@libertine.local` / `ChangeMe123!` (à changer).

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3100
```
