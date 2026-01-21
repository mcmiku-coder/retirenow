/**
 * Client-Side Encryption Utility using Web Crypto API (Master Key Version)
 * Zero-knowledge architecture - master keys stored in memory only during session
 */

const IV_LENGTH = 12;

/**
 * Generate a random IV (Initialization Vector)
 */
export function generateIV() {
    return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Import master key from hex string
 */
async function importMasterKey(masterKeyHex) {
    const masterKeyBytes = hexToBytes(masterKeyHex);

    return await window.crypto.subtle.importKey(
        'raw',
        masterKeyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using the master key (no password needed)
 */
export async function encryptDataWithMasterKey(data, masterKeyHex) {
    if (!masterKeyHex) {
        throw new Error('Master key is required for encryption');
    }

    const key = await importMasterKey(masterKeyHex);
    const iv = generateIV();
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);

    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(dataString)
    );

    return {
        encryptedData: Array.from(new Uint8Array(encryptedContent)),
        iv: Array.from(iv)
    };
}

/**
 * Decrypt data using the master key
 */
export async function decryptDataWithMasterKey(encryptedObj, masterKeyHex) {
    if (!masterKeyHex) {
        throw new Error('Master key is required for decryption');
    }

    if (!encryptedObj || !encryptedObj.encryptedData || !encryptedObj.iv) {
        throw new Error('Invalid encrypted data object');
    }

    const key = await importMasterKey(masterKeyHex);
    const iv = new Uint8Array(encryptedObj.iv);
    const encryptedData = new Uint8Array(encryptedObj.encryptedData);

    try {
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        const dataString = decoder.decode(decryptedContent);
        return JSON.parse(dataString);
    } catch (error) {
        throw new Error('Decryption failed - wrong master key or corrupted data');
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
