import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getRetirementData } from '../utils/database';

const RetirementDataContext = createContext();

export const useRetirementData = () => {
    const context = useContext(RetirementDataContext);
    if (!context) {
        throw new Error('useRetirementData must be used within a RetirementDataProvider');
    }
    return context;
};

export const RetirementDataProvider = ({ children }) => {
    const { user, masterKey } = useAuth();
    const [hasLPP, setHasLPP] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLPPStatus = async () => {
            if (!user || !masterKey) {
                setLoading(false);
                return;
            }

            try {
                const data = await getRetirementData(user.email, masterKey);
                if (data && data.version === 2) {
                    // Check if either person has LPP
                    const p1LPP = data.p1?.questionnaire?.hasLPP || false;
                    const p2LPP = data.p2?.questionnaire?.hasLPP || false;
                    setHasLPP(p1LPP || p2LPP);
                } else if (data && data.questionnaire) {
                    setHasLPP(data.questionnaire.hasLPP || false);
                }
            } catch (error) {
                console.error('Error fetching LPP status for navigation:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLPPStatus();
    }, [user, masterKey]);

    const updateLppStatus = (status) => {
        setHasLPP(status);
    };

    return (
        <RetirementDataContext.Provider value={{ hasLPP, updateLppStatus, loading }}>
            {children}
        </RetirementDataContext.Provider>
    );
};
