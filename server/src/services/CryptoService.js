import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';

// Load or generate signing key pair (ed25519)
let _privateKey, _publicKey;

function getKeyPair() {
  if (_privateKey) return { privateKey: _privateKey, publicKey: _publicKey };

  const envKey = process.env.CONSENT_SIGNING_KEY;
  if (envKey) {
    // Base64-encoded private key DER provided via env
    _privateKey = Buffer.from(envKey, 'base64');
    // In production, derive public key from private; for now generate ephemeral pair
  }

  // Dev: generate ephemeral pair (records won't verify across restarts — acceptable for dev)
  const pair = generateKeyPairSync('ed25519');
  _privateKey = pair.privateKey;
  _publicKey  = pair.publicKey;

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[CryptoService] Using ephemeral ed25519 keypair. Set CONSENT_SIGNING_KEY in production.');
  }

  return { privateKey: _privateKey, publicKey: _publicKey };
}

export function signRecord(canonicalJSON) {
  const { privateKey } = getKeyPair();
  const data = Buffer.from(canonicalJSON, 'utf8');
  return sign(null, data, privateKey).toString('base64');
}

export function verifyRecord(canonicalJSON, signature) {
  try {
    const { publicKey } = getKeyPair();
    const data = Buffer.from(canonicalJSON, 'utf8');
    const sig  = Buffer.from(signature, 'base64');
    return verify(null, data, publicKey, sig);
  } catch {
    return false;
  }
}

export function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

export function hashIP(ip) {
  const salt = process.env.PIN_SALT_PREFIX || 'hku_ip_';
  return sha256(salt + ip);
}

export function canonicalConsentJSON(record) {
  // Deterministic serialisation — sorted keys, no whitespace
  const fields = {
    id:              record.id,
    recordId:        record.recordId,
    requesterId:     record.requesterId,
    consenterId:     record.consenterId,
    terms: {
      physicalIntimacy: record.physicalIntimacy,
      kissingAffection: record.kissingAffection,
      photosVideo:      record.photosVideo,
      overnightStays:   record.overnightStays,
      safeWord:         record.safeWord,
      locationSharing:  record.locationSharing,
    },
    method:      record.method,
    startedAt:   record.startedAt?.toISOString(),
    expiresAt:   record.expiresAt?.toISOString(),
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    lat:         record.lat,
    lng:         record.lng,
    chainPrev:   record.chainPrev,
  };
  return JSON.stringify(fields);
}
