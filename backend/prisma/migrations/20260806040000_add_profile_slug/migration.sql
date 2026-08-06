ALTER TABLE "profiles" ADD COLUMN "slug" VARCHAR(30);

CREATE UNIQUE INDEX "profiles_slug_key" ON "profiles"("slug");
