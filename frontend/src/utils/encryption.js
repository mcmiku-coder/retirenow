/**
 * Client-Side Encryption Utility using Web Crypto API
 * Zero-knowledge architecture - encryption keys never leave the browser
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Generate a random salt
 */
export function generateSalt() {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV (Initialization Vector)
 */
export function generateIV() {
  return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
export async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(data, password, salt) {
  const key = await deriveKey(password, salt);
  const iv = generateIV();
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encoder.encode(dataString)
  );

  return {
    encryptedData: Array.from(new Uint8Array(encryptedContent)),
    iv: Array.from(iv),
    salt: Array.from(salt)
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(encryptedObj, password) {
  const key = await deriveKey(password, new Uint8Array(encryptedObj.salt));
  const iv = new Uint8Array(encryptedObj.iv);
  const encryptedData = new Uint8Array(encryptedObj.encryptedData);

  try {
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    const dataString = decoder.decode(decryptedContent);
    return JSON.parse(dataString);
  } catch (error) {
    throw new Error('Decryption failed - wrong password or corrupted data');
  }
}

/**
 * Generate a strong password validation
 */
export function validatePassword(password) {
  if (password.length < 12) {
    return 'Password must be at least 12 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}
