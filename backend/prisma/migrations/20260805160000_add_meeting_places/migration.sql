CREATE TYPE "PlaceType" AS ENUM ('SAUNA', 'LOVE_SHOP', 'HAMMAM', 'BAR', 'CLUB_VIDEO', 'CINEMA');

CREATE TABLE "meeting_places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PlaceType" NOT NULL,
    "department" TEXT NOT NULL,
    "city" TEXT,
    "description" VARCHAR(500),
    "addedByUserId" TEXT NOT NULL,
    "moderationStatus" "PhotoModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_places_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "meeting_places_department_type_idx" ON "meeting_places"("department", "type");

ALTER TABLE "meeting_places" ADD CONSTRAINT "meeting_places_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
