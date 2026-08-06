CREATE TYPE "SexRole" AS ENUM ('ACTIF', 'PASSIF', 'VERSA');

ALTER TABLE "profiles" ADD COLUMN "sexRole" "SexRole";
