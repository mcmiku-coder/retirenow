
import {
    getUserData,
    getIncomeData,
    getCostData,
    getScenarioData,
    getRetirementData,
    getAssetsData,
    getRealEstateData,
    getInstrumentData,     // NEW
    getSimulationConfig,   // NEW
    saveUserData,
    saveIncomeData,
    saveCostData,
    saveScenarioData,
    saveRetirementData,
    saveAssetsData,
    saveRealEstateData,
    saveInstrumentData,    // NEW
    saveSimulationConfig   // NEW
} from './database';

import { encryptDataWithMasterKey, decryptDataWithMasterKey } from './encryption-v2';

/**
 * Export all user data as an encrypted JSON file
 * The file itself acts as a backup and can be imported later.
 * 
 * We re-encrypt the export with the master key to ensure it's portable 
 * (though data in DB is already encrypted, we decrypt then re-encrypt into a single blob for simplicity and versioning).
 */
export const exportBackup = async (email, masterKey) => {
    try {
        // 1. Fetch all data (decrypted)
        const [
            userData,
            incomeData,
            costData,
            scenarioData,
            retirementData,
            assetsData,
            realEstateData,
            instrumentData,     // NEW
            simulationConfig    // NEW
        ] = await Promise.all([
            getUserData(email, masterKey),
            getIncomeData(email, masterKey),
            getCostData(email, masterKey),
            getScenarioData(email, masterKey),
            getRetirementData(email, masterKey),
            getAssetsData(email, masterKey),
            getRealEstateData(email, masterKey),
            getInstrumentData(email, masterKey),    // NEW
            getSimulationConfig(email, masterKey)   // NEW
        ]);

        // 2. Structure the backup payload
        const backupPayload = {
            version: 2, // Updated version
            timestamp: new Date().toISOString(),
            email: email, // Metadata only, actual restoration relies on current user
            data: {
                userData,
                incomeData,
                costData,
                scenarioData,
                retirementData,
                assetsData,
                realEstateData,
                instrumentData,     // NEW
                simulationConfig    // NEW
            }
        };

        // 3. Encrypt the entire payload with the master key
        // This ensures that even if you have the file, you need the master key (password) to unlock it.
        const encryptedBackup = await encryptDataWithMasterKey(backupPayload, masterKey);

        // 4. Create and trigger download
        // We save the encrypted object (iv + data) as JSON
        const blob = new Blob([JSON.stringify(encryptedBackup)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Filename: retirenow-backup-YYYY-MM-DD.json
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `retirenow-backup-${dateStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Backup export failed:', error);
        throw error;
    }
};

/**
 * Import backup data
 * Reads the file, decrypts it with current master key, and restores to DB.
 */
export const importBackup = async (file, email, masterKey) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const fileContent = e.target.result;
                const encryptedBackup = JSON.parse(fileContent);

                // 1. Decrypt the backup
                // This will fail if the master key doesn't match (e.g. user completely changed account/key)
                const decryptedPayload = await decryptDataWithMasterKey(encryptedBackup, masterKey);

                if (!decryptedPayload || !decryptedPayload.data) {
                    throw new Error('Invalid backup file format or wrong key');
                }

                const { data } = decryptedPayload;

                // 2. Restore data to IndexedDB
                // We overwrite existing data
                await Promise.all([
                    data.userData ? saveUserData(email, masterKey, data.userData) : Promise.resolve(),
                    data.incomeData ? saveIncomeData(email, masterKey, data.incomeData) : Promise.resolve(),
                    data.costData ? saveCostData(email, masterKey, data.costData) : Promise.resolve(),
                    data.scenarioData ? saveScenarioData(email, masterKey, data.scenarioData) : Promise.resolve(),
                    data.retirementData ? saveRetirementData(email, masterKey, data.retirementData) : Promise.resolve(),
                    data.assetsData ? saveAssetsData(email, masterKey, data.assetsData) : Promise.resolve(),
                    data.realEstateData ? saveRealEstateData(email, masterKey, data.realEstateData) : Promise.resolve(),
                    // NEW: Import instrumentData and simulationConfig if present (backward compatibility)
                    data.instrumentData ? saveInstrumentData(email, masterKey, data.instrumentData) : Promise.resolve(),
                    data.simulationConfig ? saveSimulationConfig(email, masterKey, data.simulationConfig) : Promise.resolve()
                ]);

                resolve(true);
            } catch (error) {
                console.error('Backup import failed:', error);
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsText(file);
    });
};
