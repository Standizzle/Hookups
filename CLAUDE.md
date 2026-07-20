# Hookups — Project Brief

> **A mutual-consent recording app for intimate adult encounters.**
> PIN-based confirmation proves both parties were conscious and freely agreeing.
> Every consent generates a tamper-resistant, timestamped, geo-located record.

---

## Files in this project

| File | What it is |
|---|---|
| **`client/`** + **`server/`** | **The real app (PRIMARY DELIVERABLE).** React 18 + Vite client, Fastify + Prisma + PostgreSQL + Redis server. All active development happens here — see "Real app architecture" below. |
| `Hookups App.html` | The original hi-fi clickable prototype. Superseded by `client/`+`server/` as the actively-developed product, but still useful as a design/flow reference — every screen and flow it defined has since been rebuilt for real in `client/`. |
| `Hookups Wireframes v2.html`, `Hookups Wireframes.html` | Earlier wireframe exploration. Deprecated. |
| `consent-screen-new.jsx`, `new-screens.jsx`, `safety-screens.jsx`, `parental-screens.jsx`, `tweaks-panel.jsx`, `design-canvas.jsx`, `ios-frame.jsx` | Sidecar/starter files from the prototype era. Not used by `client/`+`server/`. Keep for reference only. |
| `PRD.md` | Product requirements doc for the real app. |
| `docker-compose.yml` | Local Postgres/Redis for `server/`. |

**When the user asks for changes, edit the real app in `client/` and `server/`.** That's the single source of truth now — do not edit `Hookups App.html` for feature work; it's a historical reference only.

---

## Visual system (locked May 2026)

The original green palette has been replaced with a **teal + pink** system. Do not use old green variables.

### Colour tokens

| Token | Hex | Role |
|---|---|---|
| `--teal-600` | `#0D9488` | Primary action — all consent flows, buttons, confirmation states |
| `--teal-400` | `#2DD4BF` | Pulse ring accent, highlights, active indicators |
| `--teal-200` | `#99F6E4` | Soft teal backgrounds, sealed state chips |
| `--pink-500` | `#EC4899` | Intimacy layer — relationship partner, intimacy levels |
| `--pink-300` | `#F9A8D4` | Soft pink backgrounds, relationship accent surfaces |
| `--dark-base` | `#0D1F1E` | Primary dark background |
| `--amber` | `#F59E0B` | Pending / awaiting response |
| `--red` | `#EF4444` | Revoked, declined, duress, danger |

**Gradient:** `linear-gradient(90deg, #2DD4BF, #EC4899)` — used at the Smart Connect device contact moment (pulse ring) and sealed confirmation state. This is the brand's signature visual.

**Colour semantics:**
- **Teal** owns all consent mechanics: requesting, confirming, sealing, records, logs
- **Pink** owns the intimacy/human layer: relationship partner features, intimacy level indicators
- **Amber** = pending / awaiting confirmation
- **Red** = stop, revoke, duress, decline

### Logo (locked May 2026)

**Mark — D1:** Two smartphone outlines (teal-stroked left device, pink-stroked right device) animated toward each other. A teal-to-pink gradient pulse ring radiates from the contact point between devices.

**Wordmark:** `hookups` in Plus Jakarta Sans medium — `hook` in body text colour, `u` in `--teal-400`, `ps` in `--pink-500`. The name encodes the brand promise.

**Slogan:** *Safety. Always!*

**App icon / small sizes:** Both phone outlines + gradient dot at centre. Pulse rings reduce at 48px, drop entirely at 32px.

**Variants:** Dark (primary) on `#0D1F1E` · Light on `#F0FDFA` · Monochrome for print.

### Typography
- **Primary:** `'Plus Jakarta Sans', sans-serif`
- **Mono accent:** `'Space Mono'` for record IDs, hash strings, timestamps

### Phone bezel
390×844, rounded corners, dynamic island, custom shell with shadow stack.
**Dark mode** wired through CSS variables — toggle via Tweaks panel.

---

## Real app architecture (`client/` + `server/`)

