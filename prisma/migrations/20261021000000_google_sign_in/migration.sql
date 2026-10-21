-- Preserve all existing accounts, credentials and roles.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleSubject" TEXT;
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE TABLE "OAuthAttempt" (
    "stateHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthAttempt_pkey" PRIMARY KEY ("stateHash")
);
CREATE INDEX "OAuthAttempt_expiresAt_idx" ON "OAuthAttempt"("expiresAt");
