-- CreateEnum
CREATE TYPE "PrivatePhotosAccess" AS ENUM ('EVERYONE', 'ON_REQUEST');

-- CreateEnum
CREATE TYPE "AccessGrantStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "privatePhotosAccess" "PrivatePhotosAccess" NOT NULL DEFAULT 'ON_REQUEST';

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_access_grants" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "requesterProfileId" TEXT NOT NULL,
    "status" "AccessGrantStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "photo_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photo_access_grants_ownerProfileId_requesterProfileId_key" ON "photo_access_grants"("ownerProfileId", "requesterProfileId");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_grants" ADD CONSTRAINT "photo_access_grants_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_grants" ADD CONSTRAINT "photo_access_grants_requesterProfileId_fkey" FOREIGN KEY ("requesterProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
