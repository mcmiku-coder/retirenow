/**
 * IndexedDB with Client-Side Encryption (Master Key Version)
 * All sensitive data is encrypted before storage using master keys
 */

import Dexie from 'dexie';
import { encryptDataWithMasterKey, decryptDataWithMasterKey } from './encryption-v2';

class EncryptedDatabase extends Dexie {
  constructor() {
    super('QuitRetirementDB');
    this.version(7).stores({  // Version 7: Added instrumentData and simulationConfig
      userData: 'email, encryptedData, iv',
      incomeData: 'email, encryptedData, iv',
      costData: 'email, encryptedData, iv',
      scenarioData: 'email, encryptedData, iv',
      retirementData: 'email, encryptedData, iv',
      assetsData: 'email, encryptedData, iv',
      realEstateData: 'email, encryptedData, iv',
      instrumentData: 'email, encryptedData, iv',  // NEW: Encrypted instrument time series
      simulationConfig: 'email, encryptedData, iv'  // NEW: User simulation salt
    });
  }
}

const db = new EncryptedDatabase();

/**
 * Save user personal data (encrypted)
 */
export async function saveUserData(email, masterKey, data) {
  if (!email || !masterKey) {
    console.error('saveUserData: Missing email or masterKey', { email: !!email, masterKey: !!masterKey });
    throw new Error('Email and master key are required');
  }

  try {
    const encrypted = await encryptDataWithMasterKey(data, masterKey);

    await db.userData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
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
export async function getUserData(email, masterKey) {
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getUserData: Invalid email provided');
    return null;
  }

  if (!masterKey) {
    console.warn('getUserData: No master key provided');
    return null;
  }

  try {
    const record = await db.userData.get(email);
    if (!record) {
      // No record exists yet - this is normal for new users
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getUserData error:', error);
    // Return null instead of throwing for better UX with new users
    return null;
  }
}

/**
 * Save income data (encrypted)
 */
export async function saveIncomeData(email, masterKey, data) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  const encrypted = await encryptDataWithMasterKey(data, masterKey);

  await db.incomeData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    iv: encrypted.iv
  });
}

/**
 * Get income data (decrypted)
 */
export async function getIncomeData(email, masterKey) {
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getIncomeData: Invalid email provided');
    return null;
  }

  if (!masterKey) {
    console.warn('getIncomeData: No master key provided');
    return null;
  }

  try {
    const record = await db.incomeData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getIncomeData error:', error);
    return null;
  }
}

/**
 * Save cost data (encrypted)
 */
export async function saveCostData(email, masterKey, data) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  const encrypted = await encryptDataWithMasterKey(data, masterKey);

  await db.costData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    iv: encrypted.iv
  });
}

/**
 * Get cost data (decrypted)
 */
export async function getCostData(email, masterKey) {
  // Validate inputs - return null for invalid arguments instead of throwing
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getCostData: Invalid email provided');
    return null;
  }

  if (!masterKey) {
    console.warn('getCostData: No master key provided');
    return null;
  }

  try {
    const record = await db.costData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getCostData error:', error);
    return null;
  }
}

/**
 * Save scenario data (savings, future inflows, transmission) - encrypted
 */
export async function saveScenarioData(email, masterKey, data) {
  if (!email || !masterKey) {
    console.error('saveScenarioData: Missing email or masterKey');
    throw new Error('Email and master key are required');
  }

  try {

    const encrypted = await encryptDataWithMasterKey(data, masterKey);

    await db.scenarioData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
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
export async function getScenarioData(email, masterKey) {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getScenarioData: Invalid email provided');
    return null;
  }

  if (!masterKey) {
    console.warn('getScenarioData: No master key provided');
    return null;
  }

  try {
    const record = await db.scenarioData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getScenarioData error:', error);
    return null;
  }
}

/**
 * Save retirement data (encrypted)
 */
export async function saveRetirementData(email, masterKey, data) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }


  const encrypted = await encryptDataWithMasterKey(data, masterKey);

  await db.retirementData.put({
    email: email,
    encryptedData: encrypted.encryptedData,
    iv: encrypted.iv
  });
}

/**
 * Get retirement data (decrypted)
 */
export async function getRetirementData(email, masterKey) {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return null;
  }

  if (!masterKey) {
    return null;
  }

  try {
    const record = await db.retirementData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getRetirementData error:', error);
    return null;
  }
}

