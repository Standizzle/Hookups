import bcrypt from 'bcrypt';

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const SALT_PREFIX = process.env.PIN_SALT_PREFIX || 'hku_2026_';

export function hashPIN(userId, pin) {
  const value = SALT_PREFIX + userId + pin;
  return bcrypt.hash(value, ROUNDS);
}

/**
 * Verify a PIN attempt. Returns { valid, isDuress }.
 * Both paths return the same response shape — callers must not reveal isDuress to the client.
 */
export async function verifyPIN(userId, pin, pinHash, duressPinHash) {
  const value = SALT_PREFIX + userId + pin;

  const [personalMatch, duressMatch] = await Promise.all([
    bcrypt.compare(value, pinHash),
    duressPinHash ? bcrypt.compare(value, duressPinHash) : Promise.resolve(false),
  ]);

  if (personalMatch) return { valid: true, isDuress: false };
  if (duressMatch)   return { valid: true, isDuress: true };
  return { valid: false, isDuress: false };
}

export function pinsAreEqual(pin1, pin2) {
  return pin1 === pin2;
}

export function isValidPIN(pin) {
  return /^\d{4}$/.test(pin);
}
