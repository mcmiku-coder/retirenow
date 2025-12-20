/**
 * IndexedDB with Client-Side Encryption
 * All sensitive data is encrypted before storage
 */

import Dexie from 'dexie';
import { encryptData, decryptData, generateSalt } from './encryption';

class EncryptedDatabase extends Dexie {
  constructor() {
    super('QuitRetirementDB');
    this.version(1).stores({
      userData: 'email, encryptedData, salt, iv',
      incomeData: 'email, encryptedData, salt, iv',
      costData: 'email, encryptedData, salt, iv'
    });
  }
}

const db = new EncryptedDatabase();

/**
 * Save user personal data (encrypted)
 */
export async function saveUserData(email, password, data) {
  const salt = generateSalt();
  const encrypted = await encryptData(data, password, salt);
  
  await db.userData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    salt: encrypted.salt,
    iv: encrypted.iv
  });
}

/**
 * Get user personal data (decrypted)
 */
export async function getUserData(email, password) {
  const record = await db.userData.get(email);
  if (!record) return null;
  
  try {
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    throw new Error('Failed to decrypt data - wrong password');
  }
}

/**
 * Save income data (encrypted)
 */
export async function saveIncomeData(email, password, data) {
  const salt = generateSalt();
  const encrypted = await encryptData(data, password, salt);
  
  await db.incomeData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    salt: encrypted.salt,
    iv: encrypted.iv
  });
}

/**
 * Get income data (decrypted)
 */
export async function getIncomeData(email, password) {
  const record = await db.incomeData.get(email);
  if (!record) return null;
  
  try {
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    throw new Error('Failed to decrypt income data');
  }
}

/**
 * Save cost data (encrypted)
 */
export async function saveCostData(email, password, data) {
  const salt = generateSalt();
  const encrypted = await encryptData(data, password, salt);
  
  await db.costData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    salt: encrypted.salt,
    iv: encrypted.iv
  });
}

/**
 * Get cost data (decrypted)
 */
export async function getCostData(email, password) {
  const record = await db.costData.get(email);
  if (!record) return null;
  
  try {
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    throw new Error('Failed to decrypt cost data');
  }
}

/**
 * Clear all user data
 */
export async function clearUserData(email) {
  await db.userData.delete(email);
  await db.incomeData.delete(email);
  await db.costData.delete(email);
}

export default db;
