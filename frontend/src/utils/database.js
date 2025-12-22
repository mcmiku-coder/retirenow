/**
 * IndexedDB with Client-Side Encryption
 * All sensitive data is encrypted before storage
 */

import Dexie from 'dexie';
import { encryptData, decryptData, generateSalt } from './encryption';

class EncryptedDatabase extends Dexie {
  constructor() {
    super('QuitRetirementDB');
    this.version(2).stores({
      userData: 'email, encryptedData, salt, iv',
      incomeData: 'email, encryptedData, salt, iv',
      costData: 'email, encryptedData, salt, iv',
      scenarioData: 'email, encryptedData, salt, iv'
    });
  }
}

const db = new EncryptedDatabase();

/**
 * Save user personal data (encrypted)
 */
export async function saveUserData(email, password, data) {
  if (!email || !password) {
    console.error('saveUserData: Missing email or password', { email: !!email, password: !!password });
    throw new Error('Email and password are required');
  }
  
  try {
    const salt = generateSalt();
    const encrypted = await encryptData(data, password, salt);
    
    await db.userData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      salt: encrypted.salt,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveUserData: Encryption or storage failed', error);
    throw error;
  }
}

/**
 * Get user personal data (decrypted)
 */
export async function getUserData(email, password) {
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getUserData: Invalid email provided');
    return null;
  }
  
  if (!password) {
    console.warn('getUserData: No password provided');
    return null;
  }
  
  try {
    const record = await db.userData.get(email);
    if (!record) {
      // No record exists yet - this is normal for new users
      return null;
    }
    
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    console.error('getUserData error:', error);
    // Return null instead of throwing for better UX with new users
    return null;
  }
}

/**
 * Save income data (encrypted)
 */
export async function saveIncomeData(email, password, data) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
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
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getIncomeData: Invalid email provided');
    return null;
  }
  
  if (!password) {
    console.warn('getIncomeData: No password provided');
    return null;
  }
  
  try {
    const record = await db.incomeData.get(email);
    if (!record) {
      return null;
    }
    
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    console.error('getIncomeData error:', error);
    return null;
  }
}

/**
 * Save cost data (encrypted)
 */
export async function saveCostData(email, password, data) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
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
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getCostData: Invalid email provided');
    return null;
  }
  
  if (!password) {
    console.warn('getCostData: No password provided');
    return null;
  }
  
  try {
    const record = await db.costData.get(email);
    if (!record) {
      return null;
    }
    
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    console.error('getCostData error:', error);
    return null;
  }
}

/**
 * Save scenario data (savings, future inflows, transmission) - encrypted
 */
export async function saveScenarioData(email, password, data) {
  if (!email || !password) {
    console.error('saveScenarioData: Missing email or password');
    throw new Error('Email and password are required');
  }
  
  try {
    const salt = generateSalt();
    const encrypted = await encryptData(data, password, salt);
    
    await db.scenarioData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      salt: encrypted.salt,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveScenarioData: Encryption or storage failed', error);
    throw error;
  }
}

/**
 * Get scenario data (decrypted)
 */
export async function getScenarioData(email, password) {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getScenarioData: Invalid email provided');
    return null;
  }
  
  if (!password) {
    console.warn('getScenarioData: No password provided');
    return null;
  }
  
  try {
    const record = await db.scenarioData.get(email);
    if (!record) {
      return null;
    }
    
    return await decryptData({
      encryptedData: record.encryptedData,
      salt: record.salt,
      iv: record.iv
    }, password);
  } catch (error) {
    console.error('getScenarioData error:', error);
    return null;
  }
}

/**
 * Clear all user data
 */
export async function clearUserData(email) {
  if (!email) {
    return;
  }
  
  try {
    await db.userData.delete(email);
    await db.incomeData.delete(email);
    await db.costData.delete(email);
    await db.scenarioData.delete(email);
  } catch (error) {
    console.error('clearUserData error:', error);
  }
}

export default db;
