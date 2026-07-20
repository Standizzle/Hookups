-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatarEmoji",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

