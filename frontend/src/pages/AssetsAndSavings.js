import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { getAssetsData, saveAssetsData } from '../utils/database';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';

const AssetsAndSavings = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t, language } = useLanguage();
    const [savingsRows, setSavingsRows] = useState([]);
    const [nextId, setNextId] = useState(2);
    const [futureInflows, setFutureInflows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !password) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                const savedData = await getAssetsData(user.email, password);
                const today = new Date().toISOString().split('T')[0];

                if (savedData && savedData.savingsRows && savedData.savingsRows.length > 0) {
                    setSavingsRows(savedData.savingsRows);
                    const maxId = Math.max(...savedData.savingsRows.map(r => r.id));
                    setNextId(maxId + 1);
                } else {
                    // Initialize with default row
                    setSavingsRows([
                        {
                            id: 1,
                            name: language === 'fr' ? 'Liquidités' : 'Liquidities',
                            amount: '',
                            category: 'Liquid',
                            preserve: 'No',
                            availability: today,
                            locked: true
                        }
                    ]);
                }

                setFutureInflows(savedData?.futureInflows || []);
            } catch (error) {
                console.error('Error loading assets data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, password, navigate, t, language]);

    const updateSavingsRow = (id, field, value) => {
        setSavingsRows(savingsRows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addSavingsRow = () => {
        const today = new Date().toISOString().split('T')[0];
        setSavingsRows([...savingsRows, {
            id: nextId,
            name: '',
            amount: '',
            category: 'Liquid',
            preserve: 'No',
            availability: today,
            locked: false
        }]);
        setNextId(nextId + 1);
    };

    const deleteSavingsRow = (id) => {
        setSavingsRows(savingsRows.filter(row => row.id !== id));
    };

    const resetSavingsRows = () => {
        const today = new Date().toISOString().split('T')[0];
        setSavingsRows([
            {
                id: 1,
                name: language === 'fr' ? 'Liquidités' : 'Liquidities',
                amount: '',
                category: 'Liquid',
                preserve: 'No',
                availability: today,
                locked: true
            }
        ]);
        setNextId(2);
    };

    const addFutureInflow = () => {
        const newInflow = {
            id: Date.now(),
            type: 'Inheritance',
            amount: '',
            date: ''
        };
        setFutureInflows([...futureInflows, newInflow]);
    };

    const updateFutureInflow = (id, field, value) => {
        setFutureInflows(futureInflows.map(inflow =>
            inflow.id === id ? { ...inflow, [field]: value } : inflow
        ));
    };

    const deleteFutureInflow = (id) => {
        setFutureInflows(futureInflows.filter(inflow => inflow.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                savingsRows,
                futureInflows
            };

            await saveAssetsData(user.email, password, dataToSave);
            navigate('/retirement-inputs');
        } catch (error) {
            console.error('Error saving assets data:', error);
            toast.error(t('common.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-7xl mx-auto">
                <WorkflowNavigation />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t('assetsAndSavings.title')}</h1>
                        <p className="text-muted-foreground">
                            {t('assetsAndSavings.subtitle')}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Savings Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('scenario.savings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Nom' : 'Name'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Préserver' : 'Preserve'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Disponibilité' : 'Availability'}</th>
                                            <th className="text-center p-3 font-semibold w-[80px]">{t('scenario.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {savingsRows.map((row, index) => (
                                            <tr key={row.id} className="border-b hover:bg-muted/30">
                                                <td className="p-2">
                                                    {row.locked ? (
                                                        <Input
                                                            data-testid={`savings-name-${index}`}
                                                            value={row.name}
                                                            disabled={true}
                                                            className="min-w-[120px]"
                                                        />
                                                    ) : (
                                                        <Input
                                                            data-testid={`savings-name-${index}`}
                                                            value={row.name}
                                                            onChange={(e) => updateSavingsRow(row.id, 'name', e.target.value)}
                                                            className="min-w-[120px]"
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        data-testid={`savings-amount-${index}`}
                                                        type="number"
                                                        value={row.amount}
                                                        onChange={(e) => updateSavingsRow(row.id, 'amount', e.target.value)}
                                                        placeholder="0"
                                                        className="min-w-[100px]"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        data-testid={`savings-category-${index}`}
                                                        value={row.category}
                                                        onChange={(e) => updateSavingsRow(row.id, 'category', e.target.value)}
                                                        className="w-full bg-background border rounded-md p-2 min-w-[120px]"
                                                    >
                                                        <option value="Liquid">{language === 'fr' ? 'Liquide' : 'Liquid'}</option>
                                                        <option value="Illiquid">{language === 'fr' ? 'Illiquide' : 'Illiquid'}</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <RadioGroup
                                                        value={row.preserve}
                                                        onValueChange={(value) => updateSavingsRow(row.id, 'preserve', value)}
                                                        className="flex gap-2"
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <RadioGroupItem value="Yes" id={`yes-${row.id}`} data-testid={`savings-preserve-yes-${index}`} />
                                                            <Label htmlFor={`yes-${row.id}`} className="text-sm">{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <RadioGroupItem value="No" id={`no-${row.id}`} data-testid={`savings-preserve-no-${index}`} />
                                                            <Label htmlFor={`no-${row.id}`} className="text-sm">{language === 'fr' ? 'Non' : 'No'}</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        data-testid={`savings-availability-${index}`}
                                                        type="date"
                                                        value={row.availability}
                                                        onChange={(e) => updateSavingsRow(row.id, 'availability', e.target.value)}
                                                        className="min-w-[140px]"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    {!row.locked && (
                                                        <Button
                                                            onClick={() => deleteSavingsRow(row.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            type="button"
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

                            <div className="flex gap-2 mt-4">
                                <Button
                                    onClick={addSavingsRow}
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {language === 'fr' ? '+ Ajouter une source' : '+ Add Source'}
                                </Button>
                                <Button
                                    onClick={resetSavingsRows}
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                >
                                    {language === 'fr' ? 'Réinitialiser' : 'Reset to Defaults'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Possible Future Inflows Section */}
                    <Card className="border-green-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-400" />
                                {t('scenario.futureInflows')}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t('scenario.futureInflowsDesc')}
                            </p>
                        </CardHeader>
                        <CardContent>
                            {futureInflows.length > 0 && (
                                <div className="overflow-x-auto mb-4">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 font-semibold">{t('scenario.inflowType')}</th>
                                                <th className="text-right p-3 font-semibold">{t('scenario.inflowAmount')}</th>
                                                <th className="text-left p-3 font-semibold">{t('scenario.inflowDate')}</th>
                                                <th className="text-center p-3 font-semibold w-[80px]">{t('scenario.actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {futureInflows.map((inflow, index) => (
                                                <tr key={inflow.id} className="border-b hover:bg-muted/30">
                                                    <td className="p-3">
                                                        <select
                                                            data-testid={`inflow-type-${index}`}
                                                            value={inflow.type}
                                                            onChange={(e) => updateFutureInflow(inflow.id, 'type', e.target.value)}
                                                            className="w-full bg-background border rounded-md p-2"
                                                        >
                                                            <option value="Inheritance">{t('scenario.inheritance')}</option>
                                                            <option value="Other">{t('scenario.other')}</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            data-testid={`inflow-amount-${index}`}
                                                            type="number"
                                                            value={inflow.amount}
                                                            onChange={(e) => updateFutureInflow(inflow.id, 'amount', e.target.value)}
                                                            placeholder="0"
                                                            className="max-w-[150px] ml-auto"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            data-testid={`inflow-date-${index}`}
                                                            type="date"
                                                            value={inflow.date}
                                                            onChange={(e) => updateFutureInflow(inflow.id, 'date', e.target.value)}
                                                            className="max-w-[150px]"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button
                                                            onClick={() => deleteFutureInflow(inflow.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <Button
                                onClick={addFutureInflow}
                                variant="outline"
                                size="sm"
                                className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                                type="button"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                {t('scenario.addInflow')}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Continue Button */}
                    <div className="flex justify-center mt-6">
                        <Button type="submit" size="lg" className="px-12 text-lg" disabled={loading}>
                            {t('assetsAndSavings.continue')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetsAndSavings;
