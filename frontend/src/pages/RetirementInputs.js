import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { saveRetirementData, getRetirementData, getUserData } from '../utils/database';
import { getLegalRetirementDate } from '../utils/calculations';
import { Trash2, Plus } from 'lucide-react';
import WorkflowNavigation from '../components/WorkflowNavigation';

const RetirementInputs = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Green block data (Legal Retirement)
    const [legalRetirementDate, setLegalRetirementDate] = useState('');
    const [rows, setRows] = useState([]);

    // Blue block data (Pre-retirement option)
    const [hasPreRetirement, setHasPreRetirement] = useState(false);
    const [earlyRetirementAge, setEarlyRetirementAge] = useState('');

    // Yellow block data (Pre-retirement years)
    const [preRetirementRows, setPreRetirementRows] = useState([]);

    useEffect(() => {
        if (!user || !password) {
            navigate('/');
            return;
        }

        const initializeData = async () => {
            try {
                // 1. Get User Data to calculate Legal Retirement Date
                const userData = await getUserData(user.email, password);
                if (!userData) {
                    navigate('/personal-info');
                    return;
                }

                const legalDate = getLegalRetirementDate(userData.birthDate, userData.gender);
                const legalDateStr = legalDate.toISOString().split('T')[0];
                setLegalRetirementDate(legalDateStr);

                // 2. Try to load existing Retirement Data
                const savedData = await getRetirementData(user.email, password);

                if (savedData) {
                    setRows(savedData.rows);
                    setHasPreRetirement(savedData.hasPreRetirement);
                    setEarlyRetirementAge(savedData.earlyRetirementAge || '');
                    setPreRetirementRows(savedData.preRetirementRows);
                } else {
                    // 3. Initialize default rows if no saved data
                    // Green Block Defaults
                    const initialRows = [
                        { id: 'avs', name: 'AVS', startDate: legalDateStr, amount: '', frequency: 'Monthly', locked: true },
                        { id: '3a', name: '3a', startDate: legalDateStr, amount: '', frequency: 'One-time', locked: true },
                        { id: 'lpp_pension', name: 'LPP pension at legal retirement date', startDate: legalDateStr, amount: '', frequency: 'Monthly', locked: true },
                        { id: 'lpp_capital', name: 'LPP capital at legal retirement date', startDate: legalDateStr, amount: '', frequency: 'One-time', locked: true }
                    ];
                    setRows(initialRows);

                    // Yellow Block Defaults (1-7 years earlier)
                    const initialPreRows = [];
                    for (let i = 1; i <= 7; i++) {
                        const earlyDate = new Date(legalDate);
                        earlyDate.setFullYear(earlyDate.getFullYear() - i);
                        const earlyDateStr = earlyDate.toISOString().split('T')[0];

                        initialPreRows.push({
                            id: `lpp_pension_${i}y`,
                            yearOffset: i,
                            type: 'pension',
                            name: `LPP pension (${i}y earlier)`, // Will be translated in render
                            startDate: earlyDateStr,
                            amount: '',
                            frequency: 'Monthly'
                        });
                        initialPreRows.push({
                            id: `lpp_capital_${i}y`,
                            yearOffset: i,
                            type: 'capital',
                            name: `LPP capital (${i}y earlier)`, // Will be translated in render
                            startDate: earlyDateStr,
                            amount: '',
                            frequency: 'One-time'
                        });
                    }
                    setPreRetirementRows(initialPreRows);
                }

            } catch (error) {
                console.error('Error initializing data:', error);
                toast.error(t('common.error'));
            }
        };

        initializeData();
    }, [user, password, navigate]);

    // Update Green Block Row
    const updateRow = (id, field, value) => {
        setRows(rows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    // Add new row to Green Block
    const addRow = () => {
        const newId = `custom_${Date.now()}`;
        const newRow = {
            id: newId,
            name: '',
            startDate: legalRetirementDate,
            amount: '',
            frequency: 'Monthly',
            locked: false
        };
        setRows([...rows, newRow]);
    };

    // Delete row from Green Block
    const deleteRow = (id) => {
        setRows(rows.filter(row => row.id !== id));
    };

    // Reset Green Block to initial state
    const resetRows = () => {
        const initialRows = [
            { id: 'avs', name: 'AVS', startDate: legalRetirementDate, amount: '', frequency: 'Monthly', locked: true },
            { id: '3a', name: '3a', startDate: legalRetirementDate, amount: '', frequency: 'One-time', locked: true },
            { id: 'lpp_pension', name: 'LPP pension at legal retirement date', startDate: legalRetirementDate, amount: '', frequency: 'Monthly', locked: true },
            { id: 'lpp_capital', name: 'LPP capital at legal retirement date', startDate: legalRetirementDate, amount: '', frequency: 'One-time', locked: true }
        ];
        setRows(initialRows);
        toast.success(t('common.resetSuccess'));
    };

    // Update Yellow Block Row
    const updatePreRow = (id, field, value) => {
        setPreRetirementRows(preRetirementRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    // Helper to get translated name
    const getTranslatedName = (row) => {
        if (row.id === 'avs') return t('retirementInputs.avs');
        if (row.id === '3a') return t('retirementInputs.threea');
        if (row.id === 'lpp_pension') return t('retirementInputs.lppPension');
        if (row.id === 'lpp_capital') return t('retirementInputs.lppCapital');

        if (row.type === 'pension') {
            return t('retirementInputs.lppPensionEarlier');
        }
        if (row.type === 'capital') {
            return t('retirementInputs.lppCapitalEarlier');
        }
        return row.name;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}.${month}.${year}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                rows,
                hasPreRetirement,
                earlyRetirementAge,
                preRetirementRows
            };

            await saveRetirementData(user.email, password, dataToSave);
            toast.success(t('retirementInputs.saveSuccess'));
            navigate('/scenario');
        } catch (error) {
            console.error('Save error:', error);
            toast.error(t('retirementInputs.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-8 px-4" data-testid="retirement-inputs-page">
            <div className="max-w-6xl mx-auto">
                <WorkflowNavigation />

                <div className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">
                        {t('retirementInputs.title')}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {t('retirementInputs.subtitle')}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* GREEN BLOCK: Legal Retirement */}
                    <div className="bg-card border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {t('retirementInputs.section1Title')}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 w-1/3">{t('income.name')}</th>
                                        <th className="text-left p-2 w-1/6">{t('income.startDate')}</th>
                                        <th className="text-left p-2 w-1/6">{t('income.amount')}</th>
                                        <th className="text-left p-2 w-1/3">{t('income.frequency')}</th>
                                        <th className="text-left p-2 w-16">{t('income.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row) => (
                                        <tr key={row.id} className="border-b last:border-0">
                                            <td className="p-2 font-medium">
                                                {row.locked ? (
                                                    getTranslatedName(row)
                                                ) : (
                                                    <Input
                                                        value={row.name}
                                                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                                        className="bg-white dark:bg-black/40 min-w-[150px]"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Input
                                                    value={formatDate(row.startDate)}
                                                    readOnly
                                                    className="bg-white/10 dark:bg-black/20 text-white opacity-100 min-w-[100px] text-center"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={row.amount}
                                                    onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                                                    className="bg-white dark:bg-black/40 min-w-[100px]"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <RadioGroup
                                                    value={row.frequency}
                                                    onValueChange={(value) => updateRow(row.id, 'frequency', value)}
                                                    className="flex gap-2"
                                                >
                                                    {(row.id === 'avs' || row.id === 'lpp_pension') && (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} />
                                                                <Label htmlFor={`monthly-${row.id}`} className="text-sm">{t('income.monthly')}</Label>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="Yearly" id={`yearly-${row.id}`} />
                                                                <Label htmlFor={`yearly-${row.id}`} className="text-sm">{t('income.yearly')}</Label>
                                                            </div>
                                                        </>
                                                    )}
                                                    {(row.id === '3a' || row.id === 'lpp_capital') && (
                                                        <div className="flex items-center gap-1">
                                                            <RadioGroupItem value="One-time" id={`onetime-${row.id}`} />
                                                            <Label htmlFor={`onetime-${row.id}`} className="text-sm">{t('income.oneTime')}</Label>
                                                        </div>
                                                    )}
                                                    {!row.locked && (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="Yearly" id={`yearly-${row.id}`} />
                                                                <Label htmlFor={`yearly-${row.id}`} className="text-sm">{t('income.yearly')}</Label>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} />
                                                                <Label htmlFor={`monthly-${row.id}`} className="text-sm">{t('income.monthly')}</Label>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="One-time" id={`onetime-${row.id}`} />
                                                                <Label htmlFor={`onetime-${row.id}`} className="text-sm">{t('income.oneTime')}</Label>
                                                            </div>
                                                        </>
                                                    )}
                                                </RadioGroup>
                                            </td>
                                            <td className="p-2">
                                                {!row.locked && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => deleteRow(row.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addRow}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {t('income.addIncome')}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetRows}
                            >
                                {t('income.reset')}
                            </Button>
                        </div>
                    </div>

                    {/* BLUE BLOCK: Pre-retirement Option Toggle */}
                    <div className="bg-card border rounded-lg p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <span className="font-medium text-base">
                                {t('retirementInputs.pensionPlanOption')}
                            </span>
                            <RadioGroup
                                value={hasPreRetirement ? 'yes' : 'no'}
                                onValueChange={(val) => setHasPreRetirement(val === 'yes')}
                                className="flex gap-2"
                            >
                                <div className="flex items-center gap-1">
                                    <RadioGroupItem value="yes" id="r-yes" />
                                    <Label htmlFor="r-yes" className="text-sm cursor-pointer">{t('retirementInputs.yes')}</Label>
                                </div>
                                <div className="flex items-center gap-1">
                                    <RadioGroupItem value="no" id="r-no" />
                                    <Label htmlFor="r-no" className="text-sm cursor-pointer">{t('retirementInputs.no')}</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Early Retirement Age Dropdown - appears when Yes is selected */}
                        {hasPreRetirement && (
                            <div className="mt-4 pt-4 border-t animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <Label htmlFor="early-retirement-age" className="text-base whitespace-nowrap">
                                        {t('retirementInputs.earlyRetirementAgeQuestion')}
                                    </Label>
                                    <Select value={earlyRetirementAge} onValueChange={setEarlyRetirementAge}>
                                        <SelectTrigger id="early-retirement-age" className="w-32">
                                            <SelectValue placeholder={t('retirementInputs.selectAge')} />
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
                            </div>
                        )}
                    </div>

                    {/* YELLOW BLOCK: Pre-retirement Options - Only show if age is selected */}
                    {hasPreRetirement && earlyRetirementAge && (
                        <div className="bg-card border rounded-lg p-6 animate-in slide-in-from-top-4 fade-in duration-300">
                            <h2 className="text-xl font-semibold mb-4">
                                {t('retirementInputs.section2Title')}
                            </h2>

                            {/* Group by Year Offset */}
                            {(() => {
                                // Calculate how many years earlier based on selected age
                                // Age 58 = 7 years earlier (65-58), Age 64 = 1 year earlier (65-64)
                                const maxYearsEarlier = 65 - parseInt(earlyRetirementAge);
                                const yearsToShow = Array.from({ length: maxYearsEarlier }, (_, i) => i + 1);

                                return yearsToShow.map(year => (
                                    <div key={year} className="mb-8 last:mb-0">
                                        <h3 className="font-bold mb-2 border-b pb-1">
                                            {year} {t('retirementInputs.preRetirementOption').replace('{age}', 65 - year)}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[700px]">
                                                <tbody>
                                                    {preRetirementRows.filter(r => r.yearOffset === year).map(row => (
                                                        <tr key={row.id} className="border-b last:border-0">
                                                            <td className="p-2 w-1/3 pl-4">
                                                                {getTranslatedName(row)}
                                                            </td>
                                                            <td className="p-2 w-1/6 text-center">
                                                                <Input
                                                                    value={formatDate(row.startDate)}
                                                                    readOnly
                                                                    className="bg-white/10 dark:bg-black/20 text-white opacity-100 min-w-[100px] text-center"
                                                                />
                                                            </td>
                                                            <td className="p-2 w-1/6">
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={row.amount}
                                                                    onChange={(e) => updatePreRow(row.id, 'amount', e.target.value)}
                                                                    className="bg-white dark:bg-black/40 min-w-[100px]"
                                                                />
                                                            </td>
                                                            <td className="p-2 w-1/3">
                                                                <RadioGroup
                                                                    value={row.frequency}
                                                                    onValueChange={(value) => updatePreRow(row.id, 'frequency', value)}
                                                                    className="flex gap-2"
                                                                >
                                                                    {row.type === 'pension' && (
                                                                        <>
                                                                            <div className="flex items-center gap-1">
                                                                                <RadioGroupItem value="Monthly" id={`monthly-${row.id}`} />
                                                                                <Label htmlFor={`monthly-${row.id}`} className="text-sm">{t('income.monthly')}</Label>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <RadioGroupItem value="Yearly" id={`yearly-${row.id}`} />
                                                                                <Label htmlFor={`yearly-${row.id}`} className="text-sm">{t('income.yearly')}</Label>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {row.type === 'capital' && (
                                                                        <div className="flex items-center gap-1">
                                                                            <RadioGroupItem value="One-time" id={`onetime-${row.id}`} />
                                                                            <Label htmlFor={`onetime-${row.id}`} className="text-sm">{t('income.oneTime')}</Label>
                                                                        </div>
                                                                    )}
                                                                </RadioGroup>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}

                    <div className="flex justify-center pt-8">
                        <Button
                            size="lg"
                            type="submit"
                            className="px-12 text-lg"
                            disabled={loading}
                        >
                            {loading ? t('common.loading') : t('retirementInputs.continue')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RetirementInputs;
