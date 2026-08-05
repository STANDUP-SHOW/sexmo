CREATE TYPE "ExperienceLevel" AS ENUM ('DEBUTANT', 'AMATEUR', 'EXPERIMENTE', 'EXPERT');

ALTER TABLE "profiles" ADD COLUMN "experienceLevel" "ExperienceLevel";
