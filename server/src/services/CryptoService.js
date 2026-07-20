import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { KMSClient, SignCommand, VerifyCommand } from '@aws-sdk/client-kms';

// Production: an AWS KMS asymmetric key (KeySpec ECC_NIST_EDWARDS25519) does
// the actual signing — the private key material never leaves KMS. Dev/CI:
// an ephemeral in-process ed25519 keypair, generated fresh per process, so
// signatures won't verify across restarts — that's expected and fine locally.
const KMS_KEY_ID = process.env.AWS_KMS_KEY_ID || null;
const kmsClient = KMS_KEY_ID ? new KMSClient({ region: process.env.AWS_REGION }) : null;

if (!KMS_KEY_ID && process.env.NODE_ENV === 'production') {
  console.warn('[CryptoService] AWS_KMS_KEY_ID is not set in production — falling back to an ephemeral dev keypair. Consent record signatures will not survive a restart.');
}

let _devPrivateKey, _devPublicKey;
function getDevKeyPair() {
  if (!_devPrivateKey) {
    const pair = generateKeyPairSync('ed25519');
    _devPrivateKey = pair.privateKey;
    _devPublicKey  = pair.publicKey;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CryptoService] Using ephemeral ed25519 keypair (no AWS_KMS_KEY_ID set). Records won\'t verify across restarts — expected in dev.');
    }
  }
  return { privateKey: _devPrivateKey, publicKey: _devPublicKey };
}

export async function signRecord(canonicalJSON) {
  const data = Buffer.from(canonicalJSON, 'utf8');

  if (kmsClient) {
    const res = await kmsClient.send(new SignCommand({
      KeyId: KMS_KEY_ID,
      Message: data,
      MessageType: 'RAW',
      SigningAlgorithm: 'ED25519_SHA_512',
    }));
    return Buffer.from(res.Signature).toString('base64');
  }

  const { privateKey } = getDevKeyPair();
  return sign(null, data, privateKey).toString('base64');
}

export async function verifyRecord(canonicalJSON, signature) {
  const data = Buffer.from(canonicalJSON, 'utf8');
  const sig  = Buffer.from(signature, 'base64');

  try {
    if (kmsClient) {
      const res = await kmsClient.send(new VerifyCommand({
        KeyId: KMS_KEY_ID,
        Message: data,
        MessageType: 'RAW',
        Signature: sig,
        SigningAlgorithm: 'ED25519_SHA_512',
      }));
      return !!res.SignatureValid;
    }

    const { publicKey } = getDevKeyPair();
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
      holdingHandsHugging:   record.holdingHandsHugging,
      kissingAffection:      record.kissingAffection,
      touchingAboveClothing: record.touchingAboveClothing,
      touchingUnderClothing: record.touchingUnderClothing,
      sexualIntimacy:        record.sexualIntimacy,
      photosVideo:      record.photosVideo,
      overnightStays:   record.overnightStays,
      safeWord:         record.safeWord,
      locationRequested: record.locationRequested,
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
