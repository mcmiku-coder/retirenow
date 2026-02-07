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
import { getCostData, saveCostData, getIncomeData } from '../utils/database';

const ExpenseWizard = () => {
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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
                const incomeData = await getIncomeData(user.email, masterKey);
                if (incomeData && incomeData.length > 0) {
                    const salaryRow = incomeData.find(r => r.name === 'Salary' || r.name === 'Net Salary');
                    if (salaryRow && salaryRow.amount) {
                        setSalaryAmount(parseFloat(salaryRow.amount) || 0);
                    }
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
            const monthlyTax = salaryAmount * 0.18;
            const roundedTax = Math.ceil(monthlyTax / 100) * 100;

            let updatedRows = [...currentRows];

            if (helpAnswers.hasCar === false) {
                updatedRows = updatedRows.filter(row => row.name !== 'Private transportation');
            } else if (helpAnswers.hasCar === true) {
                updatedRows = updatedRows.map(row =>
                    row.name === 'Private transportation' ? { ...row, amount: '600' } : row
                );
            }

            if (helpAnswers.vacationCosts !== null) {
                let vacationAmount = '5000';
                if (helpAnswers.vacationCosts === 'high') vacationAmount = '10000';
                else if (helpAnswers.vacationCosts === 'moderate') vacationAmount = '5000';
                else if (helpAnswers.vacationCosts === 'low') vacationAmount = '2000';
                updatedRows = updatedRows.map(row =>
                    row.name === 'Vacation' ? { ...row, amount: vacationAmount } : row
                );
            }

            if (helpAnswers.goesOutOften !== null) {
                const restaurantAmount = helpAnswers.goesOutOften ? '400' : '100';
                updatedRows = updatedRows.map(row =>
                    row.name === 'Restaurants' ? { ...row, amount: restaurantAmount } : row
                );
            }

            if (helpAnswers.foodExpenses !== null) {
                let foodAmount = '500';
                if (helpAnswers.foodExpenses === 'high') foodAmount = '800';
                else if (helpAnswers.foodExpenses === 'moderate') foodAmount = '500';
                else if (helpAnswers.foodExpenses === 'low') foodAmount = '350';
                updatedRows = updatedRows.map(row =>
                    row.name === 'Food' ? { ...row, amount: foodAmount } : row
                );
            }

            if (helpAnswers.privateInsurance !== null) {
                const insuranceAmount = helpAnswers.privateInsurance ? '900' : '600';
                updatedRows = updatedRows.map(row =>
                    row.name === 'Health insurance' ? { ...row, amount: insuranceAmount } : row
                );
            }

            if (helpAnswers.publicTransport !== null) {
                if (helpAnswers.publicTransport === 'never') {
                    updatedRows = updatedRows.filter(row => row.name !== 'Public transportation');
                } else if (helpAnswers.publicTransport === 'sometimes') {
                    updatedRows = updatedRows.map(row =>
                        row.name === 'Public transportation' ? { ...row, amount: '100' } : row
                    );
                } else if (helpAnswers.publicTransport === 'always') {
                    updatedRows = updatedRows.map(row =>
                        row.name === 'Public transportation' ? { ...row, amount: '300' } : row
                    );
                }
            }

            if (helpAnswers.clothingShopping !== null) {
                let clothingAmount = '300';
                if (helpAnswers.clothingShopping === 'veryOften') clothingAmount = '500';
                else if (helpAnswers.clothingShopping === 'reasonably') clothingAmount = '300';
                else if (helpAnswers.clothingShopping === 'rarely') clothingAmount = '100';
                updatedRows = updatedRows.map(row =>
                    row.name === 'Clothing' ? { ...row, amount: clothingAmount } : row
                );
            }

            if (helpAnswers.tvInternetCosts !== null) {
                let tvAmount = '200';
                if (helpAnswers.tvInternetCosts === 'high') tvAmount = '400';
                else if (helpAnswers.tvInternetCosts === 'moderate') tvAmount = '200';
                else if (helpAnswers.tvInternetCosts === 'low') tvAmount = '80';
                updatedRows = updatedRows.map(row =>
                    row.name === 'TV/Internet/Phone' ? { ...row, amount: tvAmount } : row
                );
            }

            if (roundedTax > 0) {
                updatedRows = updatedRows.map(row =>
                    row.name === 'Taxes' ? { ...row, amount: String(roundedTax) } : row
                );
            }

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
                    <h3 className="text-xl font-semibold text-white truncate font-sans" title={label}>{label}</h3>
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
                                className="text-lg font-medium text-white cursor-pointer hover:text-[#EF5343] transition-colors text-right"
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
                    <p className="text-lg font-medium leading-relaxed">
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
                        className="px-20 h-14 text-lg bg-[#EF5343] hover:bg-[#d94334] text-white shadow-xl shadow-[#EF5343]/20 transition-all font-bold"
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
