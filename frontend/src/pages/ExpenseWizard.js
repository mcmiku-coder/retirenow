import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { ChevronLeft, Info } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getCostData, saveCostData, getIncomeData, getUserData } from '../utils/database';

const ExpenseWizard = () => {
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [combinedSalary, setCombinedSalary] = useState(0);
    const [salaryAmount, setSalaryAmount] = useState(0);
    const [helpAnswers, setHelpAnswers] = useState({
        hasCar: null,
        vacationCosts: null,
        goesOutOften: null,
        foodExpenses: null,
        privateInsurance: null,
        publicTransport: null,
        clothingShopping: null,
        tvInternetCosts: null
    });

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const loadInitialData = async () => {
            try {
                // Fetch User Data for analysisType
                const uData = await getUserData(user.email, masterKey);
                setUserData(uData);

                const incomeData = await getIncomeData(user.email, masterKey);
                if (incomeData && incomeData.length > 0) {
                    // Person 1 Salary
                    const p1SalaryRow = incomeData.find(r => (r.name === 'Salary' || r.name === 'Net Salary') && r.owner === 'p1');
                    const p1Salary = p1SalaryRow ? (parseFloat(p1SalaryRow.amount) || 0) : 0;
                    setSalaryAmount(p1Salary);

                    // Person 2 Salary
                    const p2SalaryRow = incomeData.find(r => (r.name === 'Salary' || r.name === 'Net Salary') && r.owner === 'p2');
                    const p2Salary = p2SalaryRow ? (parseFloat(p2SalaryRow.amount) || 0) : 0;

                    setCombinedSalary(p1Salary + p2Salary);
                }
            } catch (error) {
                console.error('Error loading initial data for wizard:', error);
            }
        };
        loadInitialData();
    }, [user, masterKey, navigate]);

    const handleApply = async () => {
        const hasAnyAnswer = Object.values(helpAnswers).some(val => val !== null);
        if (!hasAnyAnswer) {
            toast.error(language === 'fr' ? 'Veuillez répondre à au moins une question.' : 'Please answer at least one question.');
            return;
        }

        setLoading(true);
        try {
            const currentRows = await getCostData(user.email, masterKey) || [];
            const isCouple = userData?.analysisType === 'couple';
            const multiplier = isCouple ? 2 : 1;

            // Date calculations (reusing the same logic from CostsPage for consistency)
            const today = new Date().toISOString().split('T')[0];
            let maxDeathDate = today;
            if (userData) {
                const p1Birth = new Date(userData.birthDate);
                const p1Legal = new Date(p1Birth);
                p1Legal.setUTCFullYear(p1Legal.getUTCFullYear() + 65);
                p1Legal.setUTCMonth(p1Legal.getUTCMonth() + 1);
                const p1LegalStr = p1Legal.toISOString().split('T')[0];
                const p1Death = userData.theoreticalDeathDate || p1LegalStr;

                maxDeathDate = p1Death;

                if (isCouple && userData.birthDate2) {
                    const p2Birth = new Date(userData.birthDate2);
                    const p2Legal = new Date(p2Birth);
                    p2Legal.setUTCFullYear(p2Legal.getUTCFullYear() + 65);
                    p2Legal.setUTCMonth(p2Legal.getUTCMonth() + 1);
                    const p2LegalStr = p2Legal.toISOString().split('T')[0];
                    const p2Death = userData.theoreticalDeathDate2 || p2LegalStr;
                    if (p2Death > maxDeathDate) maxDeathDate = p2Death;
                }
            }

            // TAX CALCULATION
            const taxRate = isCouple ? 0.20 : 0.18;
            const taxBase = isCouple ? combinedSalary : salaryAmount;
            const monthlyTax = taxBase * taxRate;
            const roundedTax = Math.ceil(monthlyTax / 100) * 100;

            const updateMap = new Map();

            // Map questions to row names and amounts
            if (helpAnswers.hasCar === true) updateMap.set('Private transportation', 600 * multiplier);
            if (helpAnswers.vacationCosts !== null) {
                let amt = 5000;
                if (helpAnswers.vacationCosts === 'high') amt = 10000;
                else if (helpAnswers.vacationCosts === 'low') amt = 2000;
                updateMap.set('Vacation', amt * multiplier);
            }
            if (helpAnswers.goesOutOften !== null) updateMap.set('Restaurants', (helpAnswers.goesOutOften ? 400 : 100) * multiplier);
            if (helpAnswers.foodExpenses !== null) {
                let amt = 500;
                if (helpAnswers.foodExpenses === 'high') amt = 800;
                else if (helpAnswers.foodExpenses === 'low') amt = 350;
                updateMap.set('Food', amt * multiplier);
            }
            if (helpAnswers.privateInsurance !== null) updateMap.set('Health insurance', (helpAnswers.privateInsurance ? 900 : 600) * multiplier);
            if (helpAnswers.publicTransport !== null && helpAnswers.publicTransport !== 'never') {
                updateMap.set('Public transportation', (helpAnswers.publicTransport === 'always' ? 300 : 100) * multiplier);
            }
            if (helpAnswers.clothingShopping !== null) {
                let amt = 300;
                if (helpAnswers.clothingShopping === 'veryOften') amt = 500;
                else if (helpAnswers.clothingShopping === 'rarely') amt = 100;
                updateMap.set('Clothing', amt * multiplier);
            }
            if (helpAnswers.tvInternetCosts !== null) {
                let amt = 200;
                if (helpAnswers.tvInternetCosts === 'high') amt = 400;
                else if (helpAnswers.tvInternetCosts === 'low') amt = 80;
                updateMap.set('TV/Internet/Phone', amt * multiplier);
            }
            if (roundedTax > 0) updateMap.set('Taxes', roundedTax);

            // Special handling for removed rows
            let updatedRows = [...currentRows];
            if (helpAnswers.hasCar === false) updatedRows = updatedRows.filter(r => r.name !== 'Private transportation');
            if (helpAnswers.publicTransport === 'never') updatedRows = updatedRows.filter(r => r.name !== 'Public transportation');

            // Find max ID for new rows
            let maxId = updatedRows.length > 0 ? Math.max(...updatedRows.map(r => r.id)) : 0;

            // Updated existing rows or track which ones we haven't seen
            updateMap.forEach((amt, rowName) => {
                const existingIndex = updatedRows.findIndex(r => r.name === rowName);
                if (existingIndex > -1) {
                    updatedRows[existingIndex] = {
                        ...updatedRows[existingIndex],
                        amount: String(amt),
                        owner: (rowName === 'Taxes' && isCouple) ? 'shared' : (updatedRows[existingIndex].owner || (isCouple ? 'shared' : 'p1'))
                    };
                } else {
                    // Add new row if missing
                    updatedRows.push({
                        id: ++maxId,
                        name: rowName,
                        amount: String(amt),
                        frequency: rowName === 'Vacation' ? 'Yearly' : 'Monthly',
                        startDate: today,
                        endDate: maxDeathDate,
                        locked: true,
                        categoryLocked: true,
                        owner: isCouple ? 'shared' : 'p1'
                    });
                }
            });

            await saveCostData(user.email, masterKey, updatedRows);
            toast.success(language === 'fr' ? 'Configuration appliquée !' : 'Configuration applied!');
            navigate('/costs');
        } catch (error) {
            console.error('Error applying wizard answers:', error);
            toast.error(t('costs.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    const renderQuestion = (id, label, field, options) => (
        <div key={field} className="bg-card/40 border border-slate-800/50 rounded-xl px-8 py-4 mb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <span className="bg-[#EF5343]/15 text-[#EF5343] w-9 h-9 rounded-full flex items-center justify-center text-base font-bold shrink-0">
                        {id}
                    </span>
                    <h3 className="text-base font-medium text-white truncate font-sans" title={label}>{label}</h3>
                </div>

                <RadioGroup
                    value={helpAnswers[field]}
                    onValueChange={(val) => setHelpAnswers({ ...helpAnswers, [field]: val })}
                    className="grid grid-cols-3 gap-4 w-full md:w-[600px] shrink-0"
                >
                    {options.map((option, index) => (
                        <div
                            key={String(option.value)}
                            className={`flex items-center gap-3 justify-end ${options.length === 2 && index === 0 ? 'col-start-2' : ''}`}
                        >
                            <Label
                                htmlFor={`${field}-${option.value}`}
                                className="text-sm font-medium text-white cursor-pointer hover:text-[#EF5343] transition-colors text-right"
                            >
                                {option.label}
                            </Label>
                            <RadioGroupItem
                                value={option.value}
                                id={`${field}-${option.value}`}
                                className="w-6 h-6 border-2 border-slate-700 data-[state=checked]:border-[#EF5343] data-[state=checked]:text-[#EF5343] bg-slate-900/50 shrink-0"
                            />
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
    );

    return (
        <div className="flex-grow bg-background pb-20 pt-8 flex flex-col">
            <div className="w-full mb-2">
                <PageHeader
                    title={t('costs.helpModal.title')}
                    subtitle=""
                    leftContent={
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/costs')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-medium"
                        >
                            <ChevronLeft className="h-5 w-5" />
                            {t('nav.back')}
                        </Button>
                    }
                />
            </div>

            <div className="max-w-[95%] xl:max-w-7xl mx-auto px-4 w-full">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex gap-5 text-emerald-400 mb-8 mt-2 shadow-sm">
                    <Info className="h-6 w-6 shrink-0" />
                    <p className="text-base font-medium leading-relaxed">
                        {t('costs.helpModal.intro')}
                    </p>
                </div>

                <div className="space-y-3">
                    {renderQuestion(1, t('costs.helpModal.question1'), 'hasCar', [
                        { label: t('costs.helpModal.yes'), value: true },
                        { label: t('costs.helpModal.no'), value: false }
                    ])}

                    {renderQuestion(2, t('costs.helpModal.question2'), 'vacationCosts', [
                        { label: t('costs.helpModal.question2_high'), value: 'high' },
                        { label: t('costs.helpModal.question2_moderate'), value: 'moderate' },
                        { label: t('costs.helpModal.question2_low'), value: 'low' }
                    ])}

                    {renderQuestion(3, t('costs.helpModal.question3'), 'goesOutOften', [
                        { label: t('costs.helpModal.yes'), value: true },
                        { label: t('costs.helpModal.no'), value: false }
                    ])}

                    {renderQuestion(4, t('costs.helpModal.question4'), 'foodExpenses', [
                        { label: t('costs.helpModal.question4_high'), value: 'high' },
                        { label: t('costs.helpModal.question4_moderate'), value: 'moderate' },
                        { label: t('costs.helpModal.question4_low'), value: 'low' }
                    ])}

                    {renderQuestion(5, t('costs.helpModal.question5'), 'privateInsurance', [
                        { label: t('costs.helpModal.yes'), value: true },
                        { label: t('costs.helpModal.no'), value: false }
                    ])}

                    {renderQuestion(6, t('costs.helpModal.question6'), 'publicTransport', [
                        { label: t('costs.helpModal.question6_never'), value: 'never' },
                        { label: t('costs.helpModal.question6_sometimes'), value: 'sometimes' },
                        { label: t('costs.helpModal.question6_always'), value: 'always' }
                    ])}

                    {renderQuestion(7, t('costs.helpModal.question7'), 'clothingShopping', [
                        { label: t('costs.helpModal.question7_veryOften'), value: 'veryOften' },
                        { label: t('costs.helpModal.question7_reasonably'), value: 'reasonably' },
                        { label: t('costs.helpModal.question7_rarely'), value: 'rarely' }
                    ])}

                    {renderQuestion(8, t('costs.helpModal.question8'), 'tvInternetCosts', [
                        { label: t('costs.helpModal.question8_high'), value: 'high' },
                        { label: t('costs.helpModal.question8_moderate'), value: 'moderate' },
                        { label: t('costs.helpModal.question8_low'), value: 'low' }
                    ])}
                </div>

                <div className="pt-12 flex flex-col sm:flex-row justify-center gap-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/costs')}
                        size="lg"
                        className="px-16 h-14 text-lg border-slate-700 hover:bg-slate-800 text-slate-300 transition-all font-medium"
                        disabled={loading}
                    >
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleApply}
                        size="lg"
                        className="px-20 h-14 text-lg font-bold shadow-xl"
                        disabled={loading}
                    >
                        {loading ? t('common.loading') : (language === 'fr' ? 'Appliquer' : 'Apply')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseWizard;
