CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "authorUserId" TEXT,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_messages_department_createdAt_idx" ON "chat_messages"("department", "createdAt");

CREATE TABLE "chat_bans" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_bans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
