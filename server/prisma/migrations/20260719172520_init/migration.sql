-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "pinHash" TEXT NOT NULL,
    "duressPinHash" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "region" TEXT NOT NULL DEFAULT 'ZA',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "consenterId" TEXT NOT NULL,
    "physicalIntimacy" BOOLEAN NOT NULL DEFAULT false,
    "kissingAffection" BOOLEAN NOT NULL DEFAULT false,
    "photosVideo" BOOLEAN NOT NULL DEFAULT false,
    "overnightStays" BOOLEAN NOT NULL DEFAULT false,
    "safeWord" TEXT NOT NULL DEFAULT '',
    "locationSharing" BOOLEAN NOT NULL DEFAULT false,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "placeName" TEXT,
    "ipHashA" TEXT,
    "ipHashB" TEXT,
    "deviceA" TEXT,
    "deviceB" TEXT,
    "signature" TEXT,
    "chainPrev" TEXT,
    "chainHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_shares" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "precision" TEXT NOT NULL DEFAULT 'exact',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "lastAcc" DOUBLE PRECISION,
    "lastPing" TIMESTAMP(3),

    CONSTRAINT "location_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_links" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sealedAt" TIMESTAMP(3),
    "unlinkedAt" TIMESTAMP(3),
    "unlinkedById" TEXT,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parental_links" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "minorId" TEXT NOT NULL,
    "permittedLevel" INTEGER NOT NULL DEFAULT 2,
    "locationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "autoCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "checkInWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parental_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_contacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "resolvedAt" TIMESTAMP(3),
    "notifiedContactIds" TEXT[],

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_recordId_key" ON "consent_records"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "location_shares_recordId_userId_key" ON "location_shares"("recordId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_links_linkId_key" ON "partner_links"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "parental_links_parentId_minorId_key" ON "parental_links"("parentId", "minorId");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_consenterId_fkey" FOREIGN KEY ("consenterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_shares" ADD CONSTRAINT "location_shares_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "consent_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_shares" ADD CONSTRAINT "location_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_links" ADD CONSTRAINT "partner_links_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_links" ADD CONSTRAINT "partner_links_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_links" ADD CONSTRAINT "parental_links_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_links" ADD CONSTRAINT "parental_links_minorId_fkey" FOREIGN KEY ("minorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_contacts" ADD CONSTRAINT "guardian_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "consent_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
