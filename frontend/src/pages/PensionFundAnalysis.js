import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import PageHeader from '../components/PageHeader';
import { Slider } from '../components/ui/slider';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from '../utils/toast';
import { getUserData, getScenarioData, getRetirementData, saveRetirementData } from '../utils/database';

const formatNumberHelper = (value) => {
    if (value === '' || value === undefined || value === null) return '';
    const numericStr = String(value).replace(/[^0-9.]/g, '');
    if (!numericStr) return '';
    const num = parseFloat(numericStr);
    if (isNaN(num)) return numericStr;
    return num.toLocaleString('de-CH').replace(/,/g, "'");
};

const formatPercentHelper = (value) => {
    if (value === '' || value === undefined || value === null) return '';
    const numericStr = String(value).replace(/[^0-9.]/g, '');
    if (!numericStr) return '';
    const num = parseFloat(numericStr);
    if (isNaN(num)) return numericStr;
    return num.toFixed(2) + '%';
};

const parseFormattedNumber = (value) => {
    if (!value) return '';
    // Strip everything except digits and dot to get a clean numeric string
    return value.toString().replace(/[^0-9.]/g, '');
};

const parseToNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleaned = value.toString().replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
};

const formatDate = (dateString, language) => {
    if (!dateString) return '';
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * findYieldRate: Calculates the required annual yield to pay out a pension from a capital over a number of years.
 * Formula: Capital = Pension * (1 - (1 + r)^-n) / r
 * where r is the annual rate and n is the number of years.
 */
const findYieldRate = (capital, pension, years) => {
    if (!capital || !pension || !years || capital <= 0 || pension <= 0 || years <= 0) return 0;
    
    // Total payout without interest
    if (pension * years <= capital) return 0;

    let low = 0;
    let high = 1.0; // Assume 100% max yield
    let mid = 0;
    
    // Binary search for r
    for (let i = 0; i < 40; i++) {
        mid = (low + high) / 2;
        if (mid === 0) {
            low = 0.00001; 
            continue;
        }
        
        // Present value of an annuity formula
        const pv = pension * (1 - Math.pow(1 + mid, -years)) / mid;
        
        if (pv > capital) {
            low = mid;
        } else {
            high = mid;
        }
    }
    
    return mid * 100; // Return as percentage
};

const PensionFundAnalysis = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Core Data
    const [userData, setUserData] = useState(null);
    const [scenarioData, setScenarioData] = useState(null);
    const [activeTab, setActiveTab] = useState('p1');

    // Default grid structure
    const defaultGrid = Array(8).fill(null).reduce((acc, _, i) => {
        const age = 58 + i;
        acc[age] = { a: '', b: '0.00%', c: '', d: '', e: '' };
        return acc;
    }, {});

    // Input States
    const [p1Data, setP1Data] = useState({
        savingsAccountValue: '',
        savingsAccountDate: '',
        monthlyContributions: '',
        simulationYield: '3.00',
        capitalSplit: 50,
        selectedOption: 'option1',
        gridData: defaultGrid
    });
    
    const [p2Data, setP2Data] = useState({
        savingsAccountValue: '',
        savingsAccountDate: '',
        monthlyContributions: '',
        simulationYield: '3.00',
        capitalSplit: 50,
        selectedOption: 'option1',
        gridData: defaultGrid
    });

    // Tracking which fields have been touched/edited for green border
    const [touchedFields, setTouchedFields] = useState({});
    
    // Tracking interpolated fields for orange border
    const [interpolatedFields, setInterpolatedFields] = useState({});

    // Active State based on tab
    const activeData = activeTab === 'p1' ? p1Data : p2Data;
    const setActiveData = activeTab === 'p1' ? setP1Data : setP2Data;

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const initializeData = async () => {
            try {
                const fetchedUserData = await getUserData(user.email, masterKey);
                if (!fetchedUserData) {
                    navigate('/personal-info');
                    return;
                }
                setUserData(fetchedUserData);

                const fetchedScenarioData = await getScenarioData(user.email, masterKey);
                setScenarioData(fetchedScenarioData || {});

                const retirementData = await getRetirementData(user.email, masterKey);
                if (retirementData) {
                    let masterTouched = {};
                    let masterInterpolated = {};

                    if (retirementData.p1?.pensionAnalysis) {
                        const pa = retirementData.p1.pensionAnalysis;
                        if (pa.pData) setP1Data(prev => ({ ...prev, ...pa.pData }));
                        if (pa.touchedFields) masterTouched = { ...masterTouched, ...pa.touchedFields };
                        if (pa.interpolatedFields) masterInterpolated = { ...masterInterpolated, ...pa.interpolatedFields };
                    }
                    if (retirementData.p2?.pensionAnalysis) {
                        const pa = retirementData.p2.pensionAnalysis;
                        if (pa.pData) setP2Data(prev => ({ ...prev, ...pa.pData }));
                        if (pa.touchedFields) masterTouched = { ...masterTouched, ...pa.touchedFields };
                        if (pa.interpolatedFields) masterInterpolated = { ...masterInterpolated, ...pa.interpolatedFields };
                    }
                    setTouchedFields(masterTouched);
                    setInterpolatedFields(masterInterpolated);
                }

            } catch (error) {
                console.error('Error initializing data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        initializeData();
    }, [user, masterKey, navigate, t]);

    // Auto-save logic (Debounced)
    useEffect(() => {
        if (loading || saving) return;
        const timer = setTimeout(() => {
            persistAllData();
        }, 2000); // 2 seconds debounce
        return () => clearTimeout(timer);
    }, [p1Data, p2Data, touchedFields, interpolatedFields]);

    // Robust Save Function that handles ALL data
    const persistAllData = async (navigateAfter = false) => {
        if (!user || !masterKey || !userData) return;
        
        try {
            const currentData = await getRetirementData(user.email, masterKey);
            if (!currentData) return;

            const updatedData = { ...currentData };

            // Save P1 Simulation
            if (!updatedData.p1) updatedData.p1 = { questionnaire: {}, benefitsData: { lppByAge: {} } };
            updatedData.p1.pensionAnalysis = {
                pData: p1Data,
                touchedFields,
                interpolatedFields
            };

            // Save P2 Simulation if applicable
            if (userData.analysisType === 'couple') {
                if (!updatedData.p2) updatedData.p2 = { questionnaire: {}, benefitsData: { lppByAge: {} } };
                updatedData.p2.pensionAnalysis = {
                    pData: p2Data,
                    touchedFields,
                    interpolatedFields
                };
            }

            // If we are applying, also update the questionnaire mapping for the active tab
            if (navigateAfter) {
                const personKey = activeTab === 'p1' ? 'p1' : 'p2';
                const pData = activeTab === 'p1' ? p1Data : p2Data;
                const split = pData.capitalSplit;
                const option = pData.selectedOption;

                const targetQuestionnaire = { ...updatedData[personKey].questionnaire };
                const targetBenefits = { ...updatedData[personKey].benefitsData };
                const targetLppByAge = { ...targetBenefits.lppByAge };

                if (split === 0) targetQuestionnaire.benefitType = 'pension';
                else if (split === 100) targetQuestionnaire.benefitType = 'capital';
                else targetQuestionnaire.benefitType = 'mix';

                const ages = [58, 59, 60, 61, 62, 63, 64, 65];
                const isOption1 = option === 'option1';

                ages.forEach(age => {
                    const gridRow = pData.gridData[age] || {};
                    let sCap = isOption1 ? parseToNumber(gridRow.a) : parseToNumber(gridRow.d);
                    let sPen = isOption1 ? parseToNumber(gridRow.c) : parseToNumber(gridRow.e);
                    
                    targetLppByAge[age] = {
                        ...targetLppByAge[age],
                        pension: sPen > 0 ? Math.round(sPen * ((100 - split) / 100)).toString() : '',
                        capital: sCap > 0 ? Math.round(sCap * (split / 100)).toString() : '',
                    };
                });

                targetBenefits.lppByAge = targetLppByAge;
                updatedData[personKey].questionnaire = targetQuestionnaire;
                updatedData[personKey].benefitsData = targetBenefits;
            }

            await saveRetirementData(user.email, masterKey, updatedData);
            if (navigateAfter) {
                toast.success(t('common.success'));
                navigate('/retirement-inputs', { state: { personId: activeTab } });
            }
        } catch (error) {
            console.error('Error persisting analysis data:', error);
            if (navigateAfter) toast.error(t('common.error'));
        }
    };

    const handleApply = async () => {
        setSaving(true);
        await persistAllData(true);
        setSaving(false);
    };

    const handleReset = async () => {
        if (!user || !masterKey) return;
        
        try {
            // Re-initialize local state to defaults
            const defaultGrid = Array(8).fill(null).reduce((acc, _, i) => {
                const age = 58 + i;
                acc[age] = { a: '', b: '0.00%', c: '', d: '', e: '' };
                return acc;
            }, {});

            setActiveData({
                savingsAccountValue: '',
                savingsAccountDate: '',
                monthlyContributions: '',
                simulationYield: '3.00',
                capitalSplit: 50,
                selectedOption: 'option1',
                gridData: defaultGrid
            });
            
            // Clear metadata
            const newTouched = { ...touchedFields };
            const newInterpolated = { ...interpolatedFields };
            const prefix = `${activeTab}_`;
            Object.keys(newTouched).forEach(k => { if (k.startsWith(prefix)) delete newTouched[k]; });
            Object.keys(newInterpolated).forEach(k => { if (k.startsWith(prefix)) delete newInterpolated[k]; });
            setTouchedFields(newTouched);
            setInterpolatedFields(newInterpolated);

            // Persist the purge
            const currentData = await getRetirementData(user.email, masterKey);
            if (currentData) {
                const personKey = activeTab === 'p1' ? 'p1' : 'p2';
                if (currentData[personKey]) {
                    delete currentData[personKey].pensionAnalysis;
                    await saveRetirementData(user.email, masterKey, currentData);
                }
            }

            toast.success(t('pensionFund.resetSuccess'));
        } catch (error) {
            console.error('Error resetting data:', error);
            toast.error(t('common.error'));
        }
    };

    const handleInputChange = (field, value) => {
        setActiveData(prev => ({ ...prev, [field]: value }));
        setTouchedFields(prev => ({ ...prev, [`${activeTab}_${field}`]: true }));
    };

    const handleGridInputChange = (age, col, value) => {
        setActiveData(prev => ({
            ...prev,
            gridData: {
                ...prev.gridData,
                [age]: {
                    ...prev.gridData[age],
                    [col]: value
                }
            }
        }));
        setTouchedFields(prev => ({ ...prev, [`${activeTab}_${age}_${col}`]: true }));
        setInterpolatedFields(prev => ({ ...prev, [`${activeTab}_${age}_${col}`]: false }));
    };

    const handleGridInputBlur = (age, col, value) => {
        if (col === 'b' && value) {
            const numericValue = value.toString().replace(/[^0-9.]/g, '');
            if (numericValue && !isNaN(parseFloat(numericValue))) {
                const formatted = parseFloat(numericValue).toFixed(2) + '%';
                handleGridInputChange(age, 'b', formatted);
            }
        }
    };

    const handleInterpolate = (col) => {
        const mc = parseToNumber(activeData.monthlyContributions);
        if (mc <= 0) {
            toast.error(t('pensionFund.errorEmptyMC'));
            return;
        }

        const newGridData = { ...activeData.gridData };
        const newInterpolatedFields = { ...interpolatedFields };
        const ages = [58, 59, 60, 61, 62, 63, 64, 65];
        
        // Find ages with numeric values in the target column
        const filledAges = ages.filter(age => parseToNumber(newGridData[age][col]) > 0);
        
        if (filledAges.length === 0) {
            toast.error(t('pensionFund.errorNoBaseValue'));
            return;
        }

        const minAge = Math.min(...filledAges);
        const yieldRate = col === 'd' ? (parseToNumber(activeData.simulationYield) / 100) : 0;

        // 1. Upward Propagation
        let currentRef = parseToNumber(newGridData[minAge][col]);
        for (let age = minAge + 1; age <= 65; age++) {
            if (!newGridData[age][col]) {
                if (col === 'a') {
                    currentRef += 12 * mc;
                } else {
                    // col === 'd': (Value below) * (1 + yield) + 12 * MC
                    currentRef = (currentRef * (1 + yieldRate)) + (12 * mc);
                }
                newGridData[age] = { ...newGridData[age], [col]: Math.round(currentRef) };
                newInterpolatedFields[`${activeTab}_${age}_${col}`] = true;
            } else {
                currentRef = parseToNumber(newGridData[age][col]);
            }
        }

        // 2. Downward Propagation
        currentRef = parseToNumber(newGridData[minAge][col]);
        for (let age = minAge - 1; age >= 58; age--) {
            if (!newGridData[age][col]) {
                if (col === 'a') {
                    currentRef -= 12 * mc;
                } else {
                    // col === 'd': (Value above - 12 * MC) / (1 + yield)
                    currentRef = (currentRef - (12 * mc)) / (1 + yieldRate);
                }
                newGridData[age] = { ...newGridData[age], [col]: Math.round(Math.max(0, currentRef)) };
                newInterpolatedFields[`${activeTab}_${age}_${col}`] = true;
            } else {
                currentRef = parseToNumber(newGridData[age][col]);
            }
        }

        setActiveData(prev => ({ ...prev, gridData: newGridData }));
        setInterpolatedFields(newInterpolatedFields);
        toast.success(t('common.success'));
    };

    const handleConvert = (targetCol) => {
        const newGridData = { ...activeData.gridData };
        const newInterpolatedFields = { ...interpolatedFields };
        const newTouchedFields = { ...touchedFields };
        const ages = [58, 59, 60, 61, 62, 63, 64, 65];

        ages.forEach(age => {
            const b = parseToNumber(newGridData[age].b) / 100;
            const isBGreen = touchedFields[`${activeTab}_${age}_b`];

            if (targetCol === 'c') {
                const a = parseToNumber(newGridData[age].a);
                const isAGreen = touchedFields[`${activeTab}_${age}_a`] && !interpolatedFields[`${activeTab}_${age}_a`];
                
                if (a > 0 && b > 0) {
                    newGridData[age] = { ...newGridData[age], c: Math.round(a * b) };
                    
                    // Rule: Green if both sources are green. Else Orange.
                    if (isAGreen && isBGreen) {
                        newInterpolatedFields[`${activeTab}_${age}_c`] = false;
                        newTouchedFields[`${activeTab}_${age}_c`] = true;
                    } else {
                        newInterpolatedFields[`${activeTab}_${age}_c`] = true;
                        newTouchedFields[`${activeTab}_${age}_c`] = false;
                    }
                }
            } else if (targetCol === 'e') {
                const d = parseToNumber(newGridData[age].d);
                const isDGreen = touchedFields[`${activeTab}_${age}_d`] && !interpolatedFields[`${activeTab}_${age}_d`];
                
                if (d > 0 && b > 0) {
                    newGridData[age] = { ...newGridData[age], e: Math.round(d * b) };
                    
                    // Rule: Green if both sources are green. Else Orange.
                    if (isDGreen && isBGreen) {
                        newInterpolatedFields[`${activeTab}_${age}_e`] = false;
                        newTouchedFields[`${activeTab}_${age}_e`] = true;
                    } else {
                        newInterpolatedFields[`${activeTab}_${age}_e`] = true;
                        newTouchedFields[`${activeTab}_${age}_e`] = false;
                    }
                }
            }
        });

        setActiveData(prev => ({ ...prev, gridData: newGridData }));
        setInterpolatedFields(newInterpolatedFields);
        setTouchedFields(newTouchedFields);
        toast.success(t('common.success'));
    };

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg">{t('common.loading')}</div>
                </div>
            </div>
        );
    }

    // Determine derived data based on active tab
    const currentWishedRetirementDate = activeTab === 'p1' ? scenarioData?.wishedRetirementDate : scenarioData?.wishedRetirementDate2;
    const currentLifeExpectancy = activeTab === 'p1' ? userData?.lifeExpectancyYears : userData?.lifeExpectancyYears2;
    const currentBirthDate = activeTab === 'p1' ? userData?.birthDate : userData?.birthDate2;

    // Calculate Age Of Death and Wished Retirement Age
    let ageOfDeath = 0;
    let wishedRetirementAge = 0;
    let currentAge = 0;
    
    if (currentBirthDate) {
        const birth = new Date(currentBirthDate);
        const today = new Date();
        
        const getAgeAtDate = (date) => {
            if (!date) return 0;
            const target = new Date(date);
            let age = target.getFullYear() - birth.getFullYear();
            const monthDiff = target.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
                age--;
            }
            return age;
        };

        currentAge = getAgeAtDate(today);
        ageOfDeath = currentAge + (currentLifeExpectancy || 0);
        wishedRetirementAge = getAgeAtDate(currentWishedRetirementDate);
    }

    return (
        <div className="flex-grow py-6 bg-background space-y-8">
            <PageHeader
                title={t('pensionFund.title')}
                subtitle={t('pensionFund.subtitle')}
                showBack={true}
                onBack={async () => {
                    await persistAllData();
                    navigate('/retirement-inputs', { state: { personId: activeTab } });
                }}
            />

            <div className="max-w-[70%] mx-auto px-4 space-y-8 pb-12">
                
                {/* Couple Tabs Selection */}
                {userData?.analysisType === 'couple' && (
                    <div className="flex justify-center mb-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[500px]">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800/40 border border-slate-700/50">
                                <TabsTrigger value="p1" className="text-sm border border-transparent transition-all data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/30">
                                    {userData.firstName || t('income.person1')}
                                </TabsTrigger>
                                <TabsTrigger value="p2" className="text-sm border border-transparent transition-all data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30">
                                    {userData.firstName2 || t('income.person2')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {/* ZONE 1: Explanation Text Placeholder */}
                <Card className="border-slate-700/50">
                    <CardContent className="p-6">
                        <p className="text-muted-foreground italic">
                            {t('pensionFund.zone1Placeholder')}
                        </p>
                    </CardContent>
                </Card>

                {/* ZONE 2: Information fields */}
                <Card className="border-slate-700/50">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr] gap-8">
                            
                            {/* Left Side: Inputs (Block A) */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold">{t('pensionFund.savingsAccount')}</Label>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground flex justify-center">{t('pensionFund.value')}</Label>
                                        <Input
                                            type="text"
                                            className="text-right bg-slate-800/50 opacity-80 border-slate-700/50"
                                            value={formatNumberHelper(activeData.savingsAccountValue)}
                                            onChange={(e) => handleInputChange('savingsAccountValue', parseFormattedNumber(e.target.value))}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground flex justify-center">{t('pensionFund.date')}</Label>
                                        <Input
                                            type="date"
                                            className="bg-slate-800/50 h-10 px-3 opacity-80 border-slate-700/50"
                                            value={activeData.savingsAccountDate}
                                            onChange={(e) => handleInputChange('savingsAccountDate', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold whitespace-nowrap">{t('pensionFund.monthlyContributions')}</Label>
                                    <div className="space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <Input
                                            type="text"
                                            className="text-right bg-slate-800/50 opacity-80 border-slate-700/50"
                                            value={formatNumberHelper(activeData.monthlyContributions)}
                                            onChange={(e) => handleInputChange('monthlyContributions', parseFormattedNumber(e.target.value))}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="hidden sm:flex flex-col space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <div className="h-10"></div> {/* Height matching input */}
                                    </div>
                                </div>
                            </div>

                            {/* Middle Side: Current Data (Block B) */}
                            <div className="space-y-6 md:border-l md:border-slate-700/50 md:pl-8">
                                <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold">{t('pensionFund.currentAge')}</Label>
                                    <div className="space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <Input
                                            readOnly
                                            className="bg-slate-800/50 text-right opacity-80 cursor-not-allowed"
                                            value={currentAge || ''}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold">{t('pensionFund.currentYear')}</Label>
                                    <div className="space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <Input
                                            readOnly
                                            className="bg-slate-800/50 text-right opacity-80 cursor-not-allowed"
                                            value={new Date().getFullYear()}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Read-Only Data (Block B) */}
                            <div className="space-y-6 md:border-l md:border-slate-700/50 md:pl-8">
                                 <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold">{t('pensionFund.desiredRetirementDate')}</Label>
                                    <div className="space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <Input
                                            readOnly
                                            className="bg-slate-800/50 text-right opacity-80 cursor-not-allowed"
                                            value={wishedRetirementAge || ''}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
                                    <Label className="text-sm font-semibold">{t('pensionFund.lifeExpectancy')}</Label>
                                    <div className="space-y-1">
                                        <div className="h-4"></div> {/* Alignment spacer */}
                                        <Input
                                            readOnly
                                            className="bg-slate-800/50 text-right opacity-80 cursor-not-allowed"
                                            value={ageOfDeath || ''}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* ZONE 3: Official Data Table */}
                <Card className="border-slate-700/50 overflow-hidden">
                    <CardContent className="p-6 overflow-x-auto">
                        <div className="w-full min-w-[1100px] space-y-4">
                            <div className="text-lg font-bold text-foreground mb-2">
                                {t('pensionFund.officialDataHeader')}
                            </div>
                            
                            {/* Grid Layout: 3 Blocks with 100px spacing */}
                            <div className="flex justify-between items-start gap-12">
                                
                                {/* Block 1: 3 Columns (A, B, C) */}
                                <div className="flex-[4] space-y-6">
                                    <div className="h-10 flex items-center px-0 w-full">
                                        <span className="text-sm font-bold text-foreground">simulé au tx de 0%</span>
                                    </div>
                                    <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-3 items-center">
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 flex flex-col justify-end">&nbsp;<br/>Age</div>
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end">A<br/>{t('pensionFund.capital')}</div>
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end">B<br/>{t('pensionFund.convRate')}</div>
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end">C<br/>{t('pensionFund.annualPension')}</div>
                                        
                                        {[65, 64, 63, 62, 61, 60, 59, 58].map(age => (
                                            <React.Fragment key={`b1_${age}`}>
                                                <div className="text-sm font-bold text-foreground flex items-center h-10 w-20">{age} ans</div>
                                                <Input
                                                    type="text"
                                                    className={`text-right bg-slate-800/50 opacity-80 text-slate-100 border w-full h-10 text-sm ${interpolatedFields[`${activeTab}_${age}_a`] ? 'border-orange-500' : (touchedFields[`${activeTab}_${age}_a`] ? 'border-green-500' : 'border-slate-700/50')}`}
                                                    value={formatNumberHelper(activeData.gridData[age]?.a)}
                                                    onChange={(e) => handleGridInputChange(age, 'a', parseFormattedNumber(e.target.value))}
                                                    placeholder="0"
                                                />
                                                <Input
                                                    type="text"
                                                    className={`text-right bg-slate-800/50 opacity-80 text-slate-100 border w-full h-10 text-sm ${touchedFields[`${activeTab}_${age}_b`] ? 'border-green-500' : 'border-slate-700/50'}`}
                                                    value={activeData.gridData[age]?.b}
                                                    onChange={(e) => handleGridInputChange(age, 'b', e.target.value)}
                                                    onBlur={(e) => handleGridInputBlur(age, 'b', e.target.value)}
                                                    placeholder="0.00%"
                                                />
                                                <Input
                                                    type="text"
                                                    className={`text-right bg-slate-800/50 opacity-80 text-slate-100 border w-full h-10 text-sm ${interpolatedFields[`${activeTab}_${age}_c`] ? 'border-orange-500' : (touchedFields[`${activeTab}_${age}_c`] ? 'border-green-500' : 'border-slate-700/50')}`}
                                                    value={formatNumberHelper(activeData.gridData[age]?.c)}
                                                    onChange={(e) => handleGridInputChange(age, 'c', parseFormattedNumber(e.target.value))}
                                                    placeholder="0"
                                                />
                                            </React.Fragment>
                                        ))}

                                        {/* Button Footer Block 1 */}
                                        <div /> {/* Spacer for Age column */}
                                        <Button 
                                            size="sm" 
                                            className="h-9 text-[15px] w-full bg-blue-600 hover:bg-blue-700 text-white border-none font-bold shadow-sm transition-colors cursor-pointer"
                                            onClick={() => handleInterpolate('a')}
                                        >
                                            1) interpoler
                                        </Button>
                                        <div /> {/* Spacer for Column B */}
                                        <Button 
                                            size="sm" 
                                            className="h-9 text-[15px] w-full bg-blue-600 hover:bg-blue-700 text-white border-none font-bold shadow-sm transition-colors cursor-pointer"
                                            onClick={() => handleConvert('c')}
                                        >
                                            2) convertir
                                        </Button>
                                    </div>
                                </div>

                                {/* Block 2: 2 Columns (D, E) */}
                                <div className="flex-[2] space-y-6">
                                    <div className="h-10 flex items-center px-0 w-full gap-2">
                                        <span className="text-sm font-bold text-foreground whitespace-nowrap">simulé au taux de</span>
                                        <div className="relative">
                                            <Input 
                                                className={`h-10 w-24 text-right bg-slate-800/50 opacity-80 text-slate-100 font-bold border rounded-md pr-6 text-sm ${touchedFields[`${activeTab}_simulationYield`] ? 'border-green-500' : 'border-slate-700/50'}`} 
                                                value={activeData.simulationYield}
                                                onChange={(e) => handleInputChange('simulationYield', e.target.value)}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-100 font-bold text-xs">%</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 items-center">
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end">D<br/>{t('pensionFund.capital')}</div>
                                        <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end">E<br/>{t('pensionFund.annualPension')}</div>
                                        
                                        {[65, 64, 63, 62, 61, 60, 59, 58].map(age => (
                                            <React.Fragment key={`b2_${age}`}>
                                                <Input
                                                    type="text"
                                                    className={`text-right bg-slate-800/50 opacity-80 text-slate-100 border w-full h-10 text-sm ${interpolatedFields[`${activeTab}_${age}_d`] ? 'border-orange-500' : (touchedFields[`${activeTab}_${age}_d`] ? 'border-green-500' : 'border-slate-700/50')}`}
                                                    value={formatNumberHelper(activeData.gridData[age]?.d)}
                                                    onChange={(e) => handleGridInputChange(age, 'd', parseFormattedNumber(e.target.value))}
                                                    placeholder="0"
                                                />
                                                <Input
                                                    type="text"
                                                    className={`text-right bg-slate-800/50 opacity-80 text-slate-100 border w-full h-10 text-sm ${interpolatedFields[`${activeTab}_${age}_e`] ? 'border-orange-500' : (touchedFields[`${activeTab}_${age}_e`] ? 'border-green-500' : 'border-slate-700/50')}`}
                                                    value={formatNumberHelper(activeData.gridData[age]?.e)}
                                                    onChange={(e) => handleGridInputChange(age, 'e', parseFormattedNumber(e.target.value))}
                                                    placeholder="0"
                                                />
                                            </React.Fragment>
                                        ))}

                                        {/* Button Footer Block 2 */}
                                        <Button 
                                            size="sm" 
                                            className="h-9 text-[15px] w-full bg-blue-600 hover:bg-blue-700 text-white border-none font-bold shadow-sm transition-colors cursor-pointer"
                                            onClick={() => handleInterpolate('d')}
                                        >
                                            1) interpoler
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            className="h-9 text-[15px] w-full bg-blue-600 hover:bg-blue-700 text-white border-none font-bold shadow-sm transition-colors cursor-pointer"
                                            onClick={() => handleConvert('e')}
                                        >
                                            2) convertir
                                        </Button>
                                    </div>
                                </div>

                                {/* Block 3: 5 Columns (Read-only) */}
                                <div className="flex-[5] grid grid-cols-5 gap-3 pt-[64px] items-center">
                                    <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end leading-tight">F<br/>{t('pensionFund.yearsRetirement')}</div>
                                    <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end leading-tight">&nbsp;<br/>C * F</div>
                                    <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end leading-tight">&nbsp;<br/>E * F</div>
                                    <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end leading-tight">Rdt nécessaire<br/>pour verser C avec A</div>
                                    <div className="font-bold text-[13px] text-foreground h-10 pb-2 text-center flex flex-col justify-end leading-tight">Rdt nécessaire<br/>pour verser E avec A</div>
                                    
                                    {[65, 64, 63, 62, 61, 60, 59, 58].map(age => {
                                        const yearsRemaining = ageOfDeath ? Math.max(0, Math.round(ageOfDeath) - age) : 0;
                                        const valC = parseToNumber(activeData.gridData[age]?.c);
                                        const valE = parseToNumber(activeData.gridData[age]?.e);
                                        const valA = parseToNumber(activeData.gridData[age]?.a);

                                        const cf = valC * yearsRemaining;
                                        const ef = valE * yearsRemaining;
                                        
                                        const yield1 = findYieldRate(valA, valC, yearsRemaining);
                                        const yield2 = findYieldRate(valA, valE, yearsRemaining);

                                        const readOnlyCellStyle = "text-right bg-slate-800/50 opacity-80 text-slate-100 px-3 h-10 rounded-md border border-slate-700/50 flex items-center justify-end font-normal text-sm w-full";
                                        const centeredCellStyle = "text-center bg-slate-800/50 opacity-80 text-slate-100 px-3 h-10 rounded-md border border-slate-700/50 flex items-center justify-center font-normal text-sm w-full";

                                        return (
                                            <React.Fragment key={`b3_${age}`}>
                                                <div className={centeredCellStyle}>{yearsRemaining}</div>
                                                <div className={readOnlyCellStyle}>{formatNumberHelper(cf)}</div>
                                                <div className={readOnlyCellStyle}>{formatNumberHelper(ef)}</div>
                                                <div className={readOnlyCellStyle}>
                                                    {yield1 > 0 ? `${yield1.toFixed(2)}%` : '-'}
                                                </div>
                                                <div className={readOnlyCellStyle}>
                                                    {yield2 > 0 ? `${yield2.toFixed(2)}%` : '-'}
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ZONE 4: Retirement Selection Simulation */}
                <Card className="border-slate-700/50">
                    <CardContent className="p-8 space-y-10">
                        <div className="space-y-6 max-w-2xl mx-auto text-center">
                            <Label className="text-xl font-bold text-foreground block mb-8">{t('pensionFund.renteOrCapital')}</Label>
                            
                            <div className="flex justify-between items-end mb-2">
                                <div className="text-center w-24">
                                    <span className="text-sm font-bold text-foreground block mb-1">{t('pensionFund.rente')}</span>
                                    <span className="text-2xl font-black text-blue-500">{100 - activeData.capitalSplit}%</span>
                                </div>
                                <div className="flex-1 px-8 pb-2">
                                    <Slider
                                        defaultValue={[activeData.capitalSplit]}
                                        value={[activeData.capitalSplit]}
                                        max={100}
                                        step={1}
                                        className="w-full"
                                        onValueChange={(vals) => handleInputChange('capitalSplit', vals[0])}
                                    />
                                </div>
                                <div className="text-center w-24">
                                    <span className="text-sm font-bold text-foreground block mb-1">{t('pensionFund.capital')}</span>
                                    <span className="text-2xl font-black text-blue-500">{activeData.capitalSplit}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-20">
                            {/* Left Simulation Table (Official) */}
                            <div className="space-y-4">
                                <div className="h-10 flex items-center justify-center bg-slate-700/30 px-4 rounded-t-md">
                                    <span className="text-[18px] font-bold text-slate-300">Simulation au taux de 0%</span>
                                </div>
                                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
                                    <div /> {/* Age spacer */}
                                    <div className="text-[13px] font-bold text-foreground text-center leading-tight">{t('pensionFund.annualPension')}</div>
                                    <div className="text-[13px] font-bold text-foreground text-center leading-tight">{t('pensionFund.capital')}</div>

                                    {[65, 64, 63, 62, 61, 60, 59, 58].map(age => {
                                        const sourceA = parseToNumber(activeData.gridData[age]?.a);
                                        const sourceC = parseToNumber(activeData.gridData[age]?.c);
                                        const valRente = sourceC * ((100 - activeData.capitalSplit) / 100);
                                        const valCapital = sourceA * (activeData.capitalSplit / 100);
                                        
                                        const getBorder = (col) => {
                                            const k = `${activeTab}_${age}_${col}`;
                                            if (interpolatedFields[k]) return 'border-orange-500';
                                            if (touchedFields[k]) return 'border-green-500';
                                            return 'border-slate-700/50';
                                        };
                                        
                                        const cellStyle = "text-right bg-slate-800/50 opacity-80 text-slate-100 px-3 h-10 rounded-md border flex items-center justify-end font-normal text-sm w-full";

                                        return (
                                            <React.Fragment key={`z4_l_${age}`}>
                                                <div className="text-sm font-bold text-foreground">{age} ans</div>
                                                <div className={`${cellStyle} ${getBorder('c')}`}>{formatNumberHelper(Math.round(valRente))}</div>
                                                <div className={`${cellStyle} ${getBorder('a')}`}>{formatNumberHelper(Math.round(valCapital))}</div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Simulation Table (Simulated) */}
                            <div className="space-y-4">
                                <div className="h-10 flex items-center justify-center bg-slate-700/30 px-4 rounded-t-md gap-3">
                                    <span className="text-[18px] font-bold text-slate-300">Simulation au taux de</span>
                                    <div className="text-[18px] font-bold text-slate-100 min-w-[40px]">
                                        {activeData.simulationYield}%
                                    </div>
                                </div>
                                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 items-center">
                                    <div /> {/* Age spacer */}
                                    <div className="text-[13px] font-bold text-foreground text-center leading-tight">{t('pensionFund.annualPension')}</div>
                                    <div className="text-[13px] font-bold text-foreground text-center leading-tight">{t('pensionFund.capital')}</div>

                                    {[65, 64, 63, 62, 61, 60, 59, 58].map(age => {
                                        const sourceD = parseToNumber(activeData.gridData[age]?.d);
                                        const sourceE = parseToNumber(activeData.gridData[age]?.e);
                                        const valRente = sourceE * ((100 - activeData.capitalSplit) / 100);
                                        const valCapital = sourceD * (activeData.capitalSplit / 100);
                                        
                                        const getBorder = (col) => {
                                            const k = `${activeTab}_${age}_${col}`;
                                            if (interpolatedFields[k]) return 'border-orange-500';
                                            if (touchedFields[k]) return 'border-green-500';
                                            return 'border-slate-700/50';
                                        };

                                        const cellStyle = "text-right bg-slate-800/50 opacity-80 text-slate-100 px-3 h-10 rounded-md border flex items-center justify-end font-normal text-sm w-full";

                                        return (
                                            <React.Fragment key={`z4_r_${age}`}>
                                                <div className="text-sm font-bold text-foreground text-right pr-4">{age} ans</div>
                                                <div className={`${cellStyle} ${getBorder('e')}`}>{formatNumberHelper(Math.round(valRente))}</div>
                                                <div className={`${cellStyle} ${getBorder('d')}`}>{formatNumberHelper(Math.round(valCapital))}</div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <RadioGroup 
                            value={activeData.selectedOption} 
                            onValueChange={(val) => handleInputChange('selectedOption', val)}
                            className="grid grid-cols-2 gap-20"
                        >
                            <div className="flex justify-center">
                                <div className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-700/20 transition-colors cursor-pointer group">
                                    <RadioGroupItem value="option1" id="option1" className="border-2" />
                                    <Label 
                                        htmlFor="option1" 
                                        className="text-sm font-bold text-foreground cursor-pointer group-hover:text-primary transition-colors"
                                    >
                                        Option 1
                                    </Label>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <div className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-700/20 transition-colors cursor-pointer group">
                                    <RadioGroupItem value="option2" id="option2" className="border-2" />
                                    <Label 
                                        htmlFor="option2" 
                                        className="text-sm font-bold text-foreground cursor-pointer group-hover:text-primary transition-colors"
                                    >
                                        Option 2
                                    </Label>
                                </div>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* ZONE 5: Action Buttons */}
                <div className="relative flex justify-center items-center py-8">
                    <div className="absolute left-0">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            {t('pensionFund.resetDefaults')}
                        </Button>
                    </div>
                    
                    <Button
                        onClick={handleApply}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-12 rounded transition-colors shadow-lg shadow-primary/20"
                    >
                        {saving ? t('pensionFund.saving') : t('pensionFund.applySave')}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default PensionFundAnalysis;
