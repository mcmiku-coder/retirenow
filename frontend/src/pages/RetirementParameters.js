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
import { toast } from 'sonner';
import { getUserData, getScenarioData, saveScenarioData, getRetirementData } from '../utils/database';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Calendar, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const RetirementParameters = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
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

    // Option 3 fields - Dynamic multi-age input
    const [option3EarlyAge, setOption3EarlyAge] = useState('');
    // preRetirementData structure: { age: { pension: '', capital: '', frequency: 'Monthly' } }
    const [preRetirementData, setPreRetirementData] = useState({});

    // Option 0 fields (Legal Retirement)
    const [projectedLegalLPPPension, setProjectedLegalLPPPension] = useState('');
    const [projectedLegalLPPCapital, setProjectedLegalLPPCapital] = useState('');
    const [legalLppPensionFrequency, setLegalLppPensionFrequency] = useState('Monthly');
    const [showLegalLPPPension, setShowLegalLPPPension] = useState(true);
    const [showLegalLPPCapital, setShowLegalLPPCapital] = useState(true);

    // Pillars selection state
    const [selectedPillars, setSelectedPillars] = useState({
        avs: false,
        lpp: false,
        lppSup: false,
        threeA: false
    });

    // Benefits Table Data State
    const [benefitsData, setBenefitsData] = useState({
        avs: { amount: '', frequency: 'Monthly', startDate: '' },
        threeA: { amount: '', frequency: 'One-time', startDate: '' },
        lppSup: { amount: '', frequency: 'One-time', startDate: '' }
    });

    const updateBenefitData = (type, field, value) => {
        setBenefitsData(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
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
        if (!user || !userEmail || !password) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                const userData = await getUserData(userEmail, password);
                const retirementData = await getRetirementData(userEmail, password);
                const scenarioData = await getScenarioData(userEmail, password);

                console.log('=== LOADING RETIREMENT DATA ===');
                console.log('userData:', userData);
                console.log('retirementLegalDate from userData:', userData?.retirementLegalDate);

                // Load legal retirement date from userData (saved by RetirementOverview)
                if (userData && userData.retirementLegalDate) {
                    setRetirementLegalDate(userData.retirementLegalDate);
                }

                if (scenarioData) {
                    console.log('=== LOADING RETIREMENT PARAMETERS ===');
                    console.log('scenarioData:', scenarioData);
                    console.log('retirementOption:', scenarioData.retirementOption);
                    console.log('earlyRetirementAge:', scenarioData.earlyRetirementAge);
                    console.log('projectedLPPPension:', scenarioData.projectedLPPPension);
                    console.log('projectedLPPCapital:', scenarioData.projectedLPPCapital);
                    console.log('option3EarlyAge:', scenarioData.option3EarlyAge);
                    console.log('preRetirementRows:', scenarioData.preRetirementRows);

                    setWishedRetirementDate(scenarioData.wishedRetirementDate || retirementData?.retirementLegalDate || '');
                    console.log('Loading retirementOption:', scenarioData.retirementOption);
                    setRetirementOption(scenarioData.retirementOption || '');
                    console.log('After setting, retirementOption state should be:', scenarioData.retirementOption || '');
                    setPensionCapital(scenarioData.pensionCapital || '');
                    setYearlyReturn(scenarioData.yearlyReturn || '0');
                    setEarlyRetirementAge(scenarioData.earlyRetirementAge || '62');
                    setProjectedLPPPension(scenarioData.projectedLPPPension || '');
                    setProjectedLPPCapital(scenarioData.projectedLPPCapital || '');
                    setOption3EarlyAge(scenarioData.option3EarlyAge || '');
                    setProjectedLegalLPPPension(scenarioData.projectedLegalLPPPension || '');
                    setProjectedLegalLPPCapital(scenarioData.projectedLegalLPPCapital || '');

                    setProjectedLegalLPPPension(scenarioData.projectedLegalLPPPension || '');
                    setProjectedLegalLPPCapital(scenarioData.projectedLegalLPPCapital || '');

                    if (scenarioData.selectedPillars) setSelectedPillars(scenarioData.selectedPillars);
                    if (scenarioData.benefitsData) setBenefitsData(scenarioData.benefitsData);

                    // Load Option 2 specific state
                    if (scenarioData.lppPensionFrequency) setLppPensionFrequency(scenarioData.lppPensionFrequency);
                    if (scenarioData.showLPPPension !== undefined) setShowLPPPension(scenarioData.showLPPPension);
                    if (scenarioData.showLPPCapital !== undefined) setShowLPPCapital(scenarioData.showLPPCapital);

                    // Load Option 0 specific state
                    if (scenarioData.legalLppPensionFrequency) setLegalLppPensionFrequency(scenarioData.legalLppPensionFrequency);
                    if (scenarioData.showLegalLPPPension !== undefined) setShowLegalLPPPension(scenarioData.showLegalLPPPension);
                    if (scenarioData.showLegalLPPCapital !== undefined) setShowLegalLPPCapital(scenarioData.showLegalLPPCapital);

                    if (scenarioData.showLegalLPPCapital !== undefined) setShowLegalLPPCapital(scenarioData.showLegalLPPCapital);

                    // Helper to ensure YYYY-MM-DD format for Input type="date"
                    const toYYYYMMDD = (dateStr) => {
                        if (!dateStr) return '';
                        // Handle DD.MM.YYYY
                        if (dateStr.includes('.')) {
                            const [day, month, year] = dateStr.split('.');
                            return `${year}-${month}-${day}`;
                        }
                        // Handle ISO date with time
                        if (dateStr.includes('T')) {
                            return dateStr.split('T')[0];
                        }
                        return dateStr;
                    };

                    // Set default start date for benefits if not set
                    // Use YYYY-MM-DD format for date inputs
                    const legalDateObj = userData?.retirementLegalDate ? new Date(userData.retirementLegalDate) : new Date('2045-12-01');
                    const defaultDateYMD = legalDateObj.toISOString().split('T')[0];

                    if (!scenarioData.benefitsData) {
                        setBenefitsData(prev => ({
                            avs: { ...prev.avs, startDate: defaultDateYMD },
                            threeA: { ...prev.threeA, startDate: defaultDateYMD },
                            lppSup: { ...prev.lppSup, startDate: defaultDateYMD }
                        }));
                    } else {
                        // Ensure defaults if specific fields are missing in existing data and valid format
                        setBenefitsData(prev => ({
                            ...prev,
                            avs: {
                                ...prev.avs,
                                startDate: toYYYYMMDD(prev.avs?.startDate || defaultDateYMD)
                            },
                            threeA: {
                                ...prev.threeA,
                                startDate: toYYYYMMDD(prev.threeA?.startDate || defaultDateYMD)
                            },
                            lppSup: {
                                ...prev.lppSup,
                                startDate: toYYYYMMDD(prev.lppSup?.startDate || defaultDateYMD)
                            }
                        }));
                    }

                    // Convert preRetirementRows array back to preRetirementData object
                    if (scenarioData.preRetirementRows && Array.isArray(scenarioData.preRetirementRows)) {
                        const dataObj = {};
                        scenarioData.preRetirementRows.forEach(row => {
                            dataObj[row.age] = {
                                pension: row.pension || '',
                                capital: row.capital || '',
                                frequency: row.frequency || 'Monthly'
                            };
                        });
                        setPreRetirementData(dataObj);
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
    }, [user, userEmail, password, navigate]);

    const handleContinue = async () => {
        // For Option 2, calculate retirement date from age if not manually set
        let effectiveRetirementDate = wishedRetirementDate;

        if (retirementOption === 'option2' && !wishedRetirementDate && earlyRetirementAge) {
            try {
                const userData = await getUserData(userEmail, password);
                if (userData && userData.birthDate) {
                    const birthDate = new Date(userData.birthDate);
                    const calculatedRetirementDate = new Date(birthDate);
                    calculatedRetirementDate.setFullYear(calculatedRetirementDate.getFullYear() + parseInt(earlyRetirementAge));
                    calculatedRetirementDate.setMonth(calculatedRetirementDate.getMonth() + 1);
                    effectiveRetirementDate = calculatedRetirementDate.toISOString().split('T')[0];
                    setWishedRetirementDate(effectiveRetirementDate);
                }
            } catch (error) {
                console.error('Error calculating retirement date:', error);
            }
        } else if (retirementOption === 'option0') {
            // Option 0: Legal Retirement Date (65y roughly)
            effectiveRetirementDate = retirementLegalDate;
            setWishedRetirementDate(effectiveRetirementDate);
        }

        // Validate retirement date
        if (!effectiveRetirementDate && retirementOption !== 'option3') {
            toast.error(language === 'fr' ? 'Veuillez sélectionner une date de retraite' : 'Please select a retirement date');
            return;
        }
        if (retirementOption === 'option3' && !option3EarlyAge) {
            toast.error(language === 'fr' ? 'Veuillez sélectionner un âge de retraite' : 'Please select a retirement age');
            return;
        }

        try {
            const scenarioData = await getScenarioData(userEmail, password) || {};

            console.log('=== SAVING RETIREMENT PARAMETERS ===');
            console.log('retirementOption:', retirementOption);
            console.log('earlyRetirementAge:', earlyRetirementAge);
            console.log('projectedLPPPension:', projectedLPPPension);
            console.log('projectedLPPCapital:', projectedLPPCapital);
            console.log('effectiveRetirementDate:', effectiveRetirementDate);

            // Convert preRetirementData object to array format for storage
            const preRetirementRows = Object.entries(preRetirementData).map(([age, data]) => ({
                age: parseInt(age),
                pension: data.pension || '',
                capital: data.capital || '',
                frequency: data.frequency || 'Monthly'
            }));

            const updatedScenarioData = {
                ...scenarioData,
                wishedRetirementDate: effectiveRetirementDate,
                retirementOption,
                pensionCapital,
                yearlyReturn,
                earlyRetirementAge,
                projectedLPPPension,
                projectedLPPCapital,
                option3EarlyAge,
                preRetirementRows,
                projectedLegalLPPPension,
                projectedLegalLPPPension,
                projectedLegalLPPCapital,
                selectedPillars,
                benefitsData,
                lppPensionFrequency,
                showLPPPension,
                showLPPCapital,
                legalLppPensionFrequency,
                showLegalLPPPension,
                showLegalLPPCapital
            };

            console.log('updatedScenarioData to save:', JSON.stringify(updatedScenarioData, null, 2));
            console.log('Specifically - retirementOption:', updatedScenarioData.retirementOption);
            console.log('Specifically - option3EarlyAge:', updatedScenarioData.option3EarlyAge);
            console.log('Specifically - preRetirementRows:', updatedScenarioData.preRetirementRows);

            await saveScenarioData(userEmail, password, updatedScenarioData);

            // Verify the save worked by immediately reloading
            console.log('=== VERIFYING SAVE ===');
            const reloadedData = await getScenarioData(userEmail, password);
            console.log('Reloaded retirementOption:', reloadedData?.retirementOption);
            console.log('Reloaded option3EarlyAge:', reloadedData?.option3EarlyAge);
            console.log('Reloaded preRetirementRows:', reloadedData?.preRetirementRows);

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
                    {/* Pillars Selection */}
                    <div className="flex items-center gap-4 text-white">
                        <span className="font-medium whitespace-nowrap">
                            {language === 'fr'
                                ? 'Sélectionnez les piliers de retraite dont vous bénéficierez :'
                                : 'Select the retirements pilars that you will benefit from'}
                        </span>
                        <div className="flex flex-1 justify-between gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPillars.avs}
                                    onChange={(e) => setSelectedPillars(prev => ({ ...prev, avs: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>AVS</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPillars.lpp}
                                    onChange={(e) => setSelectedPillars(prev => ({ ...prev, lpp: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{language === 'fr' ? 'LPP' : 'LPP Pension plan'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPillars.lppSup}
                                    onChange={(e) => setSelectedPillars(prev => ({ ...prev, lppSup: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{language === 'fr' ? 'Capital de pension supplémentaire' : 'Supplementary Pension capital'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPillars.threeA}
                                    onChange={(e) => setSelectedPillars(prev => ({ ...prev, threeA: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>3a</span>
                            </label>
                        </div>
                    </div>

                    {/* Retirement Date Selector - Only Radio Buttons */}
                    <Card className="bg-blue-600 border-blue-600">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    {language === 'fr'
                                        ? 'Choisissez le type de simulation que vous souhaitez effectuer et fournissez les données supplémentaires nécessaires'
                                        : 'Choose the type of simulation you wish to perform and provide the additional necessary data'}
                                </CardTitle>
                                <Button
                                    onClick={() => {
                                        // Reset all fields
                                        setRetirementOption('');
                                        setWishedRetirementDate('');
                                        setPensionCapital('');
                                        setYearlyReturn('0');
                                        setEarlyRetirementAge('');
                                        setProjectedLPPPension('');
                                        setProjectedLPPCapital('');
                                        setOption3EarlyAge('');
                                        setPreRetirementData({});
                                        setProjectedLegalLPPPension('');
                                        setProjectedLegalLPPCapital('');

                                        // Reset benefits data with default dates
                                        const defaultDate = retirementLegalDate ? new Date(retirementLegalDate).toISOString().split('T')[0] : '2045-12-01';
                                        setBenefitsData({
                                            avs: { amount: '', frequency: 'Monthly', startDate: defaultDate },
                                            threeA: { amount: '', frequency: 'One-time', startDate: defaultDate },
                                            lppSup: { amount: '', frequency: 'One-time', startDate: defaultDate }
                                        });

                                        toast.success(language === 'fr' ? 'Réinitialisé aux valeurs par défaut' : 'Reset to default values');
                                    }}
                                    size="sm"
                                    className="bg-blue-800 hover:bg-blue-900 text-white border-blue-700 whitespace-nowrap"
                                >
                                    {language === 'fr' ? 'Réinitialiser' : 'Reset to default'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Option 0: Legal Retirement */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option0'}
                                    onChange={() => setRetirementOption('option0')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium text-sm">
                                    {language === 'fr'
                                        ? `Simuler mon équilibre financier en prenant ma retraite à la date légale (${retirementLegalDate ? new Date(retirementLegalDate).toLocaleDateString() : ''}) (65 ans)`
                                        : `Simulate my Financial balance when retiring at the legal retirement date ${retirementLegalDate ? new Date(retirementLegalDate).toLocaleDateString() : ''} (65 years old)`}
                                </span>
                            </label>

                            {/* Option 2: Early Retirement Matching Pension Plan */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option2'}
                                    onChange={() => setRetirementOption('option2')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium text-sm">
                                    {language === 'fr'
                                        ? 'Choisir une date de retraite correspondant à l\'une des dates de retraite anticipée possibles de votre plan de pension'
                                        : 'Choose a retirement date matching one of the possible early retirement dates of your pension plan'}
                                </span>
                            </label>

                            {/* Option 2: Selector and Message (Moved here) */}
                            {retirementOption === 'option2' && (
                                <div className="pl-8 text-white space-y-4">
                                    <div className="flex gap-4 items-start">
                                        {/* Desired Retirement Age */}
                                        <div>
                                            <Label htmlFor="earlyRetirementAge" className="mb-2 block font-medium">
                                                {language === 'fr' ? 'Âge de retraite souhaité' : 'Desired retirement age'}
                                            </Label>
                                            <Select value={earlyRetirementAge} onValueChange={setEarlyRetirementAge}>
                                                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner un âge' : 'Select age'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="58">58</SelectItem>
                                                    <SelectItem value="59">59</SelectItem>
                                                    <SelectItem value="60">60</SelectItem>
                                                    <SelectItem value="61">61</SelectItem>
                                                    <SelectItem value="62">62</SelectItem>
                                                    <SelectItem value="63">63</SelectItem>
                                                    <SelectItem value="64">64</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Message */}
                                        <div className="bg-white/10 border border-white/20 p-3 rounded-lg flex-1 mt-1">
                                            <p className="text-sm">
                                                {language === 'fr'
                                                    ? "Veuillez fournir les détails des options de retraite anticipée de votre plan de pension. Choisissez l'âge de retraite souhaité puis saisissez la pension LPP projetée et le capital LPP projeté pour cet âge choisi."
                                                    : "Please provide the details of your pension plan's early retirement options. Choose the desired retirement age before then input the projected LPP Pension and the projected LPP Capital for that chosen age."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Option 1: Manual Date Selection */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option1'}
                                    onChange={() => setRetirementOption('option1')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium text-sm">
                                    {language === 'fr'
                                        ? 'Choisir une date de retraite indépendamment de vos plans de retraite anticipée possibles'
                                        : 'Pick a retirement date regardless of your possible early retirement plans'}
                                </span>
                            </label>

                            {/* Option 1: Selector and Message (Moved here) */}
                            {retirementOption === 'option1' && (
                                <div className="pl-8 text-white space-y-4">
                                    {/* Simple Date Picker */}
                                    <div className="flex gap-4 items-start">
                                        <div>
                                            <Label htmlFor="wishedRetirementDate" className="mb-2 block font-medium">
                                                {language === 'fr' ? 'Date de retraite souhaitée' : 'Desired retirement date'}
                                            </Label>
                                            <Input
                                                id="wishedRetirementDate"
                                                type="date"
                                                value={wishedRetirementDate}
                                                onChange={(e) => setWishedRetirementDate(e.target.value)}
                                                className="w-40 bg-white/10 border-white/20 text-white"
                                            />
                                        </div>

                                        {/* Message moved here from original location, styled like Option 2/3 info box */}
                                        {wishedRetirementDate && (
                                            <div className="bg-white/10 border border-white/20 p-3 rounded-lg flex-1 mt-1">
                                                <p className="text-sm">
                                                    {new Date(wishedRetirementDate) < new Date(retirementLegalDate)
                                                        ? (language === 'fr'
                                                            ? "La date sélectionnée est antérieure à votre date de retraite légale. Veuillez fournir le statut actuel de votre capital de prévoyance car il sera considéré dans la simulation comme un compte de libre passage avec un rendement annuel défini."
                                                            : "The selected date is prior to your legal retirement date. Please provide your current pension plan capital status as it will be considered in the simulation as a vested benefits account with a defined yearly return")
                                                        : (language === 'fr'
                                                            ? "Vous avez choisi une date postérieure à votre date de retraite légale. Cette option vous demandera simplement le statut actuel de votre capital de prévoyance et le considérera comme un actif de \"libre passage\" avec un rendement annuel défini."
                                                            : "You have picked a date after to your legal retirement date. This option will simply ask you for your current pension plan capital status and consider it as a \"libre passage\" asset with a defined yearly return")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Option 3: Automatic Calculation - Coming Soon */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option3'}
                                    onChange={() => setRetirementOption('option3')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium text-sm">
                                    {language === 'fr'
                                        ? 'Calculer la date de retraite la plus précoce possible (solde au décès non négatif) - Bientôt disponible'
                                        : 'Calculate the earliest retirement date possible (balance at death not negative) - Coming soon'}
                                </span>
                            </label>

                            {/* Option 3: Selector and Message (Moved here) */}
                            {retirementOption === 'option3' && (
                                <div className="pl-8 text-white space-y-4">
                                    <div className="flex gap-4 items-start">
                                        {/* Earliest Retirement Age */}
                                        <div>
                                            <Label htmlFor="option3EarlyAge" className="mb-2 block font-medium">
                                                {language === 'fr' ? 'Quel est l\'âge de retraite le plus bas dans votre plan de pension ?' : 'What is the earliest retirement age in your pension plan ?'}
                                            </Label>
                                            <Select value={option3EarlyAge} onValueChange={setOption3EarlyAge}>
                                                <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner un âge' : 'Select age'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="64">64</SelectItem>
                                                    <SelectItem value="63">63</SelectItem>
                                                    <SelectItem value="62">62</SelectItem>
                                                    <SelectItem value="61">61</SelectItem>
                                                    <SelectItem value="60">60</SelectItem>
                                                    <SelectItem value="59">59</SelectItem>
                                                    <SelectItem value="58">58</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Message */}
                                        <div className="bg-white/10 border border-white/20 p-3 rounded-lg flex-1 mt-1">
                                            <p className="text-sm">
                                                {language === 'fr'
                                                    ? "Sélectionnez l'âge de retraite anticipée le plus précoce autorisé par votre plan de pension, puis saisissez la rente LPP projetée et le capital LPP projeté pour chaque année. Cela permettra d'exécuter une simulation d'optimisation."
                                                    : "Select the earliest retirement age allowed by your pension plan, then input the projected LPP Pension and the projected LPP Capital for each year. This will allow runining an optimisation simulation"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}


                        </CardContent>
                    </Card>





                    {/* Dynamic Benefits Table - Visible if pillars selected OR Option 2/0/3/1 is active (for LPP rows) */}
                    {(selectedPillars.avs || selectedPillars.threeA || selectedPillars.lppSup || (retirementOption === 'option2' && earlyRetirementAge) || retirementOption === 'option0' || (retirementOption === 'option3' && option3EarlyAge) || (retirementOption === 'option1')) && (
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
                                                        type="number"
                                                        value={benefitsData.avs.amount}
                                                        onChange={(e) => updateBenefitData('avs', 'amount', e.target.value)}
                                                        className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                        type="number"
                                                        value={benefitsData.threeA.amount}
                                                        onChange={(e) => updateBenefitData('threeA', 'amount', e.target.value)}
                                                        className="h-8 bg-black/20 border-slate-700 w-32"
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
                                        {/* Option 2 LPP Rows (Pension and Capital) */}
                                        {retirementOption === 'option2' && earlyRetirementAge && (
                                            <>
                                                {showLPPPension && (
                                                    <tr className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 font-medium text-white">
                                                            {language === 'fr'
                                                                ? `Pension LPP projetée à ${earlyRetirementAge} ans`
                                                                : `Projected LPP Pension at ${earlyRetirementAge}y`}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="date"
                                                                value={calculateEarlyRetirementDate(earlyRetirementAge) || ''}
                                                                className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                disabled
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="number"
                                                                value={projectedLPPPension}
                                                                onChange={(e) => setProjectedLPPPension(e.target.value)}
                                                                className="h-8 bg-black/20 border-slate-700 w-32"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-4 items-center">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${lppPensionFrequency === 'Monthly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                        {lppPensionFrequency === 'Monthly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                    </div>
                                                                    <input type="radio" className="hidden" checked={lppPensionFrequency === 'Monthly'} onChange={() => setLppPensionFrequency('Monthly')} />
                                                                    <span>Monthly</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${lppPensionFrequency === 'Yearly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                        {lppPensionFrequency === 'Yearly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                    </div>
                                                                    <input type="radio" className="hidden" checked={lppPensionFrequency === 'Yearly'} onChange={() => setLppPensionFrequency('Yearly')} />
                                                                    <span>Yearly</span>
                                                                </label>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                                                onClick={() => {
                                                                    if (!showLPPCapital) {
                                                                        toast.error(language === 'fr'
                                                                            ? 'Au moins un élément de projection LPP est nécessaire pour la simulation'
                                                                            : 'At least one LPP projection element is necessary for the simulation');
                                                                    } else {
                                                                        setShowLPPPension(false);
                                                                        setProjectedLPPPension('');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )}
                                                {showLPPCapital && (
                                                    <tr className="bg-slate-900 hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 font-medium text-white">
                                                            {language === 'fr'
                                                                ? `Capital LPP projeté à ${earlyRetirementAge} ans`
                                                                : `Projected LPP Capital at ${earlyRetirementAge}y`}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="date"
                                                                value={calculateEarlyRetirementDate(earlyRetirementAge) || ''}
                                                                className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                disabled
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="number"
                                                                value={projectedLPPCapital}
                                                                onChange={(e) => setProjectedLPPCapital(e.target.value)}
                                                                className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                                                onClick={() => {
                                                                    if (!showLPPPension) {
                                                                        toast.error(language === 'fr'
                                                                            ? 'Au moins un élément de projection LPP est nécessaire pour la simulation'
                                                                            : 'At least one LPP projection element is necessary for the simulation');
                                                                    } else {
                                                                        setShowLPPCapital(false);
                                                                        setProjectedLPPCapital('');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )}
                                        {/* Option 0 LPP Rows (Pension and Capital at 65) */}
                                        {retirementOption === 'option0' && (
                                            <>
                                                {showLegalLPPPension && (
                                                    <tr className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 font-medium text-white">
                                                            {language === 'fr'
                                                                ? 'Pension LPP projetée à 65 ans'
                                                                : 'Projected LPP Pension at 65y'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="date"
                                                                value={retirementLegalDate || ''}
                                                                className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                disabled
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="number"
                                                                value={projectedLegalLPPPension}
                                                                onChange={(e) => setProjectedLegalLPPPension(e.target.value)}
                                                                className="h-8 bg-black/20 border-slate-700 w-32"
                                                                placeholder="0"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex gap-4 items-center">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${legalLppPensionFrequency === 'Monthly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                        {legalLppPensionFrequency === 'Monthly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                    </div>
                                                                    <input type="radio" className="hidden" checked={legalLppPensionFrequency === 'Monthly'} onChange={() => setLegalLppPensionFrequency('Monthly')} />
                                                                    <span>Monthly</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${legalLppPensionFrequency === 'Yearly' ? 'border-red-500' : 'border-gray-500'}`}>
                                                                        {legalLppPensionFrequency === 'Yearly' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                                    </div>
                                                                    <input type="radio" className="hidden" checked={legalLppPensionFrequency === 'Yearly'} onChange={() => setLegalLppPensionFrequency('Yearly')} />
                                                                    <span>Yearly</span>
                                                                </label>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                                                onClick={() => {
                                                                    if (!showLegalLPPCapital) {
                                                                        toast.error(language === 'fr'
                                                                            ? 'Au moins un élément de projection LPP est nécessaire pour la simulation'
                                                                            : 'At least one LPP projection element is necessary for the simulation');
                                                                    } else {
                                                                        setShowLegalLPPPension(false);
                                                                        setProjectedLegalLPPPension('');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )}
                                                {showLegalLPPCapital && (
                                                    <tr className="bg-slate-900 hover:bg-slate-800/50">
                                                        <td className="px-4 py-3 font-medium text-white">
                                                            {language === 'fr'
                                                                ? 'Capital LPP projeté à 65 ans'
                                                                : 'Projected LPP Capital at 65y'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="date"
                                                                value={retirementLegalDate || ''}
                                                                className="h-8 bg-black/20 border-slate-700 w-[140px] text-white opacity-50 cursor-not-allowed"
                                                                disabled
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Input
                                                                type="number"
                                                                value={projectedLegalLPPCapital}
                                                                onChange={(e) => setProjectedLegalLPPCapital(e.target.value)}
                                                                className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/20"
                                                                onClick={() => {
                                                                    if (!showLegalLPPPension) {
                                                                        toast.error(language === 'fr'
                                                                            ? 'Au moins un élément de projection LPP est nécessaire pour la simulation'
                                                                            : 'At least one LPP projection element is necessary for the simulation');
                                                                    } else {
                                                                        setShowLegalLPPCapital(false);
                                                                        setProjectedLegalLPPCapital('');
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )}
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
                                                        type="number"
                                                        value={pensionCapital}
                                                        onChange={(e) => setPensionCapital(e.target.value)}
                                                        className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                        type="number"
                                                        value={benefitsData.lppSup.amount}
                                                        onChange={(e) => updateBenefitData('lppSup', 'amount', e.target.value)}
                                                        className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                                    type="number"
                                                                    value={ageData.pension}
                                                                    onChange={(e) => updatePreRetirementData(age, 'pension', e.target.value)}
                                                                    className="h-8 bg-black/20 border-slate-700 w-32"
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
                                                                    type="number"
                                                                    value={ageData.capital}
                                                                    onChange={(e) => updatePreRetirementData(age, 'capital', e.target.value)}
                                                                    className="h-8 bg-black/20 border-slate-700 w-32"
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
                    )}



                    {/* Option 2 Card Removed (Unified into Table) */}

                    {/* Option 3 Card Removed (Unified into Table) - was here from line 1096-1229 */}
                    {false && retirementOption === 'option3' && (
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {/* Age Selection and Message side by side */}
                                <div className="flex gap-4 items-start">
                                    {/* Early Retirement Age Dropdown */}
                                    <div>
                                        <Label htmlFor="option3EarlyAge" className="mb-2 block">
                                            {language === 'fr' ? 'Quel est l\'âge de retraite le plus bas dans votre plan de pension ?' : 'What is the earliest retirement age in your pension plan ?'}
                                        </Label>
                                        <Select value={option3EarlyAge} onValueChange={setOption3EarlyAge}>
                                            <SelectTrigger className="max-w-xs">
                                                <SelectValue placeholder={language === 'fr' ? 'Sélectionner un âge' : 'Select age'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="64">64</SelectItem>
                                                <SelectItem value="63">63</SelectItem>
                                                <SelectItem value="62">62</SelectItem>
                                                <SelectItem value="61">61</SelectItem>
                                                <SelectItem value="60">60</SelectItem>
                                                <SelectItem value="59">59</SelectItem>
                                                <SelectItem value="58">58</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Message */}
                                    <div className="bg-muted p-3 rounded-lg flex-1 mt-1">
                                        <p className="text-sm">
                                            {language === 'fr'
                                                ? "Sélectionnez l'âge de retraite anticipée le plus précoce autorisé par votre plan de pension, puis saisissez la rente LPP projetée et le capital LPP projeté pour chaque année. Cela permettra d'exécuter une simulation d'optimisation."
                                                : "Select the earliest retirement age allowed by your pension plan, then input the projected LPP Pension and the projected LPP Capital for each year. This will allow runining an optimisation simulation"}
                                        </p>
                                    </div>
                                </div>

                                {/* Dynamic sections based on selected age */}
                                {option3EarlyAge && (() => {
                                    // Calculate how many years earlier based on selected age
                                    // Age 58 = 7 years earlier (65-58), Age 64 = 1 year earlier (65-64)
                                    const maxYearsEarlier = 65 - parseInt(option3EarlyAge);
                                    const yearsToShow = Array.from({ length: maxYearsEarlier }, (_, i) => i + 1);

                                    const updatePreRetirementData = (age, field, value) => {
                                        setPreRetirementData(prev => ({
                                            ...prev,
                                            [age]: {
                                                ...prev[age],
                                                [field]: value
                                            }
                                        }));
                                    };

                                    return (
                                        <div className="space-y-4 mt-6">
                                            {yearsToShow.map(year => {
                                                const age = 65 - year;
                                                const ageData = preRetirementData[age] || { pension: '', capital: '', frequency: 'Monthly' };

                                                return (
                                                    <div key={year} className="border rounded-lg p-4 bg-muted/30">
                                                        {/* Bold heading to match blue circle text */}
                                                        <h3 className="font-bold mb-3 text-base">
                                                            {language === 'fr'
                                                                ? `${year} an${year > 1 ? 's' : ''} plus tôt (${age} ans)`
                                                                : `${year} year${year > 1 ? 's' : ''} earlier (${age}y age)`}
                                                        </h3>

                                                        {/* Compact horizontal layout */}
                                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                                            {/* LPP Pension with radio buttons below */}
                                                            <div className="flex-1">
                                                                <Label htmlFor={`pension-${age}`} className="mb-2 block text-sm">
                                                                    {language === 'fr'
                                                                        ? `Pension LPP projetée (en CHF) à ${age} ans`
                                                                        : `Projected LPP Pension (in CHF) at ${age} years old`}
                                                                </Label>
                                                                {/* Input narrowed and radio buttons on the right */}
                                                                <div className="flex gap-3 items-center">
                                                                    <Input
                                                                        id={`pension-${age}`}
                                                                        type="number"
                                                                        value={ageData.pension}
                                                                        onChange={(e) => updatePreRetirementData(age, 'pension', e.target.value)}
                                                                        placeholder="0"
                                                                        className="max-w-[200px]"
                                                                    />
                                                                    <RadioGroup
                                                                        value={ageData.frequency || 'Monthly'}
                                                                        onValueChange={(value) => updatePreRetirementData(age, 'frequency', value)}
                                                                        className="flex gap-3"
                                                                    >
                                                                        <div className="flex items-center gap-1">
                                                                            <RadioGroupItem value="Monthly" id={`monthly-${age}`} />
                                                                            <Label htmlFor={`monthly-${age}`} className="text-sm cursor-pointer">
                                                                                {language === 'fr' ? 'Mensuel' : 'Monthly'}
                                                                            </Label>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <RadioGroupItem value="Yearly" id={`yearly-${age}`} />
                                                                            <Label htmlFor={`yearly-${age}`} className="text-sm cursor-pointer">
                                                                                {language === 'fr' ? 'Annuel' : 'Yearly'}
                                                                            </Label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                            </div>

                                                            {/* LPP Capital - narrower */}
                                                            <div className="flex-1">
                                                                <Label htmlFor={`capital-${age}`} className="mb-2 block text-sm">
                                                                    {language === 'fr'
                                                                        ? `Capital de pension LPP projeté (en CHF) à ${age} ans`
                                                                        : `Projected LPP Pension capital (in CHF) at ${age} years old`}
                                                                </Label>
                                                                <Input
                                                                    id={`capital-${age}`}
                                                                    type="number"
                                                                    value={ageData.capital}
                                                                    onChange={(e) => updatePreRetirementData(age, 'capital', e.target.value)}
                                                                    placeholder="0"
                                                                    className="max-w-[200px]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-center mt-6">
                        <Button
                            onClick={handleContinue}
                            className="px-12 text-lg"
                            size="lg"
                        >
                            {language === 'fr' ? 'Continuer' : 'Continue'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetirementParameters;
