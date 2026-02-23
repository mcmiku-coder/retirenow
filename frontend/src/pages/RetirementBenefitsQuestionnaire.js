import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { toast } from 'sonner';
import { saveRetirementData, getRetirementData, getUserData, getScenarioData, saveScenarioData } from '../utils/database';
import { getLegalRetirementDate } from '../utils/calculations';
import PageHeader from '../components/PageHeader';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';
import {
    migrateToV2,
    convertV2ToLegacy,
    createEmptyV2Schema,
    validateV2Schema
} from '../utils/retirementDataMigration';
import { Info, Plus, Trash2, HelpCircle } from 'lucide-react';

const RetirementBenefitsQuestionnaire = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.personId || 'p1');

    // Person 1 State
    const [p1LegalRetirementDate, setP1LegalRetirementDate] = useState('');
    const [p1CurrentAge, setP1CurrentAge] = useState(30);

    // Person 2 State
    const [p2LegalRetirementDate, setP2LegalRetirementDate] = useState('');
    const [p2CurrentAge, setP2CurrentAge] = useState(30);

    // V2 Schema State for both
    // V2 Schema State for both

    const getInitialQuestionnaire = () => ({
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

    const getInitialBenefits = () => ({
        avs: { amount: '', frequency: 'Yearly', startDate: '' },
        librePassages: [],
        threeA: [{ amount: '', startDate: '' }],
        lppSup: null,
        lppByAge: {},
        lppCurrentCapital: '',
        lppCurrentCapitalDate: ''
    });

    const [q1, setQ1] = useState(getInitialQuestionnaire());
    const [b1, setB1] = useState(getInitialBenefits());
    const [q2, setQ2] = useState(getInitialQuestionnaire());
    const [b2, setB2] = useState(getInitialBenefits());

    // Computed Active State
    const questionnaire = (activeTab === 'p1' ? q1 : q2) || getInitialQuestionnaire();
    const benefitsData = (activeTab === 'p1' ? b1 : b2) || getInitialBenefits();
    const setQuestionnaire = activeTab === 'p1' ? setQ1 : setQ2;
    const setBenefitsData = activeTab === 'p1' ? setB1 : setB2;

    const legalRetirementDate = activeTab === 'p1' ? p1LegalRetirementDate : p2LegalRetirementDate;
    const currentAge = activeTab === 'p1' ? p1CurrentAge : p2CurrentAge;
    const activeBirthDate = activeTab === 'p1' ? userData?.birthDate : userData?.birthDate2;
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

                // Calculate Person 1 basics
                const p1Legal = getLegalRetirementDate(userDataResult.birthDate, userDataResult.gender);
                setP1LegalRetirementDate(p1Legal.toISOString().split('T')[0]);
                setP1CurrentAge(calculateAge(userDataResult.birthDate));

                // Calculate Person 2 basics
                if (userDataResult.analysisType === 'couple' && userDataResult.birthDate2) {
                    const p2Legal = getLegalRetirementDate(userDataResult.birthDate2, userDataResult.gender2);
                    setP2LegalRetirementDate(p2Legal.toISOString().split('T')[0]);
                    setP2CurrentAge(calculateAge(userDataResult.birthDate2));
                }

                // Try to load existing retirement data
                const savedData = await getRetirementData(user.email, masterKey);

                let initialQ1, initialB1, initialQ2, initialB2;

                if (savedData && savedData.p1 && savedData.p2) {
                    // Modern dual-person schema
                    initialQ1 = savedData.p1.questionnaire || getInitialQuestionnaire();
                    initialB1 = savedData.p1.benefitsData || getInitialBenefits();
                    initialQ2 = savedData.p2.questionnaire || getInitialQuestionnaire();
                    initialB2 = savedData.p2.benefitsData || getInitialBenefits();
                } else if (savedData) {
                    // Legacy or partial schema - migrate
                    const v2Data = migrateToV2(savedData, userDataResult);
                    initialQ1 = v2Data.questionnaire || getInitialQuestionnaire();
                    initialB1 = v2Data.benefitsData || getInitialBenefits();
                    initialQ2 = getInitialQuestionnaire();
                    initialB2 = getInitialBenefits();
                } else {
                    // No saved data - initialize fresh
                    const emptyP1 = createEmptyV2Schema(userDataResult);
                    initialQ1 = emptyP1.questionnaire;
                    initialB1 = emptyP1.benefitsData;

                    if (userDataResult.analysisType === 'couple') {
                        const emptyP2 = createEmptyV2Schema({
                            birthDate: userDataResult.birthDate2,
                            gender: userDataResult.gender2
                        });
                        initialQ2 = emptyP2.questionnaire;
                        initialB2 = emptyP2.benefitsData;
                    } else {
                        initialQ2 = getInitialQuestionnaire();
                        initialB2 = getInitialBenefits();
                    }
                }

                // Automation Fix: Apply to correct person
                if (location.state?.autoAutomateFullSequence && location.state.earlyRetirementAge) {
                    const navAge = parseInt(location.state.earlyRetirementAge);
                    const targetPerson = location.state.personId || 'p1';

                    if (targetPerson === 'p2') {
                        initialQ2 = {
                            ...(initialQ2 || getInitialQuestionnaire()),
                            simulationAge: navAge,
                            hasLPP: true // Usually triggered by LPP missing data
                        };
                    } else {
                        initialQ1 = {
                            ...(initialQ1 || getInitialQuestionnaire()),
                            simulationAge: navAge,
                            hasLPP: true
                        };
                    }
                }

                setQ1(initialQ1);
                setB1(initialB1);
                setQ2(initialQ2);
                setB2(initialB2);

            } catch (error) {
                console.error('Error initializing data:', error);
                toast.error('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, [user, masterKey, navigate, location.state]);

    // Helper to calculate date when user reaches a specific age
    const getDateAtAge = useCallback((targetAge) => {
        if (!activeBirthDate || !targetAge) return '';
        const birthDate = new Date(activeBirthDate);
        const targetDate = new Date(birthDate);
        targetDate.setFullYear(birthDate.getFullYear() + targetAge);
        return targetDate.toISOString().split('T')[0];
    }, [activeBirthDate]);

    // Helper for compound interest projection
    const calculateProjection = useCallback((currentStr, rateStr, dateStr) => {
        if (!currentStr || !dateStr) return '';
        const rate = parseFloat(rateStr) || 0;
        const current = parseFloat(currentStr.toString().replace(/'/g, ''));
        if (isNaN(current)) return '';

        const today = new Date();
        const target = new Date(dateStr);
        const diffTime = target - today;
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        if (diffYears <= 0) return Math.round(current).toString();

        const projected = current * Math.pow(1 + rate, diffYears);
        return Math.round(projected).toString();
    }, []);

    // Auto-calculate Q3 (isWithinPreRetirement) when Q2a or Q2b changes
    useEffect(() => {
        if (!questionnaire.hasLPP) {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: 'no' }));
            return;
        }

        if (questionnaire.lppEarliestAge === 'unknown') {
            setQuestionnaire(prev => ({ ...prev, isWithinPreRetirement: 'unknown' }));
            return;
        }

        if (questionnaire.lppEarliestAge === null || !questionnaire.simulationAge) {
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
                const defaultDate = newThreeA[0]?.startDate || getDateAtAge(questionnaire.simulationAge) || legalRetirementDate;
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
                const defaultDate = getDateAtAge(questionnaire.simulationAge) || legalRetirementDate;
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

            // CLEANUP: Remove keys strictly below earliestAge to prevent stale data
            Object.keys(newLppByAge).forEach(key => {
                if (parseInt(key) < earliestAge) {
                    delete newLppByAge[key];
                }
            });

            return { ...prev, lppByAge: newLppByAge };
        });
    }, [questionnaire.hasLPP, questionnaire.lppEarliestAge, questionnaire.isWithinPreRetirement]);

    // Update 3a, Libre-Passage, and LPP Current dates when simulation age changes
    useEffect(() => {
        if (!questionnaire.simulationAge) return;

        const newDate = getDateAtAge(questionnaire.simulationAge);
        if (!newDate) return;

        setBenefitsData(prev => {
            // Helper to recalc item projection
            const recalcItem = (item) => {
                const effectiveRate = item.isInvested ? (item.returnRate || 0) : 0;
                const projected = calculateProjection(item.currentAmount, effectiveRate, newDate);
                return { ...item, startDate: newDate, amount: projected || item.amount };
            };

            const newLibre = prev.librePassages.map(recalcItem);
            const newThreeA = prev.threeA.map(recalcItem);

            // Recalc LPP Current
            const lppRate = prev.lppCurrentInvested ? (prev.lppCurrentReturn || 0) : 0;
            const lppProjected = calculateProjection(prev.lppCurrentInitialAmount, lppRate, newDate);

            // Recalc LPP Sup
            const lppSupRate = prev.lppSup?.isInvested ? (prev.lppSup?.returnRate || 0) : 0;
            const lppSupProjected = calculateProjection(prev.lppSup?.amount, lppSupRate, prev.lppSup?.startDate || newDate);

            return {
                ...prev,
                threeA: newThreeA,
                librePassages: newLibre,
                lppCurrentCapitalDate: newDate,
                lppCurrentCapital: lppProjected || prev.lppCurrentCapital,
                lppSup: {
                    ...prev.lppSup,
                    projectedAmount: lppSupProjected || prev.lppSup?.amount
                }
            };
        });
    }, [questionnaire.simulationAge, getDateAtAge, calculateProjection]);

    // Helper to update projection when dependencies change
    const updateWithProjection = (type, index, field, value) => {
        setBenefitsData(prev => {
            const newData = { ...prev };

            // Handle array updates (librePassages, threeA)
            if (Array.isArray(newData[type])) {
                const updatedArray = [...newData[type]];
                const item = { ...updatedArray[index], [field]: value };

                // Recalculate projection if relevant fields change
                if (['currentAmount', 'returnRate', 'startDate', 'isInvested'].includes(field)) {
                    const isInvested = field === 'isInvested' ? value : item.isInvested;
                    const baseRate = field === 'returnRate' ? value : item.returnRate;
                    const rate = isInvested ? baseRate : 0;

                    const current = field === 'currentAmount' ? value : item.currentAmount;
                    const date = field === 'startDate' ? value : item.startDate;

                    const projected = calculateProjection(current, rate, date);
                    item.amount = projected;
                }

                updatedArray[index] = item;
                newData[type] = updatedArray;
                return newData;
            }
            return newData;
        });
    };

    // Helper for LPP Current update
    const updateLppCurrentProjection = (field, value) => {
        setBenefitsData(prev => {
            const updates = { [field]: value };

            // Determine current values for calc
            const invested = field === 'lppCurrentInvested' ? value : prev.lppCurrentInvested;
            const baseRate = field === 'lppCurrentReturn' ? value : prev.lppCurrentReturn;
            const rate = invested ? baseRate : 0;

            const current = field === 'lppCurrentInitialAmount' ? value : prev.lppCurrentInitialAmount;
            const date = field === 'lppCurrentCapitalDate' ? value : (prev.lppCurrentCapitalDate || new Date().toISOString().split('T')[0]);

            const projected = calculateProjection(current, rate, date);
            updates.lppCurrentCapital = projected;

            return { ...prev, ...updates };
        });
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

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!user || !masterKey) return;

        setSaving(true);
        try {
            // Build v2 data for P1
            const cleanBenefitsData1 = { ...b1 };
            if (q1.isWithinPreRetirement === 'yes') {
                cleanBenefitsData1.lppCurrentCapital = '';
                cleanBenefitsData1.lppCurrentCapitalDate = '';
                cleanBenefitsData1.lppCurrentReturn = '';
                cleanBenefitsData1.lppCurrentInvested = false;
                cleanBenefitsData1.lppCurrentInitialAmount = '';
            } else if (q1.hasLPP) {
                cleanBenefitsData1.lppByAge = {};
            }

            const v2DataP1 = {
                version: 2,
                questionnaire: q1,
                benefitsData: cleanBenefitsData1
            };
            const validationP1 = validateV2Schema(v2DataP1);
            if (!validationP1.valid) {
                toast.error(`Validation failed for Person 1: ${validationP1.errors.join(', ')}`);
                setSaving(false);
                return;
            }

            // Build v2 data for P2 if couple
            let v2DataP2 = null;
            let cleanBenefitsData2 = null;
            if (userData?.analysisType === 'couple') {
                cleanBenefitsData2 = { ...b2 };
                if (q2.isWithinPreRetirement === 'yes') {
                    cleanBenefitsData2.lppCurrentCapital = '';
                    cleanBenefitsData2.lppCurrentCapitalDate = '';
                    cleanBenefitsData2.lppCurrentReturn = '';
                    cleanBenefitsData2.lppCurrentInvested = false;
                    cleanBenefitsData2.lppCurrentInitialAmount = '';
                } else if (q2.hasLPP) {
                    cleanBenefitsData2.lppByAge = {};
                }

                v2DataP2 = {
                    version: 2,
                    questionnaire: q2,
                    benefitsData: cleanBenefitsData2
                };
                const validationP2 = validateV2Schema(v2DataP2);
                if (!validationP2.valid) {
                    toast.error(`Validation failed for Person 2: ${validationP2.errors.join(', ')}`);
                    setSaving(false);
                    return;
                }
            }

            const dataToSave = {
                version: 2,
                p1: { questionnaire: q1, benefitsData: cleanBenefitsData1 },
                p2: userData?.analysisType === 'couple' ? { questionnaire: q2, benefitsData: cleanBenefitsData2 } : undefined,
                isCouple: userData?.analysisType === 'couple'
            };

            await saveRetirementData(user.email, masterKey, dataToSave);

            // BRIDGE LOGIC: Update scenario data with simulation age
            const scenarioData = await getScenarioData(user.email, masterKey) || {};
            const updatedScenario = {
                ...scenarioData,
                earlyRetirementAge: q1.simulationAge,
                wishedRetirementAge: q1.simulationAge,
                wishedRetirementDate: calculateWishedDate(userData.birthDate, q1.simulationAge),
                earlyRetirementAge2: q2.simulationAge,
                wishedRetirementAge2: q2.simulationAge,
                wishedRetirementDate2: calculateWishedDate(userData.birthDate2, q2.simulationAge)
            };
            await saveScenarioData(user.email, masterKey, updatedScenario);

            toast.success(t('personalInfo.saveSuccess'));
            navigate('/data-review', { state: location.state });
        } catch (error) {
            console.error('Save failed:', error);
            toast.error(t('personalInfo.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const calculateWishedDate = (birthDate, age) => {
        if (!birthDate || !age) return '';
        const date = new Date(birthDate);
        date.setFullYear(date.getFullYear() + age);
        date.setMonth(date.getMonth() + 1); // standard +1 month rule often used in this app
        return date.toISOString().split('T')[0];
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
            lppCurrentCapital: '',
            lppCurrentCapitalDate: ''
        });

        toast.success(language === 'fr' ? 'Réinitialisé aux valeurs par défaut' : 'Reset to defaults');
    };

    return (
        <div className="flex-grow py-8">
            <PageHeader
                title={t('retirementBenefits.title')}
                subtitle={t('retirementBenefits.subtitle')}
                rightContent={
                    <Button
                        variant="outline"
                        onClick={() => navigate('/retirement-benefits-help')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                    >
                        <HelpCircle className="h-4 w-4" />
                        {t('retirementBenefits.helpButton')}
                    </Button>
                }
            />

            <div className="max-w-[1025px] mx-auto px-4 space-y-8 pb-12">
                {userData?.analysisType === 'couple' && (
                    <div className="flex justify-center mb-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800/40 border border-slate-700/50">
                                <TabsTrigger value="p1" className="text-sm border border-transparent transition-all data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/30">
                                    {userData.firstName || t('retirementBenefits.person1Tab')}
                                </TabsTrigger>
                                <TabsTrigger value="p2" className="text-sm border border-transparent transition-all data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30">
                                    {userData.firstName2 || t('retirementBenefits.person2Tab')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {/* Question 1: Simulation Age */}
                <form onSubmit={handleSave} className="space-y-6">
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
                                        ? 'À quel âge souhaitez-vous simuler votre retraite ?'
                                        : 'At what age would you like to simulate your retirement?'}
                                </Label>
                                <Select
                                    value={questionnaire.simulationAge ? String(questionnaire.simulationAge) : ''}
                                    onValueChange={(value) => updateQuestionnaire('simulationAge', parseInt(value))}
                                >
                                    <SelectTrigger id="simulationAgeMain" className={`w-[220px] justify-end gap-2 ${questionnaire.simulationAge ? 'border-green-500 border-2' : ''}`}>
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
                                            ? 'Âge de pré-retraite le plus précoce possible dans votre plan de pension'
                                            : 'Earliest pre-retirement age possible in your pension plan'}
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
                                            ? 'Âge dans la tranche de pré-retraite possible dans votre plan de pension LPP'
                                            : 'Age within the pre-retirement bracket possible within your LPP pension plan'}
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
                                            <span className="text-red-500 font-bold">
                                                {language === 'fr' ? 'Je ne sais pas' : "I don't know"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Q4: Benefit type - Only if LPP = Yes AND pre-retirement is possible */}
                            {questionnaire.hasLPP && questionnaire.isWithinPreRetirement === 'yes' && (
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="benefitType" className="text-base font-semibold">
                                        {language === 'fr'
                                            ? 'Type de prestation à choisir (le cas échéant)'
                                            : 'Type of benefit to choose (if applicable)'}
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
                        </CardContent>
                    </Card>

                    {/* Dynamic Benefit Input Fields */}
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {language === 'fr' ? 'Montants des prestations' : 'Benefit Amounts'}
                            </CardTitle>
                            <div className="flex flex-col gap-1 text-sm mt-2">
                                <span className="text-red-500">
                                    {language === 'fr'
                                        ? "Les champs à bordure rouge indiquent les valeurs nécessaires pour effectuer la simulation choisie"
                                        : "Red border fields indicate necessary values to perform the chosen simulation"}
                                </span>
                                <span className="text-green-500">
                                    {language === 'fr'
                                        ? "Les champs à bordure verte indiquent des valeurs optionnelles permettant d'effectuer des changements de simulation"
                                        : "Green border fields indicate optional values that will allow performing simulation changes"}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* AVS Yearly Pension */}
                            {questionnaire.hasAVS && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 text-sm font-medium w-[180px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                    {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Montant' : 'Amount'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b last:border-0">
                                                <td className="p-2 text-sm font-medium w-[180px]">
                                                    {language === 'fr' ? 'Rente AVS annuelle (CHF)' : 'AVS yearly pension (CHF)'}
                                                </td>
                                                <td className="p-2 w-[240px]">
                                                    <Input
                                                        type="text"
                                                        value={legalRetirementDate.split('-').reverse().join('.')}
                                                        readOnly
                                                        className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
                                                    />
                                                </td>
                                                <td className="p-2 w-[100px]"></td>
                                                <td className="p-2 w-[100px]"></td>
                                                <td className="p-2 w-[150px]">
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
                                                        className={`w-full text-right ${benefitsData.avs.amount ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}
                                                    />
                                                </td>
                                                <td className="p-2 w-[150px]"></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Libre-Passage Capitals */}
                            {questionnaire.librePassageCount > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 text-sm font-medium w-[180px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                    {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {language === 'fr' ? 'Investi?' : 'Invested?'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {benefitsData.librePassages.some(lp => lp.isInvested) ? (language === 'fr' ? 'Rendement' : 'Return') : ''}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur actuelle' : 'Current Value'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur projetée' : 'Projected Value'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {benefitsData.librePassages.map((lp, index) => (
                                                <tr key={index} className="border-b last:border-0">
                                                    <td className="p-2 w-[180px] text-sm font-medium">
                                                        {language === 'fr' ? 'Capital Libre-Passage (CHF)' : 'Libre-Passage capital (CHF)'} #{index + 1}
                                                    </td>
                                                    <td className="p-2 w-[240px]">
                                                        <DateInputWithShortcuts
                                                            value={lp.startDate || getDateAtAge(questionnaire.simulationAge)}
                                                            onChange={(e) => updateWithProjection('librePassages', index, 'startDate', e.target.value)}
                                                            retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                            legalDate={legalRetirementDate}
                                                            mode="start"
                                                        />
                                                    </td>
                                                    <td className="p-2 w-[100px]">
                                                        <RadioGroup
                                                            value={lp.isInvested ? 'yes' : 'no'}
                                                            onValueChange={(val) => updateWithProjection('librePassages', index, 'isInvested', val === 'yes')}
                                                            className="flex gap-4"
                                                        >
                                                            <div className="flex items-center space-x-1">
                                                                <RadioGroupItem value="yes" id={`lp-yes-${index}`} />
                                                                <Label htmlFor={`lp-yes-${index}`}>{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <RadioGroupItem value="no" id={`lp-no-${index}`} />
                                                                <Label htmlFor={`lp-no-${index}`}>{language === 'fr' ? 'Non' : 'No'}</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </td>
                                                    <td className="p-2 w-[100px]">
                                                        {lp.isInvested && (
                                                            <Select
                                                                value={lp.returnRate}
                                                                onValueChange={(val) => updateWithProjection('librePassages', index, 'returnRate', val)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0.0025">0.25%</SelectItem>
                                                                    <SelectItem value="0.005">0.5%</SelectItem>
                                                                    <SelectItem value="0.0075">0.75%</SelectItem>
                                                                    <SelectItem value="0.01">1.0%</SelectItem>
                                                                    <SelectItem value="0.0125">1.25%</SelectItem>
                                                                    <SelectItem value="0.015">1.5%</SelectItem>
                                                                    <SelectItem value="0.02">2.0%</SelectItem>
                                                                    <SelectItem value="0.025">2.5%</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </td>
                                                    <td className="p-2 w-[150px]">
                                                        <Input
                                                            type="text"
                                                            placeholder=""
                                                            value={(lp.currentAmount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue) || rawValue === '') {
                                                                    updateWithProjection('librePassages', index, 'currentAmount', rawValue);
                                                                }
                                                            }}
                                                            className={`w-full text-right ${lp.currentAmount ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}
                                                        />
                                                    </td>
                                                    <td className="p-2 w-[150px]">
                                                        <Input
                                                            type="text"
                                                            value={(lp.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                            readOnly
                                                            className="w-full text-right bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
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
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 text-sm font-medium w-[180px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                    {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {language === 'fr' ? 'Investi?' : 'Invested?'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {benefitsData.threeA.some(acc => acc.isInvested) ? (language === 'fr' ? 'Rendement' : 'Return') : ''}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur actuelle' : 'Current Value'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur projetée' : 'Projected Value'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {benefitsData.threeA.map((account, index) => (
                                                <tr key={index} className="border-b last:border-0">
                                                    <td className="p-2 w-[180px] font-medium text-sm">
                                                        {language === 'fr' ? 'Capital 3a (CHF)' : '3a capital (CHF)'} #{index + 1}
                                                    </td>
                                                    <td className="p-2 w-[240px]">
                                                        <DateInputWithShortcuts
                                                            value={account.startDate || getDateAtAge(questionnaire.simulationAge)}
                                                            onChange={(e) => updateWithProjection('threeA', index, 'startDate', e.target.value)}
                                                            retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                            legalDate={legalRetirementDate}
                                                            mode="start"
                                                        />
                                                    </td>
                                                    <td className="p-2 w-[100px]">
                                                        <RadioGroup
                                                            value={account.isInvested ? 'yes' : 'no'}
                                                            onValueChange={(val) => updateWithProjection('threeA', index, 'isInvested', val === 'yes')}
                                                            className="flex gap-4"
                                                        >
                                                            <div className="flex items-center space-x-1">
                                                                <RadioGroupItem value="yes" id={`3a-yes-${index}`} />
                                                                <Label htmlFor={`3a-yes-${index}`}>{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <RadioGroupItem value="no" id={`3a-no-${index}`} />
                                                                <Label htmlFor={`3a-no-${index}`}>{language === 'fr' ? 'Non' : 'No'}</Label>
                                                            </div>
                                                        </RadioGroup>
                                                    </td>
                                                    <td className="p-2 w-[100px]">
                                                        {account.isInvested && (
                                                            <Select
                                                                value={account.returnRate}
                                                                onValueChange={(val) => updateWithProjection('threeA', index, 'returnRate', val)}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0.0025">0.25%</SelectItem>
                                                                    <SelectItem value="0.005">0.5%</SelectItem>
                                                                    <SelectItem value="0.0075">0.75%</SelectItem>
                                                                    <SelectItem value="0.01">1.0%</SelectItem>
                                                                    <SelectItem value="0.0125">1.25%</SelectItem>
                                                                    <SelectItem value="0.015">1.5%</SelectItem>
                                                                    <SelectItem value="0.02">2.0%</SelectItem>
                                                                    <SelectItem value="0.025">2.5%</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </td>
                                                    <td className="p-2 w-[150px]">
                                                        <Input
                                                            type="text"
                                                            placeholder=""
                                                            value={(account.currentAmount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue) || rawValue === '') {
                                                                    updateWithProjection('threeA', index, 'currentAmount', rawValue);
                                                                }
                                                            }}
                                                            className={`w-full text-right ${account.currentAmount ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}
                                                        />
                                                    </td>
                                                    <td className="p-2 w-[150px]">
                                                        <Input
                                                            type="text"
                                                            value={(account.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                            readOnly
                                                            className="w-full text-right bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
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
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 text-sm font-medium w-[180px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                    {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {language === 'fr' ? 'Investi?' : 'Invested?'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {benefitsData.lppSup?.isInvested ? (language === 'fr' ? 'Rendement' : 'Return') : ''}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur actuelle' : 'Current Value'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur projetée' : 'Projected Value'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b last:border-0">
                                                <td className="p-2 w-[180px] text-sm font-medium">
                                                    {language === 'fr' ? 'Capital pension suppl. (CHF)' : 'Suppl. Pension Plan capital (CHF)'}
                                                </td>
                                                <td className="p-2 w-[240px]">
                                                    <DateInputWithShortcuts
                                                        value={benefitsData.lppSup?.startDate || getDateAtAge(questionnaire.simulationAge) || legalRetirementDate}
                                                        onChange={(e) => {
                                                            const date = e.target.value;
                                                            setBenefitsData(prev => {
                                                                const rate = prev.lppSup?.isInvested ? (prev.lppSup?.returnRate || 0) : 0;
                                                                const projected = calculateProjection(prev.lppSup?.amount, rate, date);
                                                                return {
                                                                    ...prev,
                                                                    lppSup: { ...prev.lppSup, startDate: date, projectedAmount: projected }
                                                                };
                                                            });
                                                        }}
                                                        retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                        legalDate={legalRetirementDate}
                                                        mode="start"
                                                    />
                                                </td>
                                                <td className="p-2 w-[100px]">
                                                    <RadioGroup
                                                        value={benefitsData.lppSup?.isInvested ? 'yes' : 'no'}
                                                        onValueChange={(val) => {
                                                            setBenefitsData(prev => {
                                                                const isInvested = val === 'yes';
                                                                const rate = isInvested ? (prev.lppSup?.returnRate || 0) : 0;
                                                                const effectiveDate = prev.lppSup?.startDate || getDateAtAge(questionnaire.simulationAge) || legalRetirementDate;
                                                                const projected = calculateProjection(prev.lppSup?.amount, rate, effectiveDate);
                                                                return {
                                                                    ...prev,
                                                                    lppSup: { ...prev.lppSup, isInvested, projectedAmount: projected }
                                                                };
                                                            });
                                                        }}
                                                        className="flex gap-4"
                                                    >
                                                        <div className="flex items-center space-x-1">
                                                            <RadioGroupItem value="yes" id="lppSup-yes" />
                                                            <Label htmlFor="lppSup-yes">{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <RadioGroupItem value="no" id="lppSup-no" />
                                                            <Label htmlFor="lppSup-no">{language === 'fr' ? 'Non' : 'No'}</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </td>
                                                <td className="p-2 w-[100px]">
                                                    {benefitsData.lppSup?.isInvested && (
                                                        <Select
                                                            value={benefitsData.lppSup?.returnRate}
                                                            onValueChange={(val) => {
                                                                setBenefitsData(prev => {
                                                                    const effectiveDate = prev.lppSup?.startDate || getDateAtAge(questionnaire.simulationAge) || legalRetirementDate;
                                                                    const projected = calculateProjection(prev.lppSup?.amount, val, effectiveDate);
                                                                    return {
                                                                        ...prev,
                                                                        lppSup: { ...prev.lppSup, returnRate: val, projectedAmount: projected }
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0.0025">0.25%</SelectItem>
                                                                <SelectItem value="0.005">0.5%</SelectItem>
                                                                <SelectItem value="0.0075">0.75%</SelectItem>
                                                                <SelectItem value="0.01">1.0%</SelectItem>
                                                                <SelectItem value="0.0125">1.25%</SelectItem>
                                                                <SelectItem value="0.015">1.5%</SelectItem>
                                                                <SelectItem value="0.02">2.0%</SelectItem>
                                                                <SelectItem value="0.025">2.5%</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </td>
                                                <td className="p-2 w-[150px]">
                                                    <Input
                                                        type="text"
                                                        placeholder=""
                                                        value={(benefitsData.lppSup?.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value.replace(/'/g, '');
                                                            if (!isNaN(rawValue) || rawValue === '') {
                                                                setBenefitsData(prev => {
                                                                    const rate = prev.lppSup?.isInvested ? (prev.lppSup?.returnRate || 0) : 0;
                                                                    const effectiveDate = prev.lppSup?.startDate || getDateAtAge(questionnaire.simulationAge) || legalRetirementDate;
                                                                    const projected = calculateProjection(rawValue, rate, effectiveDate);
                                                                    return {
                                                                        ...prev,
                                                                        lppSup: { ...prev.lppSup, amount: rawValue, projectedAmount: projected }
                                                                    };
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full text-right ${benefitsData.lppSup?.amount ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}
                                                    />
                                                </td>
                                                <td className="p-2 w-[150px]">
                                                    <Input
                                                        type="text"
                                                        value={(benefitsData.lppSup?.projectedAmount || benefitsData.lppSup?.amount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                        readOnly
                                                        className="w-full text-right bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
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
                                        <table className="w-full border-collapse table-fixed">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2 text-sm font-medium w-[180px]">
                                                        {language === 'fr' ? 'Âge' : 'Age'}
                                                    </th>
                                                    <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                        {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                    </th>
                                                    <th className="text-left p-2 text-sm font-medium w-[100px]"></th>
                                                    <th className="text-left p-2 text-sm font-medium w-[100px]"></th>
                                                    <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                        {(questionnaire.benefitType === 'pension' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') ? (language === 'fr' ? 'Pension annuelle LPP' : 'LPP yearly pension') : ''}
                                                    </th>
                                                    <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                        {(questionnaire.benefitType === 'capital' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') ? (language === 'fr' ? 'Capital LPP projeté' : 'LPP projected capital') : ''}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getLppAges().map(age => {
                                                    const isTargetAge = age === questionnaire.simulationAge;
                                                    return (
                                                        <tr key={age} className={`border-b last:border-0 ${isTargetAge ? 'bg-muted/50' : ''}`}>
                                                            <td className="p-2 font-medium w-[180px]">{age}</td>
                                                            <td className="p-2 w-[240px]">
                                                                <Input
                                                                    type="text"
                                                                    value={getDateAtAge(age) ? getDateAtAge(age).split('-').reverse().join('.') : ''}
                                                                    readOnly
                                                                    className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
                                                                />
                                                            </td>
                                                            <td className="p-2 w-[100px]"></td>
                                                            <td className="p-2 w-[100px]"></td>
                                                            <td className="p-2 w-[150px]">
                                                                {(questionnaire.benefitType === 'pension' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
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
                                                                        className={`w-full text-right ${isTargetAge
                                                                            ? (benefitsData.lppByAge[age]?.pension !== '' ? 'border-green-500 border-2' : 'border-red-500 border-2')
                                                                            : ''}`}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="p-2 w-[150px]">
                                                                {(questionnaire.benefitType === 'capital' || questionnaire.benefitType === 'mix' || questionnaire.benefitType === 'unknown') && (
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
                                                                        className={`w-full text-right ${isTargetAge
                                                                            ? (benefitsData.lppByAge[age]?.capital !== '' ? 'border-green-500 border-2' : 'border-red-500 border-2')
                                                                            : ''}`}
                                                                    />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* LPP Current Capital - Sub-situation II (Q3 = No or Unknown) */}
                            {questionnaire.hasLPP && (questionnaire.isWithinPreRetirement === 'no' || questionnaire.isWithinPreRetirement === 'unknown') && (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2 text-sm font-medium w-[180px]"></th>
                                                <th className="text-left p-2 text-sm font-medium w-[240px]">
                                                    {language === 'fr' ? 'Date de disponibilité' : 'Availability date'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {language === 'fr' ? 'Investi?' : 'Invested?'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[100px]">
                                                    {benefitsData.lppCurrentInvested ? (language === 'fr' ? 'Rendement' : 'Return') : ''}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur actuelle' : 'Current Value'}
                                                </th>
                                                <th className="text-left p-2 text-sm font-medium w-[150px]">
                                                    {language === 'fr' ? 'Valeur projetée' : 'Projected Value'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b last:border-0">
                                                <td className="p-2 w-[180px] text-sm font-medium">
                                                    {language === 'fr' ? 'Capital actuel du plan de pension LPP (CHF)' : 'LPP pension plan current capital (CHF)'}
                                                </td>
                                                <td className="p-2 w-[240px]">
                                                    <DateInputWithShortcuts
                                                        value={benefitsData.lppCurrentCapitalDate || new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => updateLppCurrentProjection('lppCurrentCapitalDate', e.target.value)}
                                                        retirementDate={getDateAtAge(questionnaire.simulationAge)}
                                                        legalDate={legalRetirementDate}
                                                        mode="start"
                                                    />
                                                </td>
                                                <td className="p-2 w-[100px]">
                                                    <RadioGroup
                                                        value={benefitsData.lppCurrentInvested ? 'yes' : 'no'}
                                                        onValueChange={(val) => updateLppCurrentProjection('lppCurrentInvested', val === 'yes')}
                                                        className="flex gap-4"
                                                    >
                                                        <div className="flex items-center space-x-1">
                                                            <RadioGroupItem value="yes" id="lpp-yes" />
                                                            <Label htmlFor="lpp-yes">{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <RadioGroupItem value="no" id="lpp-no" />
                                                            <Label htmlFor="lpp-no">{language === 'fr' ? 'Non' : 'No'}</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </td>
                                                <td className="p-2 w-[100px]">
                                                    {benefitsData.lppCurrentInvested && (
                                                        <Select
                                                            value={benefitsData.lppCurrentReturn}
                                                            onValueChange={(val) => updateLppCurrentProjection('lppCurrentReturn', val)}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0.005">0.5%</SelectItem>
                                                                <SelectItem value="0.01">1.0%</SelectItem>
                                                                <SelectItem value="0.015">1.5%</SelectItem>
                                                                <SelectItem value="0.02">2.0%</SelectItem>
                                                                <SelectItem value="0.025">2.5%</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </td>
                                                <td className="p-2 w-[150px]">
                                                    <Input
                                                        type="text"
                                                        placeholder=""
                                                        value={(benefitsData.lppCurrentInitialAmount || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                        onChange={(e) => {
                                                            const rawValue = e.target.value.replace(/'/g, '');
                                                            if (!isNaN(rawValue) || rawValue === '') {
                                                                updateLppCurrentProjection('lppCurrentInitialAmount', rawValue);
                                                            }
                                                        }}
                                                        className={`w-full text-right ${benefitsData.lppCurrentInitialAmount ? 'border-green-500 border-2' : 'border-red-500 border-2'}`}
                                                    />
                                                </td>
                                                <td className="p-2 w-[150px]">
                                                    <Input
                                                        type="text"
                                                        value={(benefitsData.lppCurrentCapital || '').toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'")}
                                                        readOnly
                                                        className="w-full text-right bg-transparent border-none shadow-none focus-visible:ring-0 cursor-default"
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>


                    {/* Action Buttons */}
                    <div className="relative flex justify-center items-center mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="absolute left-0"
                        >
                            {language === 'fr' ? 'Réinitialiser' : 'Reset to defaults'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            size="lg"
                            className="px-12 text-lg"
                        >
                            {saving
                                ? (language === 'fr' ? 'Enregistrement...' : 'Saving...')
                                : (language === 'fr' ? 'Continuer' : 'Continue')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RetirementBenefitsQuestionnaire;
