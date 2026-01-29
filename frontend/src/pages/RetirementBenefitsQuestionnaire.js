import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { saveRetirementData, getRetirementData, getUserData, getScenarioData, saveScenarioData } from '../utils/database';
import { getLegalRetirementDate } from '../utils/calculations';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';
import {
    migrateToV2,
    convertV2ToLegacy,
    createEmptyV2Schema,
    validateV2Schema
} from '../utils/retirementDataMigration';
import { Info, Plus, Trash2 } from 'lucide-react';

const RetirementBenefitsQuestionnaire = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userData, setUserData] = useState(null);
    const [legalRetirementDate, setLegalRetirementDate] = useState('');
    const [currentAge, setCurrentAge] = useState(30);

    // V2 Schema State
    const [questionnaire, setQuestionnaire] = useState({
        hasLPP: false,
        lppEarliestAge: null,
        simulationAge: '',
        isWithinPreRetirement: '',
        benefitType: '',
        hasAVS: true,
        librePassageCount: '',
        threeACount: '',
        hasSupplementaryPension: false
    });

    const [benefitsData, setBenefitsData] = useState({
        avs: { amount: '', frequency: 'Yearly', startDate: '' },
        librePassages: [],
        threeA: [{ amount: '', startDate: '' }],
        lppSup: null,
        lppByAge: {},
        lppCurrentCapital: ''
    });

    // Initialize data on mount
    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const initializeData = async () => {
            try {
                // Get user data
                const userDataResult = await getUserData(user.email, masterKey);
                if (!userDataResult) {
                    navigate('/personal-info');
                    return;
                }
                setUserData(userDataResult);

                // Calculate legal retirement date and current age
                const legalDate = getLegalRetirementDate(userDataResult.birthDate, userDataResult.gender);
                const legalDateStr = legalDate.toISOString().split('T')[0];
                setLegalRetirementDate(legalDateStr);

                const age = calculateAge(userDataResult.birthDate);
                setCurrentAge(age);

                // Try to load existing retirement data
                const savedData = await getRetirementData(user.email, masterKey);

                if (savedData) {
                    // Migrate to v2 if needed
                    const v2Data = migrateToV2(savedData, userDataResult);
                    setQuestionnaire(v2Data.questionnaire);
                    setBenefitsData(v2Data.benefitsData);
                } else {
                    // Create empty v2 schema
                    const emptyData = createEmptyV2Schema(userDataResult);
                    setQuestionnaire(emptyData.questionnaire);
                    setBenefitsData(emptyData.benefitsData);
                }

            } catch (error) {
                console.error('Error initializing data:', error);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, [user, masterKey, navigate]);

    // Auto-calculate Q3 (isWithinPreRetirement) when Q2a or Q2b changes
    useEffect(() => {
        if (!questionnaire.hasLPP) {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: 'no' }));
            return;
        }

        if (questionnaire.lppEarliestAge === null || questionnaire.lppEarliestAge === 'unknown' || !questionnaire.simulationAge) {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: '' }));
            return;
        }

        const earliestAge = parseInt(questionnaire.lppEarliestAge);
        const simAge = questionnaire.simulationAge;

        if (simAge >= earliestAge) {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: 'yes' }));
        } else {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: 'no' }));
        }
    }, [questionnaire.hasLPP, questionnaire.lppEarliestAge, questionnaire.simulationAge]);

    // Sync 3a array with count
    useEffect(() => {
        const currentCount = benefitsData.threeA.length;
        if (currentCount === questionnaire.threeACount) return;

        setBenefitsData(prev => {
            let newThreeA = [...prev.threeA];

            if (currentCount < questionnaire.threeACount) {
                // Add new accounts
                const toAdd = questionnaire.threeACount - currentCount;
                const defaultDate = newThreeA[0]?.startDate || legalRetirementDate;
                for (let i = 0; i < toAdd; i++) {
                    newThreeA.push({ amount: '', startDate: defaultDate });
                }
            } else {
                // Remove accounts
                newThreeA = newThreeA.slice(0, questionnaire.threeACount);
            }

            return { ...prev, threeA: newThreeA };
        });
    }, [questionnaire.threeACount, legalRetirementDate]);

    // Sync libre passages array with count
    useEffect(() => {
        const currentCount = benefitsData.librePassages.length;
        if (currentCount === questionnaire.librePassageCount) return;

        setBenefitsData(prev => {
            let newLibre = [...prev.librePassages];

            if (currentCount < questionnaire.librePassageCount) {
                // Add new accounts
                const toAdd = questionnaire.librePassageCount - currentCount;
                const defaultDate = legalRetirementDate;
                for (let i = 0; i < toAdd; i++) {
                    newLibre.push({ amount: '', startDate: defaultDate });
                }
            } else {
                // Remove accounts
                newLibre = newLibre.slice(0, questionnaire.librePassageCount);
            }

            return { ...prev, librePassages: newLibre };
        });
    }, [questionnaire.librePassageCount, legalRetirementDate]);

    // Initialize lppByAge when earliest age changes
    useEffect(() => {
        if (!questionnaire.hasLPP || questionnaire.isWithinPreRetirement !== 'yes') return;
        if (!questionnaire.lppEarliestAge || questionnaire.lppEarliestAge === 'unknown') return;

        const earliestAge = parseInt(questionnaire.lppEarliestAge);

        setBenefitsData(prev => {
            const newLppByAge = { ...prev.lppByAge };

            // Initialize ages from earliest to 65
            for (let age = earliestAge; age <= 65; age++) {
                if (!newLppByAge[age]) {
                    newLppByAge[age] = { pension: '', capital: '', rate: '' };
                }
            }

            return { ...prev, lppByAge: newLppByAge };
        });
    }, [questionnaire.hasLPP, questionnaire.lppEarliestAge, questionnaire.isWithinPreRetirement]);

    // Helper functions
    const calculateAge = (birthDate) => {
        if (!birthDate) return 30;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const updateQuestionnaire = (field, value) => {
        setQuestionnaire(prev => ({ ...prev, [field]: value }));
    };

    const updateBenefitData = (type, field, value, index = null) => {
        setBenefitsData(prev => {
            if (index !== null && Array.isArray(prev[type])) {
                const newArray = [...prev[type]];
                newArray[index] = { ...newArray[index], [field]: value };
                return { ...prev, [type]: newArray };
            }
            return {
                ...prev,
                [type]: { ...prev[type], [field]: value }
            };
        });
    };

    const updateLppByAge = (age, field, value) => {
        setBenefitsData(prev => ({
            ...prev,
            lppByAge: {
                ...prev.lppByAge,
                [age]: {
                    ...prev.lppByAge[age],
                    [field]: value
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Build v2 data
            const v2Data = {
                version: 2,
                questionnaire,
                benefitsData
            };

            // Validate
            const validation = validateV2Schema(v2Data);
            if (!validation.valid) {
                toast.error(`Validation failed: ${validation.errors.join(', ')}`);
                setSaving(false);
                return;
            }

            // Convert to legacy format for backward compatibility (dual-write)
            const legacyData = convertV2ToLegacy(v2Data);

            // Merge: v2 fields + legacy fields
            const dataToSave = {
                ...v2Data,
                ...legacyData
            };

            await saveRetirementData(user.email, masterKey, dataToSave);

            // BRIDGE LOGIC: Update ScenarioData to bypass RetirementParameters page
            // This ensures smooth flow from Questionnaire -> Data Review
            try {
                const currentScenario = await getScenarioData(user.email, masterKey) || {};

                // 1. Calculate Retirement Date
                let wishedDate = currentScenario.wishedRetirementDate || '';
                if (questionnaire.simulationAge && userData?.birthDate) {
                    const birth = new Date(userData.birthDate);
                    const target = new Date(birth);
                    target.setFullYear(birth.getFullYear() + questionnaire.simulationAge);
                    // Default to next month after birthday
                    target.setMonth(target.getMonth() + 1);
                    wishedDate = target.toISOString().split('T')[0];
                } else if (!wishedDate && userData?.retirementLegalDate) {
                    wishedDate = userData.retirementLegalDate;
                }

                // 2. Determine Option
                let option = 'option0';
                if (questionnaire.hasLPP && questionnaire.isWithinPreRetirement === 'yes') {
                    option = 'option2';
                }

                // 3. Map preRetirementRows
                const preRetirementRows = Object.entries(benefitsData.lppByAge || {}).map(([age, data]) => ({
                    age: parseInt(age),
                    pension: data.pension || '',
                    capital: data.capital || '',
                    rate: data.rate || ''
                }));

                // 4. Projected Values
                let projPension = '', projCapital = '';
                if (questionnaire.simulationAge && benefitsData.lppByAge && benefitsData.lppByAge[questionnaire.simulationAge]) {
                    projPension = benefitsData.lppByAge[questionnaire.simulationAge].pension || '';
                    projCapital = benefitsData.lppByAge[questionnaire.simulationAge].capital || '';
                }

                // 5. Legal Retirement Values (Age 65)
                let legalPension = '', legalCapital = '', legalRate = '';
                if (benefitsData.lppByAge && benefitsData.lppByAge[65]) {
                    legalPension = benefitsData.lppByAge[65].pension || '';
                    legalCapital = benefitsData.lppByAge[65].capital || '';
                    legalRate = benefitsData.lppByAge[65].rate || '';
                }

                const updatedScenario = {
                    ...currentScenario,
                    wishedRetirementDate: wishedDate,
                    retirementOption: option,
                    earlyRetirementAge: questionnaire.simulationAge,
                    lppSimulationAge: questionnaire.simulationAge,
                    lppEarliestAge: questionnaire.lppEarliestAge,
                    lppEarlyRetirementOption: questionnaire.isWithinPreRetirement === 'yes' ? 'Yes' : (questionnaire.isWithinPreRetirement === 'no' ? 'No' : ''),

                    projectedLPPPension: projPension,
                    projectedLPPCapital: projCapital,

                    projectedLegalLPPPension: legalPension,
                    projectedLegalLPPCapital: legalCapital,
                    projectedLegalLPPRate: legalRate,

                    preRetirementRows,

                    selectedPillars: {
                        avs: questionnaire.hasAVS,
                        lpp: questionnaire.hasLPP,
                        lppSup: questionnaire.hasSupplementaryPension,
                        threeA: questionnaire.threeACount > 0
                    },
                    benefitsData,
                    threeAAccountsCount: questionnaire.threeACount
                };

                await saveScenarioData(user.email, masterKey, updatedScenario);
                console.log('Bridge Logic: ScenarioData updated successfully');

            } catch (bridgeError) {
                console.error('Bridge Logic Error:', bridgeError);
                // Non-blocking, proceed? 
                // Better to alert user if this fails as it breaks the flow
                toast.error('Warning: Simulation parameters might not be fully synced');
            }

            toast.success('Retirement benefits saved successfully');
            navigate('/data-review');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save data');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>
                </div>
            </div>
        );
    }

    // Generate age options for dropdowns
    const ageOptions = [];
    for (let age = currentAge; age <= 65; age++) {
        ageOptions.push(age);
    }

    const earliestAgeOptions = [];
    for (let age = 56; age <= 65; age++) {
        earliestAgeOptions.push(age);
    }

    const getLppAges = () => {
        if (!questionnaire.lppEarliestAge || questionnaire.lppEarliestAge === 'unknown') return [];
        const earliest = parseInt(questionnaire.lppEarliestAge);
        const ages = [];
        for (let age = earliest; age <= 65; age++) {
            ages.push(age);
        }
        return ages;
    };

    // Helper to calculate date when user reaches a specific age
    const getDateAtAge = (targetAge) => {
        if (!userData?.birthDate || !targetAge) return '';
        const birthDate = new Date(userData.birthDate);
        const targetDate = new Date(birthDate);
        targetDate.setFullYear(birthDate.getFullYear() + targetAge);
        return targetDate.toISOString().split('T')[0];
    };

    const handleReset = () => {
        setQuestionnaire(prev => ({
            ...prev,
            hasLPP: null,
            lppEarliestAge: null,
            simulationAge: '',
            isWithinPreRetirement: '',
            benefitType: '',
            hasAVS: true,
            librePassageCount: '',
            threeACount: '',
            hasSupplementaryPension: false
        }));

        setBenefitsData({
            avs: { amount: '', frequency: 'Yearly', startDate: '' },
            librePassages: [],
            threeA: [],
            lppSup: null,
            lppByAge: {},
            lppCurrentCapital: ''
        });

        toast.success(language === 'fr' ? 'Réinitialisé aux valeurs par défaut' : 'Reset to defaults');
    };

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 mt-8">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                        {language === 'fr'
                            ? 'Retirement benefits and simulation age input'
                            : 'Retirement benefits and simulation age input'}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {language === 'fr'
                            ? 'Sélectionnez les piliers de retraite dont vous bénéficierez et comment vous prévoyez de les utiliser'
                            : 'Select the retirement pillars that you will benefit from and how you plan to use them'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Card */}
                    <Card>
                        <CardContent className="space-y-6 pt-6">
                            {/* Q1: LPP Affiliation - Radio Buttons */}
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">
                                    {language === 'fr'
                                        ? 'Êtes-vous actuellement affilié à un plan de pension LPP ?'
                                        : 'Are you currently affiliated to a LPP Pension Plan?'}
                                </Label>
                                <RadioGroup
                                    value={questionnaire.hasLPP === true ? 'yes' : (questionnaire.hasLPP === false ? 'no' : '')}
                                    onValueChange={(value) => updateQuestionnaire('hasLPP', value === 'yes')}
                                    className="flex gap-4 justify-start w-[220px]"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="lpp-yes" />
                                        <Label htmlFor="lpp-yes" className="cursor-pointer">
                                            {language === 'fr' ? 'Oui' : 'Yes'}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="lpp-no" />
                                        <Label htmlFor="lpp-no" className="cursor-pointer">
                                            {language === 'fr' ? 'Non' : 'No'}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Q2b: Simulation Age */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="simulationAgeMain" className="text-base font-semibold">
                                    {language === 'fr'
                                        ? 'À quel âge souhaitez-vous simuler la faisabilité de votre retraite ?'
                                        : 'At what age would you like to simulate your retirement feasibility?'}
                                </Label>
                                <Select
                                    value={questionnaire.simulationAge ? String(questionnaire.simulationAge) : ''}
                                    onValueChange={(value) => updateQuestionnaire('simulationAge', parseInt(value))}
                                >
                                    <SelectTrigger id="simulationAgeMain" className="w-[220px] justify-end gap-2">
                                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ageOptions.map(age => (
                                            <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Q2a: Earliest pre-retirement age - Only if LPP = Yes */}
                            {questionnaire.hasLPP && (
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="lppEarliestAge" className="text-base font-semibold">
                                        {language === 'fr'
                                            ? 'Quel est l\'âge de pré-retraite le plus précoce possible dans votre plan de pension ?'
                                            : 'What is the earliest pre-retirement age possible in your pension plan?'}
                                    </Label>
                                    <Select
                                        value={questionnaire.lppEarliestAge || ''}
                                        onValueChange={(value) => updateQuestionnaire('lppEarliestAge', value)}
                                    >
                                        <SelectTrigger id="lppEarliestAge" className="w-[220px] justify-end gap-2">
                                            <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {earliestAgeOptions.map(age => (
                                                <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                                            ))}
                                            <SelectItem value="unknown">
                                                {language === 'fr' ? 'Je ne sais pas' : "I don't know"}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Q3: Auto-calculated eligibility - Only if LPP = Yes */}
                            {questionnaire.hasLPP && (
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">
                                        {language === 'fr'
                                            ? 'Cet âge est-il dans la tranche de pré-retraite possible dans votre plan de pension LPP ?'
                                            : 'Is this age within the pre-retirement bracket possible within your LPP pension plan?'}
                                    </Label>
                                    <div className="w-[220px] text-base font-medium">
                                        {questionnaire.isWithinPreRetirement === 'yes' && (
                                            <span className="text-green-600">
                                                {language === 'fr' ? 'Oui' : 'Yes'}
                                            </span>
                                        )}
                                        {questionnaire.isWithinPreRetirement === 'no' && (
                                            <span className="text-red-600">
                                                {language === 'fr' ? 'Non' : 'No'}
                                            </span>
                                        )}
                                        {questionnaire.isWithinPreRetirement === 'unknown' && (
                                            <span className="text-amber-600">
                                                {language === 'fr' ? 'Je ne sais pas' : "I don't know"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Q4: Benefit type - Only if LPP = Yes */}
                            {questionnaire.hasLPP && (
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="benefitType" className="text-base font-semibold">
                                        {language === 'fr'
                                            ? 'Quel type de prestation choisirez-vous (le cas échéant) ?'
                                            : 'What type of benefit will you choose (if applicable)?'}
                                    </Label>
                                    <Select
                                        value={questionnaire.benefitType}
                                        onValueChange={(value) => updateQuestionnaire('benefitType', value)}
                                    >
                                        <SelectTrigger id="benefitType" className="w-[220px] justify-end gap-2">
                                            <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pension">
                                                {language === 'fr' ? 'Pension uniquement' : 'Pension only'}
                                            </SelectItem>
                                            <SelectItem value="capital">
                                                {language === 'fr' ? 'Capital uniquement' : 'Capital only'}
                                            </SelectItem>
                                            <SelectItem value="mix">
                                                {language === 'fr' ? 'Mixte (Pension et Capital)' : 'Mix of Pension and Capital'}
                                            </SelectItem>
                                            <SelectItem value="unknown">
                                                {language === 'fr' ? 'Je ne sais pas' : "I don't know"}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* AVS Pension - Radio buttons */}
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">
                                    {language === 'fr' ? 'Pension AVS' : 'AVS pension'}
                                </Label>
                                <RadioGroup
                                    value={questionnaire.hasAVS ? 'yes' : 'no'}
                                    onValueChange={(value) => updateQuestionnaire('hasAVS', value === 'yes')}
                                    className="flex gap-4 justify-start w-[220px]"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="avs-yes" />
                                        <Label htmlFor="avs-yes" className="cursor-pointer">
                                            {language === 'fr' ? 'Oui' : 'Yes'}
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="avs-no" />
                                        <Label htmlFor="avs-no" className="cursor-pointer">
                                            {language === 'fr' ? 'Non' : 'No'}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Pre-existing Libre passages */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="librePassageCount" className="text-base font-semibold">
                                    {language === 'fr' ? 'Libre-passages pré-existants' : 'Pre-existing Libre passages'}
                                </Label>
                                <Select
                                    value={String(questionnaire.librePassageCount)}
                                    onValueChange={(value) => updateQuestionnaire('librePassageCount', parseInt(value))}
                                >
                                    <SelectTrigger id="librePassageCount" className="w-[220px] justify-end gap-2">
                                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[0, 1, 2, 3, 4, 5].map(count => (
                                            <SelectItem key={count} value={String(count)}>{count}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 3a capital */}
                            <div className="flex items-center justify-between">
                                <Label htmlFor="threeACount" className="text-base font-semibold">
                                    {language === 'fr' ? 'Capital 3a' : '3a capital'}
                                </Label>
                                <Select
                                    value={String(questionnaire.threeACount)}
                                    onValueChange={(value) => updateQuestionnaire('threeACount', parseInt(value))}
                                >
                                    <SelectTrigger id="threeACount" className="w-[220px] justify-end gap-2">
                                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[0, 1, 2, 3, 4, 5].map(count => (
                                            <SelectItem key={count} value={String(count)}>{count}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Supplementary Pension Plan Capital - Only for LPP users */}
                            {questionnaire.hasLPP && (
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">
                                        {language === 'fr' ? 'Capital de plan de pension supplémentaire' : 'Supplementary Pension Plan Capital'}
                                    </Label>
                                    <RadioGroup
                                        value={questionnaire.hasSupplementaryPension ? 'yes' : 'no'}
                                        onValueChange={(value) => updateQuestionnaire('hasSupplementaryPension', value === 'yes')}
                                        className="flex gap-4 justify-start w-[220px]"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="yes" id="supp-yes" />
                                            <Label htmlFor="supp-yes" className="cursor-pointer">
                                                {language === 'fr' ? 'Oui' : 'Yes'}
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="no" id="supp-no" />
                                            <Label htmlFor="supp-no" className="cursor-pointer">
                                                {language === 'fr' ? 'Non' : 'No'}
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            )}

                            {/* Dynamic Benefit Input Fields */}
                            <Card className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {language === 'fr' ? 'Montants des prestations' : 'Benefit Amounts'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* AVS Yearly Pension */}
                                    {questionnaire.hasAVS && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left p-2 text-sm font-medium w-64"></th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b last:border-0">
                                                        <td className="p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Pension AVS annuelle' : 'AVS yearly pension'}
                                                        </td>
                                                        <td className="p-2">
                                                            <Input
                                                                type="date"
                                                                value={legalRetirementDate}
                                                                disabled
                                                                className="w-full"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <Input
                                                                type="text"
                                                                placeholder=""
                                                                value={(benefitsData.avs.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                onChange={(e) => {
                                                                    const rawValue = e.target.value.replace(/'/g, '');
                                                                    if (!isNaN(rawValue) || rawValue === '') {
                                                                        updateBenefitData('avs', 'amount', rawValue);
                                                                    }
                                                                }}
                                                                className="w-full text-right"
                                                            />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Libre-Passage Capitals */}
                                    {questionnaire.librePassageCount > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left p-2 text-sm font-medium w-64"></th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {benefitsData.librePassages.map((lp, index) => (
                                                        <tr key={index} className="border-b last:border-0">
                                                            <td className="p-2 text-sm font-medium">
                                                                {language === 'fr' ? 'Capital Libre-Passage (CHF)' : 'Libre-Passage capital (CHF)'} #{index + 1}
                                                            </td>
                                                            <td className="p-2">
                                                                <DateInputWithShortcuts
                                                                    value={lp.startDate || getDateAtAge(questionnaire.simulationAge)}
                                                                    onChange={(e) => updateBenefitData('librePassages', 'startDate', e.target.value, index)}
                                                                    retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                                    legalDate={legalRetirementDate}
                                                                    mode="start"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    type="text"
                                                                    placeholder=""
                                                                    value={(lp.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                    onChange={(e) => {
                                                                        const rawValue = e.target.value.replace(/'/g, '');
                                                                        if (!isNaN(rawValue) || rawValue === '') {
                                                                            updateBenefitData('librePassages', 'amount', rawValue, index);
                                                                        }
                                                                    }}
                                                                    className="w-full text-right"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* 3a Capitals */}
                                    {questionnaire.threeACount > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left p-2 text-sm font-medium w-64"></th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {benefitsData.threeA.map((account, index) => (
                                                        <tr key={index} className="border-b last:border-0">
                                                            <td className="p-2 text-sm font-medium">
                                                                {language === 'fr' ? 'Capital 3a (CHF)' : '3a capital (CHF)'} #{index + 1}
                                                            </td>
                                                            <td className="p-2">
                                                                <DateInputWithShortcuts
                                                                    value={account.startDate || getDateAtAge(questionnaire.simulationAge)}
                                                                    onChange={(e) => updateBenefitData('threeA', 'startDate', e.target.value, index)}
                                                                    retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                                    legalDate={legalRetirementDate}
                                                                    mode="start"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    type="text"
                                                                    placeholder=""
                                                                    value={(account.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                    onChange={(e) => {
                                                                        const rawValue = e.target.value.replace(/'/g, '');
                                                                        if (!isNaN(rawValue) || rawValue === '') {
                                                                            updateBenefitData('threeA', 'amount', rawValue, index);
                                                                        }
                                                                    }}
                                                                    className="w-full text-right"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Supplementary Pension Plan Capital */}
                                    {questionnaire.hasSupplementaryPension && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left p-2 text-sm font-medium w-64"></th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                        </th>
                                                        <th className="text-left p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b last:border-0">
                                                        <td className="p-2 text-sm font-medium">
                                                            {language === 'fr' ? 'Capital pension suppl. (CHF)' : 'Suppl. Pension Plan capital (CHF)'}
                                                        </td>
                                                        <td className="p-2">
                                                            <DateInputWithShortcuts
                                                                value={benefitsData.lppSup?.startDate || legalRetirementDate}
                                                                onChange={(e) => {
                                                                    setBenefitsData(prev => ({
                                                                        ...prev,
                                                                        lppSup: {
                                                                            amount: prev.lppSup?.amount || '',
                                                                            startDate: e.target.value
                                                                        }
                                                                    }));
                                                                }}
                                                                retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                                legalDate={legalRetirementDate}
                                                                mode="start"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <Input
                                                                type="text"
                                                                placeholder=""
                                                                value={(benefitsData.lppSup?.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                onChange={(e) => {
                                                                    const rawValue = e.target.value.replace(/'/g, '');
                                                                    if (!isNaN(rawValue) || rawValue === '') {
                                                                        setBenefitsData(prev => ({
                                                                            ...prev,
                                                                            lppSup: {
                                                                                amount: rawValue,
                                                                                startDate: prev.lppSup?.startDate || legalRetirementDate
                                                                            }
                                                                        }));
                                                                    }
                                                                }}
                                                                className="w-full text-right"
                                                            />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* LPP Data - Sub-situation I (Q3 = Yes) */}
                                    {questionnaire.hasLPP && questionnaire.isWithinPreRetirement === 'yes' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Info className="h-4 w-4 text-blue-500" />
                                                <Label className="text-sm font-medium">
                                                    {language === 'fr'
                                                        ? 'Données LPP par âge de retraite'
                                                        : 'LPP data by retirement age'}
                                                </Label>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="text-left p-2 text-sm font-medium">
                                                                {language === 'fr' ? 'Âge' : 'Age'}
                                                            </th>
                                                            <th className="text-left p-2 text-sm font-medium">
                                                                {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                            </th>
                                                            {(questionnaire.benefitType === 'pension' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
                                                                <th className="text-left p-2 text-sm font-medium">
                                                                    {language === 'fr' ? 'Pension annuelle LPP (CHF)' : 'LPP yearly pension (CHF)'}
                                                                </th>
                                                            )}
                                                            {(questionnaire.benefitType === 'capital' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
                                                                <th className="text-left p-2 text-sm font-medium">
                                                                    {language === 'fr' ? 'Capital LPP projeté (CHF)' : 'LPP projected capital (CHF)'}
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {getLppAges().map(age => (
                                                            <tr key={age} className="border-b last:border-0">
                                                                <td className="p-2 font-medium">{age}</td>
                                                                <td className="p-2">
                                                                    <Input
                                                                        type="date"
                                                                        value={getDateAtAge(age)}
                                                                        disabled
                                                                        className="w-full"
                                                                    />
                                                                </td>
                                                                {(questionnaire.benefitType === 'pension' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
                                                                    <td className="p-2">
                                                                        <Input
                                                                            type="text"
                                                                            placeholder=""
                                                                            value={(benefitsData.lppByAge[age]?.pension || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                            onChange={(e) => {
                                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                                if (!isNaN(rawValue) || rawValue === '') {
                                                                                    updateLppByAge(age, 'pension', rawValue);
                                                                                }
                                                                            }}
                                                                            className="w-full text-right"
                                                                        />
                                                                    </td>
                                                                )}
                                                                {(questionnaire.benefitType === 'capital' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
                                                                    <td className="p-2">
                                                                        <Input
                                                                            type="text"
                                                                            placeholder=""
                                                                            value={(benefitsData.lppByAge[age]?.capital || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                                            onChange={(e) => {
                                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                                if (!isNaN(rawValue) || rawValue === '') {
                                                                                    updateLppByAge(age, 'capital', rawValue);
                                                                                }
                                                                            }}
                                                                            className="w-full text-right"
                                                                        />
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* LPP Current Capital - Sub-situation II (Q3 = No) */}
                                    {questionnaire.hasLPP && questionnaire.isWithinPreRetirement === 'no' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="lppCurrentCapital" className="text-sm font-medium">
                                                {language === 'fr' ? 'Capital actuel du plan de pension LPP (CHF)' : 'LPP pension plan current capital (CHF)'}
                                            </Label>
                                            <Input
                                                id="lppCurrentCapital"
                                                type="number"
                                                placeholder=""
                                                value={benefitsData.lppCurrentCapital}
                                                onChange={(e) => setBenefitsData(prev => ({ ...prev, lppCurrentCapital: e.target.value }))}
                                                className="max-w-xs"
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                        >
                            {language === 'fr' ? 'Réinitialiser' : 'Reset to defaults'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {saving
                                ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                                : (language === 'fr' ? 'Continuer' : 'Continue')}
                        </Button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default RetirementBenefitsQuestionnaire;