- **Monorepo, npm workspaces**: `client/`, `server/`, `shared/`. `npm run dev` at the repo root boots both concurrently.
- **Client**: React 18 + Vite + react-router-dom. Screens under `client/src/screens/`, one file per screen, mapped in `client/src/main.jsx`. `AgeGatedRoute` (`<AG>` in main.jsx) enforces the age-gate at the route level, not just in the UI.
- **Server**: Fastify + Prisma + PostgreSQL + Redis. Routes under `server/src/routes/`, one file per resource, registered with a prefix in `server/index.js`. Services (business logic, kept out of route handlers) under `server/src/services/`.
- **PIN hashing**: bcrypt, per-user-salted (`PINService.js`). `verifyPIN()` checks both the personal and duress hash and returns `{valid, isDuress}` — **`isDuress` must never be returned to the client or leak into any response**, by design (non-negotiable principle 5).
- **Consent record integrity**: ed25519-signed + hash-chained (`CryptoService.js`) — `CONSENT_SIGNING_KEY` env var in production, ephemeral dev keypair otherwise (won't verify across restarts in dev, that's expected).
- **Migrations**: `server/prisma/schema.prisma` + `server/prisma/migrations/`. In sandboxes where `prisma migrate dev` can't run interactively, use `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script` to generate the SQL, hand-create a timestamped migration folder, then `prisma migrate deploy`.
- **File uploads**: `StorageService.js` — local disk in dev (`server/uploads/`, served via `@fastify/static`), swappable for S3/R2 via `AVATAR_STORAGE` env var. Avatar + gallery photos are resized/re-encoded to webp via `sharp`.
- **Tests**: `server/test/*.test.js` via Node's built-in `node:test` (no extra dependency) — pure-logic unit tests (PIN hashing, record signing, parental level mapping, age calc). CI (`.github/workflows/ci.yml`) also runs a real Postgres+Redis integration smoke test of the golden path (signup → OTP → PIN → login → consent request → confirm).
- **Demo PIN: `1234`** — used across every test account created via the onboarding flow.

---

## Key flows (real, in `client/`+`server/` — originally prototyped in Hookups App.html)

| Screen | What it does |
|---|---|
| `login` | Splash — email/phone login — 4-digit PIN numpad |
| `onboarding` | Splash — name — phone OTP — set PIN — confirm PIN |
| `agegate` | DOB entry — minor-block (with parental controls CTA) or selfie+ID verify |
| `home` | Active consent banner, quick actions (all wired), recent activity |
| `consent` | Role select (Requester/Consenter) — Smart Connect — method — PIN — done |
| `logs` | Live real-time feed of all activity from `window.__hookupsLog` |
| `profile` | ID card, Linked Partners, Relationship Partner, online status toggles |
| `revoke` | Change of Mind flow: warning — reason — notify partner — done |
| `notifs` | In-app notification center with inline accept/decline |
| `guardian` | Trusted Circle: emergency contacts + one-tap alert (Silent / Come Get Me / Emergency) |
| `parental` | Parent/Teen role — link — Levels 1–5 boundaries — location/check-in settings |
| `duress` | Duress PIN setup — looks normal on screen, silently alerts emergency contacts |
| `livemap` | Mutual live-location sharing during active consent — either party can share or stop |

---

## Sub-flows inside ConsentScreen

- **Smart Connect** — Bluetooth LE simulation scans for nearby Hookups users (2-second teal-to-pink pulse animation), detects partner OS, recommends method:
  - iOS→iOS — **AirDrop**
  - Android→Android — **NFC Tap**
  - cross-OS — **QR Code**
- **Manual fallback** always available via "Choose method manually"
- **Consenter disclosure step** (`con_disclosure`) surfaces relationship status BEFORE PIN entry
- **Location sharing term** — offered as an optional bundled term; both parties agree independently; revocable separately from the intimacy consent

---

## Non-negotiable design principles

1. **Every consent requires the consenter's secret PIN** — no biometric-only, no tap-only, no exceptions
2. **Transport is just plumbing** — NFC, QR, AirDrop are interchangeable. The PIN is the legal proof
3. **Third parties always informed of relationship status BEFORE entering PIN** — never blindsided
4. **Minors cannot use the app without verified parent linkage** — Levels 1–2 permitted by default; Levels 3+ blocked or require per-incident parent override
5. **Duress PIN must appear completely normal to anyone observing** — same screen, same animations, only the silent alert differs
6. **Decline reasons are never shared** — the other party sees "consent declined", nothing more
7. **Friendly tone, no shame** — "Let's Go", "I'm In ✓", "I've Changed My Mind" (never "Revoke" alone)
8. **Location consent is always independent** — agreeing to intimacy does not mean agreeing to location sharing; these are always separate items
9. **Duress PIN silently activates location sharing** toward emergency contacts only, regardless of consent terms

---

## Relationship system (3 tiers)

| Tier | What it is | Consent obligations |
|---|---|---|
| **Linked Partner** | Saved contact, faster Smart Connect | None — every encounter still requires full PIN |
| **Relationship Partner** | One at a time, mutually-PINned | Optional transparency between you two |
| **Public Relationship** | Visible status to third parties | Third parties see "in a relationship" before PIN |

Three transparency modes when both parties are in a Relationship:
- 🔒 **Private** — relationship is just a contact bond
- 🔔 **Notify** — read-only notifications when either records consent elsewhere
- 🤝 **Hall Pass** — pre-approve specific people + expiry date; off-list partners trigger independent approval request

Relationship Partner features use **pink** (`--pink-500` / `--pink-300`) as the primary colour — the only context where pink leads.

---

## Parental Controls (Levels 1–5)

