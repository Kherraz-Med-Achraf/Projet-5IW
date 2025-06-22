import * as crypto from 'crypto';

/*
 * Encrypt / decrypt helpers for protecting secrets at rest (e.g. OTP secret).
 *
 * Uses AES-256-GCM with random 12-byte IV.
 * The encryption key must be provided via the OTP_ENC_KEY env variable
 * and must be a 32-byte hex string (64 hex chars).
 */

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getKey(): Buffer {
  let keyHex = process.env.OTP_ENC_KEY;

  // En développement / test, on génère une clé unique au premier appel si elle est absente.
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OTP_ENC_KEY env variable must be a 32-byte hex string');
    }
    keyHex = crypto.randomBytes(32).toString('hex');
    process.env.OTP_ENC_KEY = keyHex;
  }

  if (keyHex.length !== 64) {
    throw new Error('OTP_ENC_KEY env variable must be a 32-byte hex string');
  }

  return Buffer.from(keyHex, 'hex');
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store iv:tag:cipherText all base64-encoded, separated by dots
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed cipher payload');
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return dec.toString('utf8');
} 