-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transparencyMode" TEXT NOT NULL DEFAULT 'private',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sealedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_pass_entries" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "approvedUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_pass_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_approvals" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "consentRecordId" TEXT NOT NULL,
    "requestingUserId" TEXT NOT NULL,
    "thirdPartyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "relationship_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hall_pass_entries_relationshipId_approvedUserId_key" ON "hall_pass_entries"("relationshipId", "approvedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "relationship_approvals_consentRecordId_relationshipId_key" ON "relationship_approvals"("consentRecordId", "relationshipId");

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_pass_entries" ADD CONSTRAINT "hall_pass_entries_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_pass_entries" ADD CONSTRAINT "hall_pass_entries_approvedUserId_fkey" FOREIGN KEY ("approvedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_approvals" ADD CONSTRAINT "relationship_approvals_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "relationships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_approvals" ADD CONSTRAINT "relationship_approvals_consentRecordId_fkey" FOREIGN KEY ("consentRecordId") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

