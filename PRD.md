# Hookups — Product Requirements Document

> **Version 1.1 · May 2026**
> Owner: Founder (South Africa) · Implementation: Claude Code + specialists
> Reference prototype: `Hookups App.html`
> Project context: `CLAUDE.md`

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial PRD |
| 1.1 | May 2026 | Brand identity locked (teal + pink palette, D1 logo, slogan). Live location sharing promoted to v1 scope (§9.12). Location sharing added to consent data model, API contracts, and acceptance criteria. Parental and duress location overrides documented. New §18 Brand Identity added. |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Users & Personas](#3-users--personas)
4. [v1 Launch Scope (SA-only)](#4-v1-launch-scope-sa-only)
5. [Deferred to v2 / v3](#5-deferred-to-v2--v3)
6. [Data Model](#6-data-model)
7. [API Contracts](#7-api-contracts)
8. [Authentication & PIN System](#8-authentication--pin-system)
9. [Core Flows — Detailed Specs](#9-core-flows--detailed-specs)
10. [Notifications](#10-notifications)
11. [Identity Verification](#11-identity-verification)
12. [Security & Cryptography](#12-security--cryptography)
13. [Compliance](#13-compliance)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Recommended Tech Stack](#15-recommended-tech-stack)
16. [Build Order](#16-build-order)
17. [Acceptance Criteria](#17-acceptance-criteria)
18. [Brand Identity](#18-brand-identity)

---

## 1. Executive Summary

Hookups is a mobile app (iOS + Android) that records mutual consent between adults before intimate encounters. Each consent is confirmed by both parties entering a secret 4-digit PIN known only to themselves, producing a tamper-resistant, timestamped, geo-located record stored in encrypted cloud storage.

**The core legal proposition:** a Hookups consent record demonstrates that both parties were conscious, in physical possession of their personal device, and actively chose to confirm — at a known time, in a known place. It is *not* a defence against rape or coercion, but it is meaningful evidence of mutual intent at the moment of confirmation. It can also serve as proof that consent was *not* given — supporting a victim's account or establishing innocence.

**The safety proposition:** Hookups also serves as a safety tool for teenagers and young adults — with parental controls, a duress PIN, trusted circle alerts, and live location sharing — making it a product parents can recommend to their children.

**Launch market:** South Africa only (POPIA jurisdiction, age of consent 16). Global rollout follows in Phase 2 (UK + EU) and Phase 3 (US).

---

## 2. Goals & Non-Goals

### Goals
- Reduce ambiguity in intimate encounters by creating a deliberate, mutual confirmation moment
- Produce records that hold up as supporting evidence in disputes
- Support proof of innocence when consent was granted — and proof of absence when it was not
- Protect minors via verified parental controls and tiered permissions
- Provide safety tools (Duress PIN, Trusted Circle alerts, live location sharing) for adults and minors alike
- Be respectful, friendly, and non-shaming in tone

### Non-Goals (v1)
- Acting as a substitute for legal advice
- Storing photos, video, or audio of any intimate activity
- Replacing or de-emphasising standard sex-ed messaging (use of condoms, communication, etc.)
- Public social features (feeds, profiles browsable by strangers)
- Dating-app discovery
- AI-generated content of any kind

---

## 3. Users & Personas

### P1 — "Adult Initiator" (primary)
Age 18+. Wants to record consent before intimacy. Comfortable with apps. Cares about clarity and legal protection.

### P2 — "Adult Consenter"
Receives a request. May or may not be a regular user. Needs the consent experience to be quick, dignified, and reversible.

### P3 — "Minor User" (13–17)
Cannot use the app without a verified parent linked. Permitted Level 1–2 activity (hand-holding, kissing) by default. Needs safety tooling, especially Duress PIN and location sharing.

### P4 — "Parent / Guardian"
Verifies identity to link a minor account. Sets boundary levels. Receives alerts for over-limit requests, location changes, missed check-ins. May actively recommend Hookups to their teenager as a safety tool.

### P5 — "Trusted Circle Contact"
Designated by an adult user as an emergency contact. Receives Guardian Alerts and Duress PIN-triggered notifications including live location.

---

## 4. v1 Launch Scope (SA-only)

| Feature | Spec section |
|---|---|
| Email / phone signup + login | §9.1 |
| 4-digit PIN setup (personal + duress) | §8 |
| Age gate (18+ verification with selfie + ID) | §11 |
| Home dashboard with active consent banner | §9.3 |
| Smart Connect (Bluetooth LE scan + auto-method) | §9.4 |
| Consent flow with NFC / AirDrop / QR fallbacks | §9.4 |
| Consenter disclosure step (relationship status) | §9.4 |
| Consent record with full metadata | §6 |
| Live activity logs | §9.5 |
| Revoke / Change of Mind | §9.6 |
| Profile with Linked Partners | §9.7 |
| Duress PIN (silent alert) | §9.8 |
| Trusted Circle / Guardian Alerts | §9.9 |
| Parental Controls (Levels 1–5) | §9.10 |
| Live Location Sharing during consent | §9.12 |
| Push + SMS notifications | §10 |
| Encrypted cloud backup | §12 |
| PDF / CSV export with access code | §9.11 |

---

## 5. Deferred to v2 / v3

**v2:**
- Relationship Partner upgrade (mutual PIN, status types, transparency modes)
- Hall Pass with expiry + pre-approved partners
- Public relationship visibility to third parties
- UK + EU expansion (GDPR + UK Online Safety Act compliance)
- Multi-language (Afrikaans, Zulu, French, Spanish, Arabic)

**v3:**
- US expansion (Delaware C-Corp + state-specific compliance)
- Voice consent confirmation (Web Speech / on-device ML)
- Apple Watch / Wear OS quick actions
- Court-admissible attestation by a notary partner

---

## 6. Data Model

### Core entities (PostgreSQL — illustrative TypeScript interfaces)

```ts
interface User {
  id: UUID;
  email: string;            // unique, encrypted at rest
  phone: string;            // E.164, encrypted at rest
  fullName: string;         // encrypted at rest
  dateOfBirth: Date;        // encrypted at rest
  verifiedAt: Date | null;  // ID + selfie passed
  pinHash: string;          // bcrypt(salt + pin) — PIN never stored
  duressPinHash: string | null;
  region: 'ZA' | 'UK' | 'EU' | 'US' | 'OTHER';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  deletedAt: Date | null;
}

interface ConsentRecord {
  id: UUID;                                   // immutable
  recordId: string;                           // e.g. "#PRV-20260504-0089"
  requesterId: UUID;
  consenterId: UUID;
  terms: {
    physicalIntimacy: boolean;
    kissingAffection: boolean;
    photosVideo: boolean;
    overnightStays: boolean;
    safeWord: string;
    locationSharing: boolean;                 // true only if BOTH parties agreed
  };
  method: 'nfc' | 'airdrop' | 'qr' | 'manual';
  startedAt: Date;                            // UTC
  expiresAt: Date;                            // UTC
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    placeName: string | null;
  };
  devices: { a: DeviceFingerprint; b: DeviceFingerprint };
  ipHashA: string;                            // sha256(salt + ip), salt rotates yearly
  ipHashB: string;
  consenterPinVerifiedAt: Date;               // server-authoritative
  requesterPinVerifiedAt: Date;               // server-authoritative
  signature: string;                          // ed25519 signature over canonical JSON
  status: 'active' | 'mutual' | 'expired' | 'revoked';
  revokedAt: Date | null;
  revokedBy: UUID | null;
  revokeReason: string | null;
  chainPrev: string | null;                   // hash of previous record (audit chain)
  chainHash: string;                          // hash of this record + chainPrev
}

interface LocationShare {
  id: UUID;
  recordId: UUID;                             // FK to ConsentRecord
  userId: UUID;                               // who is sharing
  startedAt: Date;
  endedAt: Date | null;
  precision: 'exact' | 'block';              // exact = ±5m, block = ±200m grid snap
  lastPing: { lat: number; lng: number; accuracy: number; at: Date };
}

interface PartnerLink {
  id: UUID;
  linkId: string;                             // e.g. "#LNK-20260510-0042"
  userA: UUID;
  userB: UUID;
  sealedAt: Date;
  unlinkedAt: Date | null;
  unlinkedBy: UUID | null;
  cooldownUntil: Date | null;                 // 24h after unlinking
}

interface ParentalLink {
  id: UUID;
  parentId: UUID;
  minorId: UUID;
  permittedLevel: 1 | 2 | 3 | 4 | 5;
  overrideRequired: boolean;                  // for levels 3+
  locationAlerts: boolean;
  autoCheckIn: boolean;
  checkInWindowMinutes: number;               // default 10
  verifiedAt: Date;
  status: 'active' | 'expired';
}

interface GuardianContact {
  id: UUID;
  userId: UUID;
  name: string;                               // encrypted at rest
  phone: string;                              // encrypted at rest
  relation: 'parent' | 'sibling' | 'friend' | 'partner' | 'other';
  isPrimary: boolean;
  verifiedAt: Date | null;
}

interface AlertEvent {
  id: UUID;
  userId: UUID;
  type: 'duress' | 'silent_checkin' | 'come_get_me' | 'emergency' | 'parental_override' | 'missed_checkin';
  triggeredAt: Date;
  location: GeoPoint;
  resolvedAt: Date | null;
  notifiedContactIds: UUID[];
}

interface ActivityLogEntry {
  id: UUID;
  userId: UUID;
  type: 'registration' | 'consent_request' | 'consent_confirmed' | 'consent_revoked' | 'link' | 'unlink' | 'duress_pin_set' | 'parent_link_sent' | 'parent_perms_set' | 'parent_setup_done';
  title: string;
  actor: string;
  metadata: JSONB;
  createdAt: Date;
}
```

### Tamper-evidence
- All consent records are signed at creation with the server's ed25519 key.
- Each record stores `chainPrev` (hash of the immediately prior record for that user pair) and `chainHash` (its own canonical hash). Append-only audit chain — any retrospective edit breaks the chain.
- Records are *never* updated; revocations are stored as new records that reference the original.

---

## 7. API Contracts

REST + JSON. All endpoints require Bearer JWT except `/auth/*`.

```
POST   /auth/signup              { email, phone, fullName, dateOfBirth }
POST   /auth/verify-phone        { phone, otpCode }
POST   /auth/verify-id           { onfidoApplicantId, signedResult }
POST   /auth/set-pin             { pin, duressPin }
POST   /auth/login               { emailOrPhone, password }
POST   /auth/login-pin           { userId, pin }    // returns { jwt, isDuress: bool }

GET    /me                       → User
PATCH  /me                       { fullName?, photoUrl?, ... }
DELETE /me                       (POPIA "right to erasure")

POST   /consent/request          { partnerId, terms, expiresAt, location, method }
POST   /consent/:id/confirm      { pin }
POST   /consent/:id/revoke       { pin, reason?, note? }
GET    /consent/:id              → ConsentRecord
GET    /consent                  ?userId&status&from&to&limit

POST   /consent/:id/location/share/start   { precision }
POST   /consent/:id/location/share/ping    { lat, lng, accuracy }   // every 30s
POST   /consent/:id/location/share/stop
GET    /consent/:id/location               // poll partner's last ping

POST   /partners/link            { partnerId }
POST   /partners/link/:id/accept { pin }
DELETE /partners/link/:id        { pin }

POST   /guardian/contacts        { name, phone, relation }
GET    /guardian/contacts        → GuardianContact[]
DELETE /guardian/contacts/:id

POST   /alerts/duress            { location }
POST   /alerts/guardian          { type, location }

POST   /parental/link            { minorPhoneOrEmail, parentIdVerified }
POST   /parental/link/:id/accept
PATCH  /parental/link/:id        { permittedLevel, locationAlerts, ... }

GET    /logs                     ?type&from&to&limit
POST   /logs/export              { accessCode, format: 'pdf'|'csv' }

POST   /smart-connect/advertise
POST   /smart-connect/scan
```

All responses include `requestId`. Write endpoints return `200 + body` or `4xx + { error, code }`.

---

## 8. Authentication & PIN System

### PIN rules
- Exactly 4 digits, numeric only.
- Stored as bcrypt hash with per-user salt (cost factor 12+).
- Never logged, never sent to analytics, never returned by any API.
- Server-authoritative verification only.
- Rate-limited: 5 attempts/min/device + 20/hr/account. Lock after 10 failed attempts until email-verified reset.

### Duress PIN
- A second, separate 4-digit PIN. Must not equal the personal PIN.
- When entered anywhere a normal PIN is expected, server returns identical success response but silently triggers `POST /alerts/duress`.
- **Location override:** duress PIN silently activates live location sharing toward all Trusted Circle contacts, regardless of whether the user agreed to location sharing in the current consent.
- No UI difference whatsoever. Verified by security engineer pre-launch.

### Sessions
- JWT, 24-hour expiry, refresh token 30 days.
- One active session per device. New device requires PIN reconfirmation.

---

## 9. Core Flows — Detailed Specs

### 9.1 Onboarding & Login

**Onboarding:**
1. Splash → "Create Free Account"
2. Name (2–60 chars) → Phone OTP (Twilio) → Email (optional) → PIN setup → Confirmation

**Login:**
- Email/phone + password → `POST /auth/login`
- OR PIN on trusted device → `POST /auth/login-pin`

### 9.2 Age Gate

1. DOB entry → server-side age calculation
2. Under 18 → `minor_block`: kind copy, Childline SA (`116`), "Is your parent registered on Hookups?" CTA
3. 18+ → selfie + ID via Onfido → `verifiedAt` stamped on pass

### 9.3 Home

- Greeting + avatar
- **Active consent banner** (teal) → "View Terms" + "I've Changed My Mind"
- Quick actions: New Consent · Add Partner · My QR · View Logs
- Recent activity (last 5 entries)
- Bottom nav: Home · Consent · Logs · Profile

### 9.4 Consent Flow

#### Role select
Two cards: "I'm Requesting" / "I'm Consenting".

#### Requester — Smart Connect
1. Bluetooth LE scan (2–5s) for nearby Hookups users
2. Shows detected device: name + OS + signal
3. Auto-selects method: iOS→iOS → AirDrop · Android→Android → NFC · Cross-OS → QR
4. Method screen with teal-to-pink animated pulse rings

#### Method screens
- **NFC:** teal-to-pink animated pulsing rings; writes Hookups URI via Core NFC / Android NFC
- **AirDrop:** iOS Multipeer Connectivity
- **QR:** SVG QR code with Hookups invite URI

All methods deliver `hookups://consent/REQUEST_ID` to the consenter's device.

#### Manual fallback
Three explicit method cards shown if Smart Connect fails or user opts out.

#### Consenter path
1. Receives request via NFC / AirDrop / QR
2. **Disclosure screen:** requester name + verified badge + terms + safe word + expiry
3. **Location sharing disclosure** (if included): "Alex is also requesting live location sharing. You can agree to intimacy terms without agreeing to location sharing." — shown as a separate, independently toggleable item
4. **Relationship disclosure** (v2 slot exists, empty in v1)
5. PIN entry → server verification
6. Success → "Consent Confirmed!" with record ID, expiry, method
7. Duress PIN → identical success UI, silent alert triggered, location sharing activated toward Trusted Circle

#### Wrong PIN
Up to 5 attempts. Each: "Incorrect PIN — this attempt has been logged." After 5: account locked 5 min, partner notified attempt failed.

### 9.5 Logs

- Live feed from `GET /logs`
- Filterable: type, partner, date range
- Entry: icon, title, status badge (teal=Sealed · amber=Pending · red=Revoked), actor, record ID, time
- Tap → detail view: record ID, timestamp, expiry, location, device IDs, IP hash, method, terms
- Export button → §9.11

### 9.6 Revoke / Change of Mind

1. Warning: red card listing consequences
2. Reason picker (radio, reason never shared with partner)
3. Notifying animation
4. Done: red ✓, record card with revoke timestamp + ID

### 9.7 Profile

Tabs: Profile / Boundaries / History.
- ID card: teal gradient, avatar, name, verified badges, stats
- Linked Partners, Privacy toggles, Relationship Partner CTA (v2)
- Boundaries: default consent toggles, Safe Word editor
- History: chronological consent records

### 9.8 Duress PIN Setup

1. Intro: explains what triggers (silent SMS + push, live location to Trusted Circle)
2. Set duress PIN (4 digits, must differ from personal PIN)
3. Confirm
4. Done screen with status card

### 9.9 Trusted Circle / Guardian Alerts

- Manage contacts: name, phone, relation, primary flag
- SMS verification of each contact
- One-tap alert: 🤫 Silent Check-In · 🚗 Come Get Me · 🚨 Emergency Help Now (+ 10111 SA prompt)

### 9.10 Parental Controls

**Parent setup:**
1. Onfido identity verification (parent-tier, stricter than adult)
2. Link request to minor by phone/email
3. Minor accepts in their app
4. Parent sets permitted level, location alerts, check-in window (default 10 min)
5. Parent sets own personal PIN + duress PIN

**During minor's use:**
- Server-blocks consent above permitted level
- Parent receives push + email: full metadata for every block, override request, location change, missed check-in
- Minor's Duress PIN alerts → parent first, then Trusted Circle
- **At Level 3+:** parent automatically receives location pings when minor has active location sharing, regardless of minor's sharing preference

### 9.12 Live Location Sharing

**Purpose:** Mutual visibility during active consent for safety. Key tool for teens + parental oversight.

**Activation:**
- Offered as an optional bundled term during consent request
- Both parties must agree **independently** at PIN step — one declining does not block the consent
- Auto-starts on `status: 'mutual'`, auto-stops at `expiresAt` or on revoke

**Behaviour:**
- **Asymmetric** — either party pauses their own sharing at any time; other party notified
- **Precision toggle** — Exact (±5m) or City Block (±200m) per user
- **Quick actions** — "I've Arrived" and "ETA Update" log timestamped events to the consent record
- **Live map** (`livemap` screen) — both pins, distance + ETA pill, sharing controls

**Privacy & safety:**
- Pings stored for duration of active consent + 24h only, then deleted
- NOT included in PDF/CSV exports (ephemeral data, not legal evidence)
- City Block precision snaps to 200m grid server-side before forwarding
- Either party stopping sharing: logged as activity entry, other party gets push notification
- **Duress override:** duress PIN silently activates location sharing toward all Trusted Circle contacts
- **Parental override:** at Level 3+, parent automatically added as recipient

### 9.11 Export with Access Code

1. 6-digit access code sent via email or SMS on demand
2. Code entry screen (expires 5 min after unlock)
3. Export options: Full PDF · CSV · Single Record
4. Server generates signed PDF/CSV with all metadata + tamper-evident chain hash
5. Location ping history **not** included (ephemeral)

---

## 10. Notifications

| Trigger | Recipient | Channel | Priority |
|---|---|---|---|
| Consent request received | Consenter | push + in-app | high |
| Consent mutually confirmed | Both | push + in-app | normal |
| Consent revoked | Other party | push + in-app | high |
| Consent expiring in 30 min | Both | push | normal |
| Location sharing started | Both | push | normal |
| Location sharing stopped by partner | Other party | push | normal |
| Location changed during active consent | Both | push | normal |
| Linked partner accepted | Requester | push + in-app | normal |
| Parental override required | Parent | push + email | high |
| Missed check-in | Parent | push + SMS | high |
| Duress PIN triggered | Guardians | SMS + push | critical |
| Guardian alert sent | Guardians | SMS + push | critical |

SMS (Twilio): all critical/high alerts + push fallback. Never includes sensitive details — always deep-links to app.

Email (Postmark / SES): signup verification, password reset, export access code, parental link, weekly safety summary (opt-in).

---

## 11. Identity Verification

**Vendor:** Onfido (preferred) or Veriff. Decide before backend build.

**Flow:** Selfie → government ID → liveness + ID match + age extraction → webhook → `verifiedAt` stamped.

**Data retention:** Vendor stores selfie + ID (auto-delete 24h post-verification per POPIA). We store: vendor applicant ID, pass/fail timestamp, document type, document country only.

**Cost:** ~£0.50–£3 per verification. Budget accordingly.

---

## 12. Security & Cryptography

- **Encryption at rest:** PII with AWS KMS envelope encryption. Consent records with per-record data keys + HSM master key.
- **Encryption in transit:** TLS 1.3 only, HSTS, certificate pinning.
- **Tamper evidence:** ed25519 signatures at creation, append-only audit chain, Merkle root published to OpenTimestamps.
- **PIN security:** bcrypt cost ≥ 12, per-user salt, constant-time comparison, server-side rate limiting.
- **Audit logging:** all admin access + all API calls logged with `requestId`, retained 90 days.
- **Security review:** mandatory pre-launch independent engineer review. Budget £5k–£15k.

---

## 13. Compliance

### POPIA (v1 — South Africa)
- Appoint Information Officer (founder by default)
- Lawful basis: consent + legitimate interest
- Right to access + erasure: `/me` GET + DELETE
- 72-hour breach notification to Information Regulator
- DPAs with Twilio, Onfido, AWS
- Section 35 (minors): require verifiable parental consent

### GDPR + UK OSA (Phase 2)
- Separate AWS region per market
- Highly effective age verification (Onfido qualifies for UK OSA)
- Right to data portability — machine-readable export endpoint

### App Store
- Apple submission justification: safety + legal-protection tool, no adult content, no nudity in screenshots
- Google Play: same justification

### Age verification
- SA: 16 · UK: 16 (OSA: 18 for adult content) · EU: 14–18 (varies)
- Hookups: 18+ for Level 3+. Levels 1–2 permitted ages 13–17 with verified parental link. No accounts below 13.

### Terms of Service & Privacy Policy
SA tech lawyer (Michalsons / Webber Wentzel / ENSafrica). Explicit clauses: no warranty as legal evidence, no liability for misuse, SA jurisdiction.

---

## 14. Non-Functional Requirements

| Concern | Target |
|---|---|
| Cold-start time | ≤ 2.5s on iPhone 12 / Pixel 5 |
| Consent confirmation latency | ≤ 1.5s from PIN entry to confirmation |
| Push notification delivery | ≤ 5s 95th percentile |
| API uptime | 99.9% |
| Crash-free sessions | ≥ 99.5% |
| Accessibility | WCAG 2.1 AA; VoiceOver + TalkBack; 44pt min tap target |
| Offline behaviour | Login + PIN work offline for cached partners; records sync on reconnect |
| Battery impact | Bluetooth scanning capped at 30s per Smart Connect session |
| App size | ≤ 60MB initial download |
| Localisation | English (v1) · Afrikaans + isiZulu (v1.1) · FR + ES + AR (v2) |

---

## 15. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Mobile** | React Native + Expo (managed) | One codebase, both platforms, native NFC/AirDrop modules |
| **Backend** | Node.js + Fastify + Prisma | TypeScript ecosystem; type-safe DB access |
| **Database** | PostgreSQL (Supabase or AWS RDS) | Row-level encryption, multi-region |
| **Auth** | Custom (JWT + bcrypt) | Dual PIN + duress logic requires custom handling |
| **Push** | FCM + APNs via Expo | Standard, free |
| **SMS** | Twilio | Best SA + global coverage |
| **Email** | Postmark or AWS SES | Reliable transactional |
| **ID verification** | Onfido | Global, POPIA-compatible |
| **Hosting** | AWS af-south-1 (Cape Town) | POPIA data residency |
| **CDN** | Cloudflare | Free tier covers v1 |
| **Error tracking** | Sentry | Standard |
| **Analytics** | PostHog (self-hosted) | POPIA-friendly, no third-party data sharing |
| **CI/CD** | GitHub Actions + Expo EAS | Standard |

---

## 16. Build Order

### Phase 1 — Foundation (weeks 1–3)
1. Backend: Fastify + Prisma + Postgres + JWT auth
2. User model + signup + login endpoints
3. PIN hashing + verification + rate limiting
4. Mobile skeleton: React Native + Expo + navigation
5. Login + Onboarding screens wired to backend

### Phase 2 — Consent Core (weeks 4–8)
6. Consent record data model + signing
7. `POST /consent/request` + `POST /consent/:id/confirm`
8. Mobile: Role select → Methods → PIN → Confirmation
9. Push notifications
10. Active consent banner + Revoke flow

### Phase 3 — Smart Connect + Methods (weeks 9–12)
11. Bluetooth LE advertise + scan (`react-native-ble-plx`)
12. AirDrop (iOS Multipeer Connectivity)
13. NFC (`react-native-nfc-manager`)
14. Manual fallback

### Phase 4 — Safety (weeks 13–16)
15. Duress PIN + silent alert handler
16. Trusted Circle contacts + SMS verification
17. Guardian Alert flow
18. Identity verification with Onfido

### Phase 5 — Parental + Logs + Export + Location (weeks 17–20)
19. Parental Controls (parent + minor sides)
20. Live activity logs
21. Export with access code + signed PDF
22. Account deletion + POPIA right to erasure
23. Live location sharing: start/ping/stop endpoints + livemap screen

### Phase 6 — Polish + Launch (weeks 21–24)
24. Localisation (Afrikaans)
25. Accessibility audit
26. Security review
27. App Store + Play Store submission
28. Closed beta (50 SA users)
29. Public SA launch

---

## 17. Acceptance Criteria

### Login
- [ ] Signup with email + phone, OTP verification
- [ ] PIN setup with mismatch rejection
- [ ] Duress PIN setup; server rejects if equal to personal PIN
- [ ] Login with email/phone + password
- [ ] PIN login on trusted device
- [ ] Lock after 10 failed attempts
- [ ] Duress PIN succeeds silently, triggers `/alerts/duress`

### Consent flow
- [ ] Smart Connect detects nearby Hookups users via Bluetooth
- [ ] Auto-selects method based on both OSes
- [ ] Manual fallback works for all three transports
- [ ] Consenter sees full terms + disclosure before PIN
- [ ] Location sharing shown as separately toggleable term
- [ ] Consenter can agree to intimacy but decline location sharing independently
- [ ] Correct PIN creates `mutual` record; wrong PIN shows error
- [ ] Both parties receive push on confirmation
- [ ] Active consent banner shows with expiry countdown
- [ ] Revoke flow notifies other party, creates revocation record

### Location sharing
- [ ] Activates automatically when both parties agree at PIN step
- [ ] Either party can stop sharing without revoking consent
- [ ] Both parties notified when the other stops sharing
- [ ] Precision toggle (exact / city block) works correctly server-side
- [ ] Pings deleted after consent expiry + 24h
- [ ] Location ping history not included in exports
- [ ] Duress PIN silently activates location sharing toward Trusted Circle
- [ ] Minor at Level 3+: parent automatically receives pings

### Records & Logs
- [ ] Every confirmed consent creates signed record with all metadata
- [ ] `terms.locationSharing` correctly reflects mutual agreement
- [ ] Audit chain correctly populated
- [ ] Logs screen live from API; tapping shows full detail
- [ ] Export generates signed PDF + CSV

### Safety
- [ ] Duress PIN triggers SMS + push to Trusted Circle within 5s
- [ ] Duress PIN activates location sharing toward Trusted Circle silently
- [ ] Guardian Alert sends location + message
- [ ] Trusted Circle SMS verification works
- [ ] No log entry differentiates duress from normal to any observer

### Parental
- [ ] Parent identity verification stricter than adult tier
- [ ] Parent can link to minor; minor accepts in app
- [ ] Minor's app blocks consent above permitted level
- [ ] Level 3 override request flows to parent before consent proceeds
- [ ] Parent receives full metadata for every block / override / location change / missed check-in
- [ ] At Level 3+, parent automatically receives location pings
- [ ] Minor's duress PIN alerts route to parent first

### Compliance
- [ ] `/me` GET returns all user data
- [ ] `/me` DELETE anonymises user; consent records become stubs
- [ ] All PII encrypted at rest with KMS
- [ ] TLS 1.3 + certificate pinning enforced
- [ ] All API calls logged with requestId, retained 90 days
- [ ] ToS + Privacy Policy accepted at signup, version-tracked

### Production readiness
- [ ] Security engineer sign-off on crypto, PIN handling, duress flow
- [ ] SA tech lawyer sign-off on ToS, Privacy Policy, POPIA
- [ ] App Store + Play Store submissions accepted
- [ ] 50-user closed beta with no critical bugs in final week
- [ ] Crash-free sessions ≥ 99.5% across beta
- [ ] Push delivery ≥ 95% within 5s

---

## 18. Brand Identity

### Name
**Hookups** — "Safety. Always!"

### Logo mark (D1 — locked May 2026)
Two smartphone outlines animated toward each other:
- Left device: teal stroke (`#0D9488`)
- Right device: pink stroke (`#EC4899`)
- Contact point: teal-to-pink gradient pulse ring (`linear-gradient(90deg, #2DD4BF, #EC4899)`)
- Pulse ring animates outward from contact point — mirrors the Smart Connect UI gesture in the app

### Wordmark
`hookups` in Plus Jakarta Sans medium weight. `hook` in body text colour. `u` in `--teal-400` (`#2DD4BF`). `ps` in `--pink-500` (`#EC4899`).

### Slogan
*Safety. Always!*

### App icon
Both phone outlines + gradient dot at centre. Rings reduce at 48px, drop entirely at 32px.

### Colour system

| Token | Hex | Role |
|---|---|---|
| `--teal-600` | `#0D9488` | Primary — all consent actions |
| `--teal-400` | `#2DD4BF` | Pulse accent, active indicators |
| `--teal-200` | `#99F6E4` | Sealed state backgrounds |
| `--pink-500` | `#EC4899` | Relationship + intimacy layer |
| `--pink-300` | `#F9A8D4` | Soft pink surfaces |
| `--dark-base` | `#0D1F1E` | Primary dark background |
| `--amber` | `#F59E0B` | Pending state |
| `--red` | `#EF4444` | Revoked / danger |
| Gradient | `#2DD4BF → #EC4899` | Contact moment + seal confirmation |

### Typography
- **Primary:** `'Plus Jakarta Sans', sans-serif`
- **Mono:** `'Space Mono'` for record IDs, hashes, timestamps

### Brand voice
Clear · Mutual · Trustworthy · Empowering. No shame, no jargon. Friendly enough for a 16-year-old, serious enough for a courtroom.

---

## Appendix A: Open Decisions

1. **Legal entity** — register SA Pty Ltd before launch. Required for App Store business distribution.
2. **Hosted region** — confirm `af-south-1` (Cape Town) or `eu-west-1` with explicit user consent.
3. **Identity verification vendor** — Onfido vs Veriff. Get quotes before backend build starts.
4. **Subscription pricing** — free at launch? Freemium with PIN backup as paid? Decide before App Store submission.
5. **Beta recruitment** — universities, sex-ed communities, intimate-partner-violence support orgs?
6. **Brand voice for SA market** — English-UK leaning currently. Consider SA English tone.

---

## Appendix B: References

- Prototype: `Hookups App.html`
- Project context: `CLAUDE.md`
- POPIA: https://popia.co.za
- UK Online Safety Act: https://www.gov.uk/government/publications/online-safety-act-explainer
- Onfido docs: https://documentation.onfido.com
- Apple App Review guidelines: https://developer.apple.com/app-store/review/guidelines/

---

*This document is a living spec. Every feature shipped should reference back to its acceptance criteria here. Disagreements during build are settled by amending this document, not by verbal agreement.*
