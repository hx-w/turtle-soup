-- RenameColumn
ALTER TABLE "Channel" RENAME COLUMN "aiHostDelayMinutes" TO "aiHostDelaySeconds";

-- UpdateDefault
ALTER TABLE "Channel" ALTER COLUMN "aiHostDelaySeconds" SET DEFAULT 60;

-- MigrateData: Convert minutes to seconds (multiply by 60)
UPDATE "Channel" SET "aiHostDelaySeconds" = "aiHostDelaySeconds" * 60;
