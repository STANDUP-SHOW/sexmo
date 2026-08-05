-- Le site s'appelle "sexmo" (domaine sexmo.fr) depuis le début du projet,
-- mais la ligne de personnalisation créée par le seed initial portait
-- encore l'ancien nom de travail "LibertineConnect". On aligne la valeur
-- par défaut de la colonne et, si personne n'a encore modifié le réglage
-- depuis le back-office, la ligne existante.
ALTER TABLE "site_settings" ALTER COLUMN "siteName" SET DEFAULT 'sexmo';

UPDATE "site_settings" SET "siteName" = 'sexmo' WHERE "siteName" = 'LibertineConnect';
