import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { getAssetsData, saveAssetsData } from '../utils/database';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';

const AssetsAndSavings = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t } = useLanguage();
    const [liquidAssets, setLiquidAssets] = useState('');
    const [nonLiquidAssets, setNonLiquidAssets] = useState('');
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
                if (savedData) {
                    setLiquidAssets(savedData.liquidAssets || '');
                    setNonLiquidAssets(savedData.nonLiquidAssets || '');
                    setFutureInflows(savedData.futureInflows || []);
                }
            } catch (error) {
                console.error('Error loading assets data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, password, navigate, t]);

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
                liquidAssets,
                nonLiquidAssets,
                futureInflows
            };

            await saveAssetsData(user.email, password, dataToSave);
            toast.success(t('common.saveSuccess'));
            navigate('/scenario');
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
                    {/* Savings Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('scenario.savings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="liquid-assets">{t('scenario.liquidAssets')}</Label>
                                    <Input
                                        data-testid="liquid-assets-input"
                                        id="liquid-assets"
                                        type="number"
                                        value={liquidAssets}
                                        onChange={(e) => setLiquidAssets(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="non-liquid-assets">{t('scenario.nonLiquidAssets')}</Label>
                                    <Input
                                        data-testid="non-liquid-assets-input"
                                        id="non-liquid-assets"
                                        type="number"
                                        value={nonLiquidAssets}
                                        onChange={(e) => setNonLiquidAssets(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
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
                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={loading}>
                            {t('assetsAndSavings.continue')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetsAndSavings;
