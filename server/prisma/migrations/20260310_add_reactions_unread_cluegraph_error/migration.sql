-- CreateTable
CREATE TABLE "QuestionReaction" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" VARCHAR(8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionReaction_questionId_idx" ON "QuestionReaction"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionReaction_questionId_userId_key" ON "QuestionReaction"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "QuestionReaction" ADD CONSTRAINT "QuestionReaction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReaction" ADD CONSTRAINT "QuestionReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: ChannelMember - add lastReadChatAt
ALTER TABLE "ChannelMember" ADD COLUMN "lastReadChatAt" TIMESTAMP(3);

-- AlterTable: ClueGraph - add error tracking fields
ALTER TABLE "ClueGraph" ADD COLUMN "lastError" TEXT;
ALTER TABLE "ClueGraph" ADD COLUMN "lastErrorAt" TIMESTAMP(3);