| Level | Activity | Default for under-18 |
|---|---|---|
| 1 | Holding hands & hugging | ✅ Permitted |
| 2 | Kissing | ✅ Permitted |
| 3 | Touching above clothing | ⚠ Requires parent override per incident |
| 4 | Touching under clothing | 🚫 Blocked |
| 5 | Sexual intimacy | 🚫 Blocked (legal age) |

Parent receives push notification + full metadata (location, requester identity, timestamp) for any blocked or override-requested attempt. Parent can demand a 10-minute check-in.

At Level 3+, parent is automatically added as a location recipient when the minor has active location sharing.

---

## Live Location Sharing

- Offered as an optional term bundled in the consent request
- Both parties must agree independently — one declining does not block the rest of the consent
- Revocable independently without revoking the intimacy consent
- Auto-stops at `expiresAt` or on consent revocation
- Precision modes: Exact (±5m) or City Block (±200m) — chosen per user
- Location pings stored only for duration of active consent + 24h, then deleted
- Not included in PDF/CSV exports (ephemeral session data, not legal evidence)
- **Duress override:** duress PIN silently activates location sharing toward all Trusted Circle contacts
- **Parental override:** at Level 3+, parent automatically receives pings regardless of minor's sharing preference

---

## Current state (as of July 2026)

The hi-fi HTML prototype is done and was the design reference; the real app in `client/`+`server/` has since implemented every flow it defined, for real, end-to-end (real Postgres/Redis, real Fastify routes, real Prisma schema — not mocked):

- ✅ Auth: signup/OTP/PIN, login, forgot-PIN recovery flow (OTP-gated, silently clears any duress PIN on reset), duress PIN (separate, correctly-scoped endpoint — never touches the real PIN)
- ✅ Age gate + parental controls: DOB persistence, minor route-gating, Levels 1–5 taxonomy enforced server-side at consent request *and* confirm, per-incident override requests/approvals
- ✅ Consent flow: request/disclosure/confirm/revoke, PIN-sealed, ed25519-signed + hash-chained records, real-time polling for override/approval resolution
- ✅ Relationship system: Linked Partner / Relationship Partner / Public Relationship tiers, Private/Notify/Hall Pass transparency modes, Hall Pass off-list gating with partner approval
- ✅ Discovery/matching/meetups: handle-based pre-match privacy, real matching, meetup propose/confirm/cancel
- ✅ Photo uploads: single avatar + a capped (6) photo gallery, shown on Discovery profiles
- ✅ Live location sharing: real Socket.io + Redis relay, duress and Level-3+ auto-share overrides
- ✅ Guardian/Trusted Circle alerts, real Notifications center aggregating every pending actionable item
- ✅ PDF/CSV export of consent records (legal-evidence-style certificate + bulk CSV)
- ✅ CI: GitHub Actions with a unit-test suite and a real Postgres+Redis integration smoke test of the golden path
- ✅ Brand identity locked: teal + pink palette, D1 logo mark, wordmark, slogan
- 🔧 Pending (not code — business/legal decisions): legal review (POPIA + UK Online Safety Act + GDPR), identity verification vendor pick (Onfido/Veriff — currently a dev stub), production KMS/signing-key setup, multi-region backend decision, App Store geo-blocking

---

## Geography & market strategy

- **Founder is based in South Africa.** Long-term goal is global reach.
- **Launch market: South Africa only** (POPIA compliance, SA age-of-consent 16)
- **Phase 2: UK + EU** (requires GDPR + UK Online Safety Act compliance)
- **Phase 3: US** (requires Delaware C-Corp typically, 50-state legal complexity)
- **Geo-block other markets** at App Store level until proper counsel secured
- **Identity vendor must be global from day one:** Onfido (UK) or Veriff (EE) recommended
- **Backend must support multi-region** (AWS / GCP / Cloudflare) — POPIA prefers SA data in SA; EU prefers EU data in EU
- **Store all timestamps as UTC** in DB; render in user's local zone in app (court-evidence integrity)

---

## When the user opens a new chat

The user has been iterating on this for weeks. Greet them briefly, confirm you've read this brief, and ask what they'd like to do next. Do NOT re-explain features they already know about. Do NOT suggest starting over. Edit the real app in `client/`+`server/` unless they explicitly ask you to touch the old `Hookups App.html` prototype.

**Common asks:**
- Add or refine a flow in the real app
- Fix a bug found while testing
- Build out a remaining gap (see "Pending" above)
- Set up/verify local dev (Postgres+Redis via `docker-compose.yml`, `npm run dev` at the repo root)
- Generate a PRD update for developer handoff

**Verification standard for this codebase:** every feature in this session's history was built end-to-end against real Postgres/Redis and verified with either Playwright or direct API calls — not just typechecked. Keep doing that; it has repeatedly caught real bugs (e.g. a bodyless-POST content-type bug, a DuressScreen bug that silently overwrote the real login PIN, a PDF checkmark-glyph rendering bug) that a typecheck alone would have missed.

If the user asks for the demo PIN, it's **`1234`**.