/**
 * Save assets data (liquid assets, non-liquid assets, future inflows) - encrypted
 */
export async function saveAssetsData(email, masterKey, data) {
  if (!email || !masterKey) {
    console.error('saveAssetsData: Missing email or masterKey');
    throw new Error('Email and master key are required');
  }

  try {

    const encrypted = await encryptDataWithMasterKey(data, masterKey);

    await db.assetsData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveAssetsData: Encryption or storage failed', error);
    throw error;
  }
}

/**
 * Get assets data (decrypted)
 */
export async function getAssetsData(email, masterKey) {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    console.warn('getAssetsData: Invalid email provided');
    return null;
  }

  if (!masterKey) {
    console.warn('getAssetsData: No master key provided');
    return null;
  }

  try {
    const record = await db.assetsData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getAssetsData error:', error);
    return null;
  }
}

/**
 * Save real estate calculator data (encrypted)
 */
export async function saveRealEstateData(email, masterKey, data) {
  if (!email || !masterKey) {
    console.error('saveRealEstateData: Missing email or masterKey');
    throw new Error('Email and master key are required');
  }

  try {

    const encrypted = await encryptDataWithMasterKey(data, masterKey);

    await db.realEstateData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveRealEstateData: Encryption or storage failed', error);
    throw error;
  }
}

/**
 * Get real estate calculator data (decrypted)
 */
export async function getRealEstateData(email, masterKey) {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return null;
  }

  if (!masterKey) {
    return null;
  }

  try {
    const record = await db.realEstateData.get(email);
    if (!record) {
      return null;
    }

    return await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);
  } catch (error) {
    console.error('getRealEstateData error:', error);
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
    await db.retirementData.delete(email);
    await db.assetsData.delete(email);
    await db.realEstateData.delete(email);
    await db.instrumentData.delete(email);      // NEW
    await db.simulationConfig.delete(email);    // NEW
  } catch (error) {
    console.error('clearUserData error:', error);
  }
}

/**
 * Initialize user database with empty record to verify encryption works
 */
export async function initializeUserDB(email, masterKey) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required for initialization');
  }

  try {
    // Check if data already exists
    const existing = await getUserData(email, masterKey);
    if (existing) {
      console.log('User data already exists, skipping initialization');
      return;
    }

    // Initialize with empty profile
    const emptyProfile = {
      birthDate: '',
      gender: '',
      residence: ''
    };

    await saveUserData(email, masterKey, emptyProfile);
    console.log('User database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize user database:', error);
    throw new Error(`Local storage initialization failed: ${error.message}`);
  }
}

/**
 * Save encrypted instrument data (time series)
 * Data structure: { instruments: Array<{id, name, assetClass, timeSeries, frequency}> }
 */
export async function saveInstrumentData(email, masterKey, instrumentsData) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  try {
    const encrypted = await encryptDataWithMasterKey(instrumentsData, masterKey);

    await db.instrumentData.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveInstrumentData error:', error);
    throw error;
  }
}

/**
 * Get encrypted instrument data (time series)
 */
export async function getInstrumentData(email, masterKey) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  try {
    const record = await db.instrumentData.get(email);
    if (!record) {
      return null;
    }

    const decrypted = await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);

    return decrypted;
  } catch (error) {
    console.error('getInstrumentData error:', error);
    throw error;
  }
}

/**
 * Save user simulation configuration (encrypted salt)
 * Data structure: { salt: string }
 */
export async function saveSimulationConfig(email, masterKey, config) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  try {
    const encrypted = await encryptDataWithMasterKey(config, masterKey);

    await db.simulationConfig.put({
      email: email,
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv
    });
  } catch (error) {
    console.error('saveSimulationConfig error:', error);
    throw error;
  }
}

/**
 * Get user simulation configuration (encrypted salt)
 */
export async function getSimulationConfig(email, masterKey) {
  if (!email || !masterKey) {
    throw new Error('Email and master key are required');
  }

  try {
    const record = await db.simulationConfig.get(email);
    if (!record) {
      return null;
    }

    const decrypted = await decryptDataWithMasterKey({
      encryptedData: record.encryptedData,
      iv: record.iv
    }, masterKey);

    return decrypted;
  } catch (error) {
    console.error('getSimulationConfig error:', error);
    throw error;
  }
}

export default db;
