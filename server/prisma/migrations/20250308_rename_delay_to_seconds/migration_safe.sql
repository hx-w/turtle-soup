-- DropIndex
DROP INDEX IF EXISTS "Channel_createdAt_idx";

DROP INDEX IF EXISTS "Channel_status_idx";

-- AlterTable
ALTER TABLE "Channel" RENAME COLUMN "aiHostDelayMinutes" TO "aiHostDelaySeconds";

ALTER TABLE "Channel" ALTER COLUMN "aiHostDelaySeconds" SET DEFAULT 60;

UPDATE "Channel" SET "aiHostDelaySeconds" = "aiHostDelaySeconds" * 60;

-- CreateIndex
CREATE INDEX "Channel_createdAt_idx" ON "Channel"("createdAt");

CREATE INDEX "Channel_status_idx" ON "Channel"("status");
