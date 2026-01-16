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
import { Calendar } from 'lucide-react';

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

    // Option 3 fields - Dynamic multi-age input
    const [option3EarlyAge, setOption3EarlyAge] = useState('');
    // preRetirementData structure: { age: { pension: '', capital: '', frequency: 'Monthly' } }
    const [preRetirementData, setPreRetirementData] = useState({});

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
                    setRetirementOption(scenarioData.retirementOption || '');
                    setPensionCapital(scenarioData.pensionCapital || '');
                    setYearlyReturn(scenarioData.yearlyReturn || '0');
                    setEarlyRetirementAge(scenarioData.earlyRetirementAge || '62');
                    setProjectedLPPPension(scenarioData.projectedLPPPension || '');
                    setProjectedLPPCapital(scenarioData.projectedLPPCapital || '');
                    setOption3EarlyAge(scenarioData.option3EarlyAge || '');

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
                preRetirementRows
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
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <WorkflowNavigation />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">
                            {language === 'fr' ? 'Paramètres de simulation de retraite' : 'Retirement simulation parameters'}
                        </h1>
                        <p className="text-muted-foreground" data-testid="page-subtitle">
                            {language === 'fr'
                                ? 'Choisissez le type de simulation que vous souhaitez effectuer et fournissez les données supplémentaires nécessaires'
                                : 'Choose the type of simulation you wish to perform and provide the additional necessary data'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Retirement Date Selector - Only Radio Buttons */}
                    <Card className="bg-blue-600 border-blue-600">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Calendar className="h-5 w-5" />
                                    {language === 'fr' ? 'Date de retraite' : 'Retirement Date'}
                                </CardTitle>
                                <p className="text-sm text-white/80">
                                    {language === 'fr' ? 'Date de retraite légale' : 'Legal retirement date'}: {retirementLegalDate ? new Date(retirementLegalDate).toLocaleDateString() : '-'}
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Option 1: Manual Date Selection */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option1'}
                                    onChange={() => setRetirementOption('option1')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium">
                                    {language === 'fr'
                                        ? 'Choisir une date de retraite indépendamment de vos plans de retraite anticipée possibles'
                                        : 'Pick a retirement date regardless of your possible early retirement plans'}
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
                                <span className="text-white font-medium">
                                    {language === 'fr'
                                        ? 'Choisir une date de retraite correspondant à l\'une des dates de retraite anticipée possibles de votre plan de pension'
                                        : 'Choose a retirement date matching one of the possible early retirement dates of your pension plan'}
                                </span>
                            </label>

                            {/* Option 3: Automatic Calculation - Coming Soon */}
                            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <input
                                    type="radio"
                                    name="retirementOption"
                                    checked={retirementOption === 'option3'}
                                    onChange={() => setRetirementOption('option3')}
                                    className="mt-1 w-5 h-5 text-blue-800 focus:ring-blue-500"
                                />
                                <span className="text-white font-medium">
                                    {language === 'fr'
                                        ? 'Calculer la date de retraite la plus précoce possible (solde au décès non négatif) - Bientôt disponible'
                                        : 'Calculate the earliest retirement date possible (balance at death not negative) - Coming soon'}
                                </span>
                            </label>

                            {/* Reset to Default Button - Bottom Left */}
                            <div className="mt-4 pt-4 border-t border-white/20">
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
                                        toast.success(language === 'fr' ? 'Réinitialisé aux valeurs par défaut' : 'Reset to default values');
                                    }}
                                    className="bg-blue-800 hover:bg-blue-900 text-white px-6"
                                >
                                    {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to default'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Conditional Fields Card - Appears below blue card when option is selected */}
                    {retirementOption === 'option1' && (
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {/* Date Picker */}
                                <div>
                                    <Label htmlFor="wishedRetirementDate" className="mb-2 block">
                                        {language === 'fr' ? 'Date de retraite souhaitée' : 'Desired retirement date'}
                                    </Label>
                                    <Input
                                        id="wishedRetirementDate"
                                        type="date"
                                        value={wishedRetirementDate}
                                        onChange={(e) => setWishedRetirementDate(e.target.value)}
                                        className="max-w-xs"
                                    />
                                </div>

                                {/* Message */}
                                {wishedRetirementDate && (
                                    <div className="bg-muted p-3 rounded-lg">
                                        <p className="text-sm">
                                            {new Date(wishedRetirementDate) < new Date(retirementLegalDate)
                                                ? (language === 'fr'
                                                    ? "Vous avez choisi une date antérieure à votre date de retraite légale. Si votre plan de pension offre des options de retraite anticipée et que vous disposez de ces détails, utilisez l'option 2 ci-dessous. Sinon, cette option vous demandera simplement le statut actuel de votre capital de prévoyance et le considérera comme un actif de \"libre passage\" avec un rendement annuel défini jusqu'à votre date de retraite légale, date à laquelle il deviendra un actif disponible."
                                                    : "You have picked a date prior to your legal retirement date. If your pension plan offers early retirement options and you are in possession of these details, use option 2 below. If not this option will simply ask you for your current pension plan capital status and consider it as a \"libre passage\" asset with a defined yearly return until your legal retirement date when it will become an available asset.")
                                                : (language === 'fr'
                                                    ? "Vous avez choisi une date postérieure à votre date de retraite légale. Cette option vous demandera simplement le statut actuel de votre capital de prévoyance et le considérera comme un actif de \"libre passage\" avec un rendement annuel défini."
                                                    : "You have picked a date after to your legal retirement date. This option will simply ask you for your current pension plan capital status and consider it as a \"libre passage\" asset with a defined yearly return")}
                                        </p>
                                    </div>
                                )}

                                {/* Pension Capital and Yearly Return - Side by Side */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Label htmlFor="pensionCapital" className="mb-2 block">
                                            {language === 'fr' ? 'Statut actuel du capital de prévoyance (en CHF)' : 'Current pension plan capital status (in CHF)'}
                                        </Label>
                                        <Input
                                            id="pensionCapital"
                                            type="number"
                                            value={pensionCapital}
                                            onChange={(e) => setPensionCapital(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <Label htmlFor="yearlyReturn" className="mb-2 block">
                                            {language === 'fr' ? 'Rendement annuel sur le capital de pension' : 'Yearly return on pension capital'}
                                        </Label>
                                        <Select value={yearlyReturn} onValueChange={setYearlyReturn}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">0%</SelectItem>
                                                <SelectItem value="1">1%</SelectItem>
                                                <SelectItem value="2">2%</SelectItem>
                                                <SelectItem value="3">3%</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {retirementOption === 'option2' && (
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {/* Message */}
                                <div className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm">
                                        {language === 'fr'
                                            ? "Choisir cette option nécessite de saisir les détails des options de retraite anticipée de votre plan de pension. Il vous sera demandé de choisir l'âge de retraite souhaité avant de saisir la pension LPP projetée et le capital LPP projeté pour cet âge choisi."
                                            : "Choosing this option requires you to input the details of your pension plan's early retirement options. You will be asked to choose the desired retirement age before inputting the projected LPP Pension and the projected LPP Capital for that chosen age."}
                                    </p>
                                </div>

                                {/* Desired Retirement Age */}
                                <div>
                                    <Label htmlFor="earlyRetirementAge" className="mb-2 block">
                                        {language === 'fr' ? 'Âge de retraite souhaité' : 'Desired retirement age'}
                                    </Label>
                                    <Select value={earlyRetirementAge} onValueChange={setEarlyRetirementAge}>
                                        <SelectTrigger className="max-w-xs">
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

                                {/* Two fields side by side - Only show when age is selected */}
                                {earlyRetirementAge && (
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Label htmlFor="projectedLPPPension" className="mb-2 block">
                                                {language === 'fr'
                                                    ? `Pension LPP projetée (en CHF) à ${earlyRetirementAge} ans`
                                                    : `Projected LPP Pension (in CHF) at ${earlyRetirementAge} years old`}
                                            </Label>
                                            <Input
                                                id="projectedLPPPension"
                                                type="number"
                                                value={projectedLPPPension}
                                                onChange={(e) => setProjectedLPPPension(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="flex-1">
                                            <Label htmlFor="projectedLPPCapital" className="mb-2 block">
                                                {language === 'fr'
                                                    ? `Capital de pension LPP projeté (en CHF) à ${earlyRetirementAge} ans`
                                                    : `Projected LPP Pension capital (in CHF) at ${earlyRetirementAge} years old`}
                                            </Label>
                                            <Input
                                                id="projectedLPPCapital"
                                                type="number"
                                                value={projectedLPPCapital}
                                                onChange={(e) => setProjectedLPPCapital(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {retirementOption === 'option3' && (
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                {/* Message */}
                                <div className="bg-muted p-3 rounded-lg">
                                    <p className="text-sm">
                                        {language === 'fr'
                                            ? "Choisir cette option nécessite de saisir les détails des options de retraite anticipée de votre plan de pension. Il vous sera demandé de choisir l'âge de retraite souhaité avant de saisir la pension LPP projetée et le capital LPP projeté pour cet âge choisi."
                                            : "Choosing this option requires you to input the details of your pension plan's early retirement options. You will be asked to choose the desired retirement age before inputting the projected LPP Pension and the projected LPP Capital for that chosen age."}
                                    </p>
                                </div>

                                {/* Early Retirement Age Dropdown */}
                                <div>
                                    <Label htmlFor="option3EarlyAge" className="mb-2 block">
                                        {language === 'fr' ? 'À quel âge votre caisse de pension vous permet-elle de prendre une retraite anticipée ?' : 'At what age does your pension fund allow you to take early retirement?'}
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
