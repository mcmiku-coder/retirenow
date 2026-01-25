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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { getUserData, getScenarioData, saveScenarioData, getRetirementData } from '../utils/database';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Calendar, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const RetirementParameters = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [wishedRetirementDate, setWishedRetirementDate] = useState('');
    const [retirementLegalDate, setRetirementLegalDate] = useState('');
    const [loading, setLoading] = useState(true);

    // Retirement option: '', 'option1', 'option2', or 'option3'
    const [retirementOption, setRetirementOption] = useState('');

    // Option 1 fields
    const [pensionCapital, setPensionCapital] = useState('');
    const [yearlyReturn, setYearlyReturn] = useState('0');

    // Option 2 fields
    const [earlyRetirementAge, setEarlyRetirementAge] = useState('');
    const [projectedLPPPension, setProjectedLPPPension] = useState('');
    const [projectedLPPCapital, setProjectedLPPCapital] = useState('');
    const [lppPensionFrequency, setLppPensionFrequency] = useState('Monthly');
    const [showLPPPension, setShowLPPPension] = useState(true);
    const [showLPPCapital, setShowLPPCapital] = useState(true);

    // Option 0 fields (Legal Retirement)
    const [projectedLegalLPPPension, setProjectedLegalLPPPension] = useState('');
    const [projectedLegalLPPCapital, setProjectedLegalLPPCapital] = useState('');
    const [projectedLegalLPPRate, setProjectedLegalLPPRate] = useState(''); // New LPP Rate state
    const [legalLppPensionFrequency, setLegalLppPensionFrequency] = useState('Yearly');
    const [showLegalLPPPension, setShowLegalLPPPension] = useState(true);
    const [showLegalLPPCapital, setShowLegalLPPCapital] = useState(true);

    // Option 2 enhanced - Pension/Capital by age table
    const [pensionByAge, setPensionByAge] = useState({
        58: { pension: '', capital: '', rate: '' },
        59: { pension: '', capital: '', rate: '' },
        60: { pension: '', capital: '', rate: '' },
        61: { pension: '', capital: '', rate: '' },
        62: { pension: '', capital: '', rate: '' },
        63: { pension: '', capital: '', rate: '' },
        64: { pension: '', capital: '', rate: '' },
        65: { pension: '', capital: '', rate: '' }
    });

    // Pillars selection state
    const [selectedPillars, setSelectedPillars] = useState({
        avs: false,
        lpp: false,
        lppSup: false,
        threeA: false
    });

    // New Configuration Mode State
    const [isBenefitEditMode, setIsBenefitEditMode] = useState(true);
    const [lppBenefitStrategy, setLppBenefitStrategy] = useState('');
    const [threeAAccountsCount, setThreeAAccountsCount] = useState(1);
    const [lppSupBenefitStrategy, setLppSupBenefitStrategy] = useState('Only Capital');

    // New LPP Conditional Logic State
    const [lppEarlyRetirementOption, setLppEarlyRetirementOption] = useState('');
    const [lppEarliestAge, setLppEarliestAge] = useState('');
    const [lppSimulationAge, setLppSimulationAge] = useState('');
    // Benefits Table Data State
    const [benefitsData, setBenefitsData] = useState({
        avs: { amount: '', frequency: 'Yearly', startDate: '' },
        threeA: { amount: '', frequency: 'One-time', startDate: '' },
        lppSup: { amount: '', frequency: 'One-time', startDate: '' }
    });

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

    // Sync 3a accounts array with count
    useEffect(() => {
        setBenefitsData(prev => {
            // Ensure threeA is array
            const currentThreeA = Array.isArray(prev.threeA) ? prev.threeA : [prev.threeA];

            if (currentThreeA.length === threeAAccountsCount) {
                // If it wasn't an array before, we must update it now
                if (!Array.isArray(prev.threeA)) {
                    return { ...prev, threeA: currentThreeA };
                }
                return prev;
            }

            let newThreeA = [...currentThreeA];
            if (currentThreeA.length < threeAAccountsCount) {
                // Add new accounts
                const defaultDate = currentThreeA[0]?.startDate || ''; // Copy date from first account
                const added = Array.from({ length: threeAAccountsCount - currentThreeA.length }, () => ({
                    amount: '',
                    frequency: 'One-time',
                    startDate: defaultDate
                }));
                newThreeA = [...newThreeA, ...added];
            } else {
                // Remove accounts
                newThreeA = newThreeA.slice(0, threeAAccountsCount);
            }

            return { ...prev, threeA: newThreeA };
        });
    }, [threeAAccountsCount]);

    // Update pension/capital/rate for a specific age with 3-way calculation logic
    const updatePensionByAge = (age, field, value) => {
        setPensionByAge(prev => {
            const current = { ...prev[age], [field]: value };
            const capital = parseFloat(current.capital) || 0;
            const pension = parseFloat(current.pension) || 0;
            const rate = parseFloat(current.rate) || 0;

            // Logic rules:
            // 1. If user edits Rate:
            //    - if Capital > 0 -> Recalc Pension (Steady State / Fill)
            //    - else if Pension > 0 -> Recalc Capital (Fill)
            // 2. If user edits Capital:
            //    - if Rate > 0 -> Recalc Pension (Steady State / Fill)
            //    - else if Pension > 0 -> Recalc Rate (Fill)
            // 3. If user edits Pension:
            //    - if Capital > 0 -> Recalc Rate (Steady State / Fill)
            //    - else if Rate > 0 -> Recalc Capital (Fill)

            if (field === 'rate') {
                if (capital > 0) {
                    current.pension = (capital * (rate / 100)).toFixed(0);
                } else if (pension > 0 && rate > 0) {
                    current.capital = (pension / (rate / 100)).toFixed(0);
                }
            } else if (field === 'capital') {
                if (rate > 0) {
                    current.pension = (capital * (rate / 100)).toFixed(0);
                } else if (pension > 0 && capital > 0) {
                    current.rate = ((pension / capital) * 100).toFixed(2);
                }
            } else if (field === 'pension') {
                if (capital > 0) {
                    current.rate = ((pension / capital) * 100).toFixed(2);
                } else if (rate > 0 && pension > 0) {
                    current.capital = (pension / (rate / 100)).toFixed(0);
                }
            }

            return {
                ...prev,
                [age]: current
            };
        });
    };

    // Unified handler for Legal LPP (65y) fields with 3-way calculation
    const handleLegalLPPChange = (field, value) => {
        let capital = parseFloat(field === 'capital' ? value : projectedLegalLPPCapital) || 0;
        let pension = parseFloat(field === 'pension' ? value : projectedLegalLPPPension) || 0;
        let rate = parseFloat(field === 'rate' ? value : projectedLegalLPPRate) || 0;

        if (field === 'capital') setProjectedLegalLPPCapital(value);
        if (field === 'pension') setProjectedLegalLPPPension(value);
        if (field === 'rate') setProjectedLegalLPPRate(value);

        // Recalculate based on rules
        if (field === 'rate') {
            if (capital > 0) {
                setProjectedLegalLPPPension((capital * (rate / 100)).toFixed(0));
            } else if (pension > 0 && rate > 0) {
                setProjectedLegalLPPCapital((pension / (rate / 100)).toFixed(0));
            }
        } else if (field === 'capital') {
            if (rate > 0) {
                setProjectedLegalLPPPension((capital * (rate / 100)).toFixed(0));
            } else if (pension > 0 && capital > 0) {
                setProjectedLegalLPPRate(((pension / capital) * 100).toFixed(2));
            }
        } else if (field === 'pension') {
            if (capital > 0) {
                setProjectedLegalLPPRate(((pension / capital) * 100).toFixed(2));
            } else if (rate > 0 && pension > 0) {
                setProjectedLegalLPPCapital((pension / (rate / 100)).toFixed(0));
            }
        }
    };

    // Calculate early retirement date based on age
    const calculateEarlyRetirementDate = (age) => {
        if (!retirementLegalDate || !age) return '';
        const legalDate = new Date(retirementLegalDate);
        const yearsDifference = 65 - parseInt(age);
        const earlyDate = new Date(legalDate);
        earlyDate.setFullYear(earlyDate.getFullYear() - yearsDifference);
        return earlyDate.toISOString().split('T')[0];
    };

    const userEmail = user?.email;

    useEffect(() => {
        if (!user || !userEmail || !masterKey) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                const userData = await getUserData(userEmail, masterKey);
                const retirementData = await getRetirementData(userEmail, masterKey);
                const scenarioData = await getScenarioData(userEmail, masterKey);

                // Load legal retirement date from userData (saved by RetirementOverview)
                if (userData && userData.retirementLegalDate) {
                    setRetirementLegalDate(userData.retirementLegalDate);
                }

                if (scenarioData) {
                    setWishedRetirementDate(scenarioData.wishedRetirementDate || retirementData?.retirementLegalDate || '');
                    setRetirementOption(scenarioData.retirementOption || '');
                    setPensionCapital(scenarioData.pensionCapital || '');
                    setYearlyReturn(scenarioData.yearlyReturn || '0');
                    setEarlyRetirementAge(scenarioData.earlyRetirementAge || '62');
                    setProjectedLegalLPPPension(scenarioData.projectedLegalLPPPension || '');
                    setProjectedLegalLPPCapital(scenarioData.projectedLegalLPPCapital || '');
                    setProjectedLegalLPPRate(scenarioData.projectedLegalLPPRate || '');

                    if (scenarioData.selectedPillars) setSelectedPillars(scenarioData.selectedPillars);
                    if (scenarioData.benefitsData) setBenefitsData(scenarioData.benefitsData);

                    // Load New Configuration State
                    if (scenarioData.lppBenefitStrategy) setLppBenefitStrategy(scenarioData.lppBenefitStrategy);
                    if (scenarioData.threeAAccountsCount) setThreeAAccountsCount(scenarioData.threeAAccountsCount);
                    if (scenarioData.lppSupBenefitStrategy) setLppSupBenefitStrategy(scenarioData.lppSupBenefitStrategy);
                    if (scenarioData.lppEarlyRetirementOption) setLppEarlyRetirementOption(scenarioData.lppEarlyRetirementOption);
                    if (scenarioData.lppEarliestAge) setLppEarliestAge(scenarioData.lppEarliestAge);
                    if (scenarioData.lppSimulationAge) setLppSimulationAge(scenarioData.lppSimulationAge);
                    if (scenarioData.isBenefitEditMode !== undefined) setIsBenefitEditMode(scenarioData.isBenefitEditMode);

                    // Load Option 2 specific state
                    setLppPensionFrequency('Yearly');
                    if (scenarioData.showLPPPension !== undefined) setShowLPPPension(scenarioData.showLPPPension);
                    if (scenarioData.showLPPCapital !== undefined) setShowLPPCapital(scenarioData.showLPPCapital);

                    // Load Option 0 specific state
                    setLegalLppPensionFrequency('Yearly');
                    if (scenarioData.showLegalLPPPension !== undefined) setShowLegalLPPPension(scenarioData.showLegalLPPPension);
                    if (scenarioData.showLegalLPPCapital !== undefined) setShowLegalLPPCapital(scenarioData.showLegalLPPCapital);

                    // Helper to ensure YYYY-MM-DD format for Input type="date"
                    const toYYYYMMDD = (dateStr) => {
                        if (!dateStr) return '';
                        if (dateStr.includes('.')) {
                            const [day, month, year] = dateStr.split('.');
                            return `${year}-${month}-${day}`;
                        }
                        if (dateStr.includes('T')) {
                            return dateStr.split('T')[0];
                        }
                        return dateStr;
                    };

                    // Set default start date for benefits if not set
                    const legalDateObj = userData?.retirementLegalDate ? new Date(userData.retirementLegalDate) : new Date('2045-12-01');
                    const defaultDateYMD = legalDateObj.toISOString().split('T')[0];

                    if (!scenarioData.benefitsData) {
                        setBenefitsData(prev => ({
                            avs: { ...prev.avs, startDate: defaultDateYMD },
                            threeA: [{ amount: '', frequency: 'One-time', startDate: defaultDateYMD }], // Init as array
                            lppSup: { ...prev.lppSup, startDate: defaultDateYMD }
                        }));
                    } else {
                        // Handle migration of threeA from object to array
                        let threeAData = [{ amount: '', frequency: 'One-time', startDate: defaultDateYMD }];
                        if (scenarioData.benefitsData.threeA) {
                            if (Array.isArray(scenarioData.benefitsData.threeA)) {
                                threeAData = scenarioData.benefitsData.threeA.map(item => ({
                                    ...item,
                                    startDate: toYYYYMMDD(item?.startDate || defaultDateYMD)
                                }));
                            } else {
                                // Migrate single object to array
                                threeAData = [{
                                    ...scenarioData.benefitsData.threeA,
                                    startDate: toYYYYMMDD(scenarioData.benefitsData.threeA?.startDate || defaultDateYMD)
                                }];
                            }
                        }

                        // Update count based on loaded data
                        if (Array.isArray(threeAData)) {
                            // Defer this update slightly or just set it: NO, setHooks handles this.
                            // But distinct 3a count state needs to match
                            if (threeAData.length !== threeAAccountsCount) {
                                setThreeAAccountsCount(threeAData.length);
                            }
                        }

                        setBenefitsData(prev => ({
                            ...prev,
                            avs: {
                                ...prev.avs,
                                startDate: toYYYYMMDD(prev.avs?.startDate || defaultDateYMD)
                            },
                            threeA: threeAData,
                            lppSup: {
                                ...prev.lppSup,
                                startDate: toYYYYMMDD(prev.lppSup?.startDate || defaultDateYMD)
                            }
                        }));
                    }

                    // Convert preRetirementRows array back to pensionByAge object
                    if (scenarioData.preRetirementRows && Array.isArray(scenarioData.preRetirementRows)) {
                        const dataObj = {};
                        scenarioData.preRetirementRows.forEach(row => {
                            dataObj[row.age] = {
                                pension: row.pension || '',
                                capital: row.capital || '',
                                rate: row.rate || ''
                            };
                        });
                        setPensionByAge(dataObj);
                    }
                } else if (retirementData) {
                    setWishedRetirementDate(retirementData.retirementLegalDate || '');
                }
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Error loading data');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, userEmail, masterKey, navigate]);

    const handleContinue = async () => {
        // Deduce retirement option from New LPP Logic
        let derivedRetirementOption = 'option0';
        if (selectedPillars.lpp && lppEarlyRetirementOption === 'Yes') {
            derivedRetirementOption = 'option2';
        }
        setRetirementOption(derivedRetirementOption);

        // Calculate retirement date
        let effectiveRetirementDate = wishedRetirementDate;

        if (derivedRetirementOption === 'option2') {
            // Use lppSimulationAge for calculation
            try {
                const userData = await getUserData(userEmail, masterKey);
                if (userData && userData.birthDate) {
                    const birthDate = new Date(userData.birthDate);
                    const calculatedRetirementDate = new Date(birthDate);
                    // Use lppSimulationAge if available, otherwise fallback or default
                    const ageToUse = lppSimulationAge || 65;
                    calculatedRetirementDate.setFullYear(calculatedRetirementDate.getFullYear() + parseInt(ageToUse));
                    calculatedRetirementDate.setMonth(calculatedRetirementDate.getMonth() + 1);
                    effectiveRetirementDate = calculatedRetirementDate.toISOString().split('T')[0];
                    setWishedRetirementDate(effectiveRetirementDate);
                }
            } catch (error) {
                console.error('Error calculating retirement date:', error);
            }
        } else {
            // Option 0: Legal Retirement Date (65y roughly)
            effectiveRetirementDate = retirementLegalDate;
            setWishedRetirementDate(effectiveRetirementDate);
        }

        // Validate retirement date
        if (!effectiveRetirementDate) {
            toast.error(language === 'fr' ? 'Veuillez sélectionner une date de retraite' : 'Please select a retirement date');
            return;
        }

        try {
            const scenarioData = await getScenarioData(userEmail, masterKey) || {};

            // Convert pensionByAge object to array format for storage
            const preRetirementRows = Object.entries(pensionByAge).map(([age, data]) => ({
                age: parseInt(age),
                pension: data.pension || '',
                capital: data.capital || '',
                rate: data.rate || ''
            }));

            const updatedScenarioData = {
                ...scenarioData,
                wishedRetirementDate: effectiveRetirementDate,
                retirementOption: derivedRetirementOption,
                pensionCapital,
                yearlyReturn,
                earlyRetirementAge: lppSimulationAge,
                projectedLPPPension,
                projectedLPPCapital,
                preRetirementRows,
                projectedLegalLPPPension,
                projectedLegalLPPCapital,
                projectedLegalLPPRate,
                selectedPillars,
                benefitsData,

                // New configuration fields
                isBenefitEditMode,
                lppBenefitStrategy,
                threeAAccountsCount,
                lppSupBenefitStrategy,
                lppEarlyRetirementOption,
                lppEarliestAge,
                lppSimulationAge,

                lppPensionFrequency,
                showLPPPension,
                showLPPCapital,
                legalLppPensionFrequency,
                showLegalLPPPension,
                showLegalLPPCapital
            };

            await saveScenarioData(userEmail, masterKey, updatedScenarioData);
            navigate('/data-review');
        } catch (error) {
            console.error('Error saving data:', error);
            toast.error('Error saving data');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6">
            <div className="max-w-6xl mx-auto mb-6 px-4">
            </div>

            <PageHeader
                title={language === 'fr' ? 'Options de simulation et saisie des prestations de retraite' : 'Simulation options and retirement benefits inputs'}
            />

            <div className="max-w-6xl mx-auto">

                <div className="space-y-6">
                    {/* Pillars Configurator */}
                    {isBenefitEditMode ? (
                        /* EDIT MODE */
                        <div className="rounded-xl p-6 bg-slate-800 border border-slate-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                                <CardTitle className="text-white">
                                    {language === 'fr'
                                        ? 'Sélectionnez les piliers de retraite dont vous bénéficierez et comment vous prévoyez de les utiliser'
                                        : 'Select the retirement pilars that you will benefit from and how you plan to use them'}
                                </CardTitle>
                                <div className="flex gap-3 shrink-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedPillars({ avs: false, lpp: false, lppSup: false, threeA: false });
                                            setLppBenefitStrategy('');
                                            setThreeAAccountsCount(1);
                                            setLppSupBenefitStrategy('Only Capital');
                                            setLppEarlyRetirementOption('');
                                            setLppEarliestAge('');
                                            setLppSimulationAge('');
                                        }}
                                        className="border-gray-600 text-gray-300 hover:bg-slate-700 hover:text-white h-8"
                                    >
                                        {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                                    </Button>
                                    <Button
                                        onClick={() => setIsBenefitEditMode(false)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 min-w-[100px]"
                                    >
                                        {language === 'fr' ? 'Continuer' : 'Continue'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-6 pl-2">
                                {/* AVS ROW */}
                                <div className="flex items-center h-10">
                                    <label className="flex items-center gap-3 cursor-pointer min-w-[200px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedPillars.avs}
                                            onChange={(e) => setSelectedPillars(prev => ({ ...prev, avs: e.target.checked }))}
                                            className="w-5 h-5 rounded border-gray-600 bg-slate-900 text-blue-600 focus:ring-blue-500 hover:border-blue-500 transition-colors"
                                        />
                                        <span className="text-white font-medium">AVS</span>
                                    </label>
                                </div>

                                {/* LPP ROW */}
                                <div className="flex items-start gap-4 min-h-[40px]">
                                    <label className="flex items-center gap-3 cursor-pointer min-w-[200px] h-9">
                                        <input
                                            type="checkbox"
                                            checked={selectedPillars.lpp}
                                            onChange={(e) => setSelectedPillars(prev => ({ ...prev, lpp: e.target.checked }))}
                                            className="w-5 h-5 rounded border-gray-600 bg-slate-900 text-blue-600 focus:ring-blue-500 hover:border-blue-500 transition-colors"
                                        />
                                        <span className="text-white font-medium">{language === 'fr' ? 'LPP' : 'LPP Pension plan'}</span>
                                    </label>

                                    {selectedPillars.lpp && (
                                        <div className="flex flex-col gap-4 flex-1 animate-in slide-in-from-left-2 duration-200">
                                            {/* Q1: Early Retirement Options */}
                                            <div className="flex items-center justify-end gap-4 h-9">
                                                <span className="text-gray-300 text-sm">
                                                    {language === 'fr' ? 'votre plan offre-t-il des options de retraite anticipée ?' : 'does you plan offer early retirement options?'}
                                                </span>
                                                <Select value={lppEarlyRetirementOption} onValueChange={setLppEarlyRetirementOption}>
                                                    <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Please select'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Yes">{language === 'fr' ? 'Oui' : 'Yes'}</SelectItem>
                                                        <SelectItem value="No">{language === 'fr' ? 'Non' : 'No'}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Q2 & Q3: Only if Q1 is Yes */}
                                            {
                                                lppEarlyRetirementOption === 'Yes' && (
                                                    <>
                                                        {/* Q2: Earliest Age */}
                                                        <div className="flex items-center justify-end gap-4 h-9 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <span className="text-gray-300 text-sm">
                                                                {language === 'fr' ? 'quel est l\'âge de retraite le plus bas offert ?' : 'what is the earliest retirement age offered?'}
                                                            </span>
                                                            <Select value={lppEarliestAge.toString()} onValueChange={(v) => {
                                                                const val = parseInt(v);
                                                                setLppEarliestAge(val);
                                                                // Ensure simulation age is at least this value
                                                                if (lppSimulationAge < val) setLppSimulationAge(val);
                                                            }}>
                                                                <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Please select'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {[58, 59, 60, 61, 62, 63, 64].map(age => (
                                                                        <SelectItem key={age} value={age.toString()}>{age}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Q3: Simulation Age */}
                                                        <div className="flex items-center justify-end gap-4 h-9 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <span className="text-gray-300 text-sm">
                                                                {language === 'fr' ? 'à quel âge souhaitez-vous simuler la faisabilité de votre retraite ?' : 'at what age would you like to simulate your retirement feasability?'}
                                                            </span>
                                                            <Select value={lppSimulationAge.toString()} onValueChange={(v) => setLppSimulationAge(parseInt(v))}>
                                                                <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Please select'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Array.from({ length: 64 - (lppEarliestAge || 58) + 1 }, (_, i) => (lppEarliestAge || 58) + i).map(age => (
                                                                        <SelectItem key={age} value={age.toString()}>{age}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </>
                                                )
                                            }

                                            {/* Q4: Benefit Type (Always Show) */}
                                            <div className="flex items-center justify-end gap-4 h-9">
                                                <span className="text-gray-300 text-sm">
                                                    {language === 'fr' ? 'quel type de prestation choisirez-vous (si applicable)' : 'what type of benefit will choose (if applicable)?'}
                                                </span>
                                                <Select value={lppBenefitStrategy} onValueChange={setLppBenefitStrategy}>
                                                    <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                        <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Please select'} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Only Pension">{language === 'fr' ? 'Rente uniquement' : 'Only Pension'}</SelectItem>
                                                        <SelectItem value="Only Capital">{language === 'fr' ? 'Capital uniquement' : 'Only Capital'}</SelectItem>
                                                        <SelectItem value="Mix of Pension and Capital">{language === 'fr' ? 'Mixte (Rente et Capital)' : 'Mix of Pension and Capital'}</SelectItem>
                                                        <SelectItem value="I don't know yet">{language === 'fr' ? 'Je ne sais pas encore' : 'I don\'t know yet'}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                        </div >
                                    )}
                                </div >

                                {/* 3a ROW */}
                                < div className="flex items-center gap-4 min-h-[40px]" >
                                    <label className="flex items-center gap-3 cursor-pointer min-w-[200px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedPillars.threeA}
                                            onChange={(e) => setSelectedPillars(prev => ({ ...prev, threeA: e.target.checked }))}
                                            className="w-5 h-5 rounded border-gray-600 bg-slate-900 text-blue-600 focus:ring-blue-500 hover:border-blue-500 transition-colors"
                                        />
                                        <span className="text-white font-medium">3a</span>
                                    </label>

                                    {
                                        selectedPillars.threeA && (
                                            <div className="flex items-center gap-4 flex-1 animate-in slide-in-from-left-2 duration-200">
                                                <span className="text-gray-300 text-sm ml-auto mr-4">number of 3a accounts</span>
                                                <Select value={threeAAccountsCount.toString()} onValueChange={(v) => setThreeAAccountsCount(parseInt(v))}>
                                                    <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[1, 2, 3, 4, 5].map(num => (
                                                            <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )
                                    }
                                </div >

                                {/* SUP LPP ROW */}
                                < div className="flex items-center gap-4 min-h-[40px]" >
                                    <label className="flex items-center gap-3 cursor-pointer min-w-[200px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedPillars.lppSup}
                                            onChange={(e) => setSelectedPillars(prev => ({ ...prev, lppSup: e.target.checked }))}
                                            className="w-5 h-5 rounded border-gray-600 bg-slate-900 text-blue-600 focus:ring-blue-500 hover:border-blue-500 transition-colors"
                                        />
                                        <span className="text-white font-medium">{language === 'fr' ? 'Capital de pension supplémentaire' : 'Supplementary Pension plan'}</span>
                                    </label>

                                    {
                                        selectedPillars.lppSup && (
                                            <div className="flex items-center gap-4 flex-1 animate-in slide-in-from-left-2 duration-200">
                                                <span className="text-gray-300 text-sm ml-auto mr-4">
                                                    {language === 'fr' ? 'quel type de prestation choisirez-vous (si applicable)' : 'what type of benefit will choose (if applicable)'}
                                                </span>
                                                <Select value={lppSupBenefitStrategy} onValueChange={setLppSupBenefitStrategy}>
                                                    <SelectTrigger className="w-[300px] h-9 bg-slate-700 border-slate-600 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Only Pension">{language === 'fr' ? 'Rente uniquement' : 'Only Pension'}</SelectItem>
                                                        <SelectItem value="Only Capital">{language === 'fr' ? 'Capital uniquement' : 'Only Capital'}</SelectItem>
                                                        <SelectItem value="Mix of Pension and Capital">{language === 'fr' ? 'Mixte (Rente et Capital)' : 'Mix of Pension and Capital'}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )
                                    }
                                </div >
                            </div >
                        </div >
                    ) : (
                        /* VIEW MODE */
                        <div className="border-2 border-blue-600 rounded-xl p-3 bg-[#0B0C10] flex items-center justify-between animate-in fade-in duration-200">
                            <span className="text-gray-300 pl-2">
                                {language === 'fr'
                                    ? 'Sélectionnez les piliers de retraite dont vous bénéficierez et comment vous prévoyez de les utiliser'
                                    : 'Select the retirement pilars that you will benefit from and how you plan to use them'}
                            </span>
                            <Button
                                onClick={() => setIsBenefitEditMode(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-[100px]"
                            >
                                {language === 'fr' ? 'Modifier' : 'Edit'}
                            </Button>
                        </div>
                    )}

                    {/* Old Table Section - REMOVED (Replaced by Unified Table below) */}
                    {
                        false && !isBenefitEditMode && (selectedPillars.avs || selectedPillars.threeA || selectedPillars.lppSup) && (
                            <Card className="bg-slate-900 border-slate-800">
                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="text-xs text-gray-200 uppercase bg-slate-800">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 rounded-l-lg">{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th scope="col" className="px-4 py-3">{language === 'fr' ? 'Date de début' : 'Start Date'}</th>
                                                <th scope="col" className="px-4 py-3">{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th scope="col" className="px-4 py-3">{language === 'fr' ? 'Fréquence' : 'Frequency'}</th>
                                                <th scope="col" className="px-4 py-3 rounded-r-lg text-right">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* AVS Row */}
                                            {selectedPillars.avs && (
                                                <tr className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-white">AVS</td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="date"
                                                            value={benefitsData.avs.startDate}
                                                            onChange={(e) => updateBenefitData('avs', 'startDate', e.target.value)}
                                                            className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                            disabled={true}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="text"
                                                            value={benefitsData.avs.amount ? benefitsData.avs.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    updateBenefitData('avs', 'amount', rawValue);
                                                                }
                                                            }}
                                                            className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-4 items-center">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${benefitsData.avs.frequency === 'Monthly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                    {benefitsData.avs.frequency === 'Monthly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                </div>
                                                                <input type="radio" className="hidden" checked={benefitsData.avs.frequency === 'Monthly'} onChange={() => updateBenefitData('avs', 'frequency', 'Monthly')} />
                                                                <span>Monthly</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${benefitsData.avs.frequency === 'Yearly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                    {benefitsData.avs.frequency === 'Yearly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                </div>
                                                                <input type="radio" className="hidden" checked={benefitsData.avs.frequency === 'Yearly'} onChange={() => updateBenefitData('avs', 'frequency', 'Yearly')} />
                                                                <span>Yearly</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20" onClick={() => setSelectedPillars(prev => ({ ...prev, avs: false }))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )}
                                            {/* 3a Row */}
                                            {selectedPillars.threeA && (
                                                <tr className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-white">3a</td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="date"
                                                            value={benefitsData.threeA.startDate}
                                                            onChange={(e) => updateBenefitData('threeA', 'startDate', e.target.value)}
                                                            className="h-8 bg-black/20 border-slate-700 w-[140px] text-white"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="text"
                                                            value={benefitsData.threeA.amount ? benefitsData.threeA.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    updateBenefitData('threeA', 'amount', rawValue);
                                                                }
                                                            }}
                                                            className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-4 items-center">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${benefitsData.threeA.frequency === 'One-time' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                    {benefitsData.threeA.frequency === 'One-time' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                </div>
                                                                <input type="radio" className="hidden" checked={benefitsData.threeA.frequency === 'One-time'} onChange={() => updateBenefitData('threeA', 'frequency', 'One-time')} />
                                                                <span>Once</span>
                                                            </label>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20" onClick={() => setSelectedPillars(prev => ({ ...prev, threeA: false }))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Option 2 LPP Rows (Pension and Capital) - REMOVED to avoid duplication with Main Card */}
                                            {/* Option 0 LPP Rows (Pension and Capital at 65) - REMOVED to avoid duplication with Main Card */}
                                            {/* Option 1 LPP Row (Pension Capital) */}
                                            {retirementOption === 'option1' && (
                                                <tr className="bg-slate-900 hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-white">{language === 'fr' ? 'Statut actuel du capital de prévoyance' : 'Current pension plan capital status'}</td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="date"
                                                            value={wishedRetirementDate || ''}
                                                            className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                            disabled
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="text"
                                                            value={pensionCapital ? pensionCapital.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    setPensionCapital(rawValue);
                                                                }
                                                            }}
                                                            className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-4 items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                                </div>
                                                                <span>Once</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:bg-gray-800/20" title="This field is required for this option and cannot be deleted">
                                                            {/* Locked/Info icon or just empty to signify no delete */}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Supp LPP Row */}
                                            {selectedPillars.lppSup && (
                                                <tr className="bg-slate-900 hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-white">{language === 'fr' ? 'Capital de pension supplémentaire' : 'Supplementary Pension capital'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="h-8 flex items-center">
                                                            {retirementOption === 'option2' && earlyRetirementAge ? (
                                                                <Input
                                                                    type="date"
                                                                    value={calculateEarlyRetirementDate(earlyRetirementAge) || ''}
                                                                    className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                    disabled
                                                                />
                                                            ) : (
                                                                <Input
                                                                    type="date"
                                                                    value={benefitsData.lppSup.startDate || ''}
                                                                    className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                    disabled
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            type="text"
                                                            value={benefitsData.lppSup.amount ? benefitsData.lppSup.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    updateBenefitData('lppSup', 'amount', rawValue);
                                                                }
                                                            }}
                                                            className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-4 items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center">
                                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                                </div>
                                                                <span>Once</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20" onClick={() => setSelectedPillars(prev => ({ ...prev, lppSup: false }))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )}
                                            {/* Option 3 LPP Rows (Dynamic - one pair per year from selected age to 65) */}
                                            {retirementOption === 'option3' && option3EarlyAge && (() => {
                                                const maxYearsEarlier = 65 - parseInt(option3EarlyAge);
                                                const yearsToShow = Array.from({ length: maxYearsEarlier + 1 }, (_, i) => i);

                                                const updatePreRetirementData = (age, field, value) => {
                                                    setPreRetirementData(prev => ({
                                                        ...prev,
                                                        [age]: {
                                                            ...prev[age],
                                                            [field]: value
                                                        }
                                                    }));
                                                };

                                                const calculateRetirementDateForAge = (age) => {
                                                    if (!retirementLegalDate) return '-';
                                                    const legalDate = new Date(retirementLegalDate);
                                                    const yearsDifference = 65 - parseInt(age);
                                                    const earlyDate = new Date(legalDate);
                                                    earlyDate.setFullYear(earlyDate.getFullYear() - yearsDifference);
                                                    return earlyDate.toISOString().split('T')[0];
                                                };

                                                return yearsToShow.map(year => {
                                                    const age = 65 - year;
                                                    const ageData = preRetirementData[age] || { pension: '', capital: '', frequency: 'Monthly' };

                                                    return (
                                                        <React.Fragment key={age}>
                                                            {/* LPP Pension Row */}
                                                            <tr className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                                <td className="px-4 py-3 font-medium text-white">
                                                                    {language === 'fr'
                                                                        ? `Pension LPP projetée à ${age} ans`
                                                                        : `Projected LPP Pension at ${age}y`}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Input
                                                                        type="date"
                                                                        value={calculateRetirementDateForAge(age)}
                                                                        className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                        disabled
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Input
                                                                        type="text"
                                                                        value={ageData.pension ? ageData.pension.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                                        onChange={(e) => {
                                                                            const rawValue = e.target.value.replace(/'/g, '');
                                                                            if (!isNaN(rawValue)) {
                                                                                updatePreRetirementData(age, 'pension', rawValue);
                                                                            }
                                                                        }}
                                                                        className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex gap-4 items-center">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${(ageData.frequency || 'Monthly') === 'Monthly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                                {(ageData.frequency || 'Monthly') === 'Monthly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                            </div>
                                                                            <input type="radio" className="hidden" checked={(ageData.frequency || 'Monthly') === 'Monthly'} onChange={() => updatePreRetirementData(age, 'frequency', 'Monthly')} />
                                                                            <span>Monthly</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ageData.frequency === 'Yearly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                                {ageData.frequency === 'Yearly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                            </div>
                                                                            <input type="radio" className="hidden" checked={ageData.frequency === 'Yearly'} onChange={() => updatePreRetirementData(age, 'frequency', 'Yearly')} />
                                                                            <span>Yearly</span>
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-600 cursor-not-allowed"
                                                                        disabled
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                            {/* LPP Capital Row */}
                                                            <tr className="bg-slate-900 hover:bg-slate-800/50">
                                                                <td className="px-4 py-3 font-medium text-white">
                                                                    {language === 'fr'
                                                                        ? `Capital LPP projeté à ${age} ans`
                                                                        : `Projected LPP Capital at ${age}y`}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Input
                                                                        type="date"
                                                                        value={calculateRetirementDateForAge(age)}
                                                                        className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                        disabled
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Input
                                                                        type="text"
                                                                        value={ageData.capital ? ageData.capital.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                                        onChange={(e) => {
                                                                            const rawValue = e.target.value.replace(/'/g, '');
                                                                            if (!isNaN(rawValue)) {
                                                                                updatePreRetirementData(age, 'capital', rawValue);
                                                                            }
                                                                        }}
                                                                        className="h-8 bg-black/20 border-slate-700 w-32 text-right"
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex gap-4 items-center">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center">
                                                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                                            </div>
                                                                            <span>Once</span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-600 cursor-not-allowed"
                                                                        disabled
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )
                    }
                    {/* Unified Benefits Table - Only visible in View Mode */}
                    {!isBenefitEditMode && (
                        <Card className="bg-blue-600 border-blue-600">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        {language === 'fr'
                                            ? 'Saisies des prestations retraite'
                                            : 'Retirement benefits inputs'}
                                    </CardTitle>
                                    <Button
                                        onClick={() => {
                                            // Reset logic
                                            setRetirementOption('');
                                            // ... (simplified reset for brevity, keeping main logic intact)
                                            const defaultDate = retirementLegalDate ? new Date(retirementLegalDate).toISOString().split('T')[0] : '2045-12-01';
                                            setBenefitsData({
                                                avs: { amount: '', frequency: 'Yearly', startDate: defaultDate },
                                                threeA: Array.from({ length: threeAAccountsCount }, () => ({
                                                    amount: '', frequency: 'One-time', startDate: defaultDate
                                                })),
                                                lppSup: { amount: '', frequency: 'One-time', startDate: defaultDate }
                                            });
                                            // Reset LPP inputs
                                            setProjectedLegalLPPPension('');
                                            setProjectedLegalLPPCapital('');
                                            setProjectedLegalLPPRate('');
                                            // Clear pensionByAge (reset to empty string values)
                                            const resetPensionByAge = {};
                                            Object.keys(pensionByAge).forEach(age => {
                                                resetPensionByAge[age] = { pension: '', capital: '', rate: '' };
                                            });
                                            setPensionByAge(resetPensionByAge);

                                            toast.success(language === 'fr' ? 'Réinitialisé' : 'Reset');
                                        }}
                                        size="sm"
                                        className="bg-blue-800 hover:bg-blue-900 text-white border-blue-700 whitespace-nowrap"
                                    >
                                        {language === 'fr' ? 'Réinitialiser' : 'Reset to default'}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-lg border border-slate-700">
                                    <Table className="w-full text-sm text-left">
                                        <thead className="text-xs bg-slate-800 text-white">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold">{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="px-4 py-3 text-center font-semibold">{language === 'fr' ? 'Date de disponibilité' : 'Availability date'}</th>
                                                <th className="px-4 py-3 text-center">Capital</th>
                                                <th className="px-4 py-3 text-center">{language === 'fr' ? 'Rente annuelle' : 'Yearly pension'}</th>
                                                <th className="px-4 py-3 text-center">{language === 'fr' ? 'Taux de conversion' : 'Conversion rate'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                                            {/* 1. AVS Section */}
                                            {selectedPillars.avs && (
                                                <tr className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-white border-l-4 border-green-500">AVS</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-400 text-sm">
                                                            {benefitsData.avs.startDate ? new Date(benefitsData.avs.startDate).toLocaleDateString('fr-CH') : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={benefitsData.avs.amount}
                                                            onChange={(e) => updateBenefitData('avs', 'amount', e.target.value)}
                                                            className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* 2. 3a Section */}
                                            {selectedPillars.threeA && benefitsData.threeA && Array.isArray(benefitsData.threeA) && benefitsData.threeA.map((account, idx) => (
                                                <tr key={`3a-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-white border-l-4 border-purple-500">
                                                        3a ({idx + 1})
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Input
                                                            type="date"
                                                            value={account.startDate}
                                                            onChange={(e) => updateBenefitData('threeA', 'startDate', e.target.value, idx)}
                                                            className="h-8 w-36 bg-slate-700 border-slate-600 text-white mx-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={account.amount}
                                                            onChange={(e) => updateBenefitData('threeA', 'amount', e.target.value, idx)}
                                                            className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* 3. LPP Section */}
                                            {selectedPillars.lpp && (
                                                <>
                                                    {/* Rows based on Early Retirement Option */}
                                                    {lppEarlyRetirementOption === 'Yes' ? (
                                                        // Dynamic Rows: Earliest Age to 65
                                                        Array.from({ length: 65 - (lppEarliestAge || 58) + 1 }, (_, i) => 65 - i).map(age => {
                                                            const retirementDate = calculateEarlyRetirementDate(age.toString());
                                                            return (
                                                                <tr key={`lpp-${age}`} className="hover:bg-slate-800/50 transition-colors">
                                                                    <td className="px-4 py-3 font-medium text-white border-l-4 border-yellow-500">
                                                                        {language === 'fr' ? `Retraite à ${age} ans` : `Retirement at ${age} years`}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className="text-gray-400 text-sm">
                                                                            {retirementDate ? new Date(retirementDate).toLocaleDateString() : '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="0"
                                                                            value={pensionByAge[age]?.capital || ''}
                                                                            onChange={(e) => updatePensionByAge(age, 'capital', e.target.value)}
                                                                            className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="0"
                                                                            value={pensionByAge[age]?.pension || ''}
                                                                            onChange={(e) => updatePensionByAge(age, 'pension', e.target.value)}
                                                                            className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            placeholder="0.00"
                                                                            value={pensionByAge[age]?.rate || ''}
                                                                            onChange={(e) => updatePensionByAge(age, 'rate', e.target.value)}
                                                                            className="h-8 w-24 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        // Single Row: Legal Retirement at 65
                                                        <tr className="hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-white border-l-4 border-yellow-500">
                                                                {language === 'fr' ? 'Retraite à 65 ans' : 'Retirement at 65 years'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="text-gray-400 text-sm">
                                                                    {retirementLegalDate ? new Date(retirementLegalDate).toLocaleDateString() : '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={projectedLegalLPPCapital}
                                                                    onChange={(e) => handleLegalLPPChange('capital', e.target.value)}
                                                                    className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={projectedLegalLPPPension}
                                                                    onChange={(e) => handleLegalLPPChange('pension', e.target.value)}
                                                                    className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={projectedLegalLPPRate}
                                                                    onChange={(e) => handleLegalLPPChange('rate', e.target.value)}
                                                                    className="h-8 w-24 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* Current LPP Capital Balance Row */}
                                                    <tr className="hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-white border-l-4 border-yellow-500">
                                                            {language === 'fr' ? 'Capital LPP actuel' : 'Current LPP Capital Balance'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-gray-400 text-sm">
                                                                {new Date().toLocaleDateString('fr-CH')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={pensionCapital}
                                                                onChange={(e) => setPensionCapital(e.target.value)}
                                                                className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-gray-500">-</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-gray-500">-</span>
                                                        </td>
                                                    </tr>
                                                </>
                                            )}

                                            {/* 4. Supplementary LPP Section */}
                                            {selectedPillars.lppSup && (
                                                <tr className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-white border-l-4 border-pink-500">
                                                        {language === 'fr' ? 'Plan de pension supplémentaire' : 'Supplementary LPP Pension plan'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Input
                                                            type="date"
                                                            value={benefitsData.lppSup.startDate}
                                                            onChange={(e) => updateBenefitData('lppSup', 'startDate', e.target.value)}
                                                            className="h-8 w-36 bg-slate-700 border-slate-600 text-white mx-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={benefitsData.lppSup.amount}
                                                            onChange={(e) => updateBenefitData('lppSup', 'amount', e.target.value)}
                                                            className="h-8 w-32 bg-slate-700 border-slate-600 text-white text-right mx-auto"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-gray-500">-</span>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!isBenefitEditMode && (
                        <div className="flex justify-center mt-6">
                            <Button
                                onClick={handleContinue}
                                className="px-12 text-lg"
                                size="lg"
                            >
                                {language === 'fr' ? 'Continuer' : 'Continue'}
                            </Button>
                        </div>
                    )}
                </div >
            </div >
        </div >
    );
};

export default RetirementParameters;
