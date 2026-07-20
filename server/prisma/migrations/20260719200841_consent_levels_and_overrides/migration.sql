-- AlterTable
ALTER TABLE "consent_records" DROP COLUMN "physicalIntimacy",
ADD COLUMN     "holdingHandsHugging" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sexualIntimacy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "touchingAboveClothing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "touchingUnderClothing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "parental_overrides" (
    "id" TEXT NOT NULL,
    "parentalLinkId" TEXT NOT NULL,
    "consentRecordId" TEXT NOT NULL,
    "requestedLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "parental_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parental_overrides_consentRecordId_parentalLinkId_key" ON "parental_overrides"("consentRecordId", "parentalLinkId");

-- AddForeignKey
ALTER TABLE "parental_overrides" ADD CONSTRAINT "parental_overrides_parentalLinkId_fkey" FOREIGN KEY ("parentalLinkId") REFERENCES "parental_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_overrides" ADD CONSTRAINT "parental_overrides_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

