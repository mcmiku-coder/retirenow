import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Trash2, Plus, ArrowLeft, Save, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
    saveRealEstateData, getRealEstateData,
    getCostData, saveCostData,
    getAssetsData, saveAssetsData,
    getUserData
} from '../utils/database';

const RealEstate = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Data State
    const [mortgageRows, setMortgageRows] = useState([]);
    const [assetRows, setAssetRows] = useState([]);
    const [maintenanceRows, setMaintenanceRows] = useState([]);

    // Logic State
    const [totals, setTotals] = useState({
        yearlyCost: 0,
        monthlyCost: 0,
        assetValue: 0,
        mortgageTotal: 0,
        mortgageYearlyTotal: 0,
        marketValueTotal: 0
    });

    useEffect(() => {
        if (!user || !password) {
            navigate('/');
            return;
        }
        loadData();
    }, [user, password]);

    useEffect(() => {
        calculateTotals();
    }, [mortgageRows, assetRows, maintenanceRows]);

    const loadData = async () => {
        try {
            const data = await getRealEstateData(user.email, password);
            if (data) {
                setMortgageRows(data.mortgageRows || []);
                setAssetRows(data.assetRows || []);
                setMaintenanceRows(data.maintenanceRows || []);
                // We also load totals if we needed them, but we recalculate them anyway
            } else {
                initializeDefaults();
            }
        } catch (error) {
            console.error('Error loading real estate data:', error);
            toast.error("Failed to load data");
        }
    };

    const initializeDefaults = () => {
        setMortgageRows([
            { id: 1, name: 'Primary Mortgage', amount: '', maturityDate: '', rate: '' }
        ]);
        setAssetRows([
            { id: 1, name: 'Main Property', amount: '' }
        ]);
        setMaintenanceRows([
            { id: 1, name: 'Electricity', amount: '', frequency: 'Yearly' },
            { id: 2, name: 'Heating', amount: '', frequency: 'Yearly' },
            { id: 3, name: 'Insurance', amount: '', frequency: 'Yearly' },
            { id: 4, name: 'Taxes', amount: '', frequency: 'Yearly' },
            { id: 5, name: 'Renovation funding', amount: '', frequency: 'Yearly' },
            { id: 6, name: 'Garden', amount: '', frequency: 'Yearly' }
        ]);
    };

    const calculateTotals = () => {
        // 1. Mortgage Totals
        let mortgagePrincipalSum = 0;
        let mortgageYearlyCostSum = 0;

        mortgageRows.forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            const rate = parseFloat(row.rate) || 0;
            const yearlyCost = amount * (rate / 100);

            mortgagePrincipalSum += amount;
            mortgageYearlyCostSum += yearlyCost;
        });

        // 2. Asset Totals
        let marketValueSum = 0;
        assetRows.forEach(row => {
            marketValueSum += parseFloat(row.amount) || 0;
        });

        // 3. Maintenance Totals
        let maintenanceYearlySum = 0;
        maintenanceRows.forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            if (row.frequency === 'Monthly') {
                maintenanceYearlySum += amount * 12;
            } else {
                maintenanceYearlySum += amount;
            }
        });

        // Grand Totals
        const totalYearly = mortgageYearlyCostSum + maintenanceYearlySum;
        const totalMonthly = totalYearly / 12;
        const netAssetValue = marketValueSum - mortgagePrincipalSum;

        setTotals({
            yearlyCost: totalYearly,
            monthlyCost: totalMonthly,
            assetValue: netAssetValue,
            mortgageTotal: mortgagePrincipalSum,
            mortgageYearlyTotal: mortgageYearlyCostSum,
            marketValueTotal: marketValueSum
        });
    };

    // --- Row Management Utilities ---
    const updateRow = (setRows, id, field, value) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addRow = (setRows, template) => {
        setRows(prev => {
            const maxId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) : 0;
            return [...prev, { ...template, id: maxId + 1 }];
        });
    };

    const deleteRow = (setRows, id) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    // --- Action Handlers ---

    const handleApply = async () => {
        setLoading(true);
        try {
            // 1. Save local state INCLUDING TOTALS
            await saveRealEstateData(user.email, password, {
                mortgageRows,
                assetRows,
                maintenanceRows,
                totals // Saved for retrieval by other pages (like Assets reset logic)
            });

            // 2. Update Costs
            const costs = await getCostData(user.email, password) || [];
            const userData = await getUserData(user.email, password);
            const today = new Date().toISOString().split('T')[0];
            const deathDateStr = userData?.theoreticalDeathDate || today;

            // Find or Create 'Rent/Mortgage' or translated variants
            let housingCostIndex = costs.findIndex(c => c.name === 'Rent/Mortgage' || c.name === 'Housing' || c.name === 'Logement' || c.name === 'Loyer/Hypothèque');

            const newCostAmount = Math.round(totals.monthlyCost).toString();

            if (housingCostIndex >= 0) {
                costs[housingCostIndex] = {
                    ...costs[housingCostIndex],
                    amount: newCostAmount,
                    frequency: 'Monthly',
                    category: 'Housing'
                };
            } else {
                // Determine new ID
                const maxId = costs.length > 0 ? Math.max(...costs.map(c => c.id)) : 0;
                costs.push({
                    id: maxId + 1,
                    name: 'Rent/Mortgage', // Keep English key for consistency
                    amount: newCostAmount,
                    frequency: 'Monthly',
                    category: 'Housing',
                    startDate: today,
                    endDate: deathDateStr,
                    locked: true,
                    categoryLocked: true
                });
            }
            await saveCostData(user.email, password, costs);

            // 3. Update Assets (New Structure: currentAssets array)
            const assetsData = await getAssetsData(user.email, password) || { currentAssets: [], desiredOutflows: [] };
            let currentAssets = assetsData.currentAssets || [];

            // Name: Uses 'Net Housing Asset Value' key
            const assetName = t('realEstate.netAssetValue');
            const numericAssetValue = Math.max(0, Math.round(totals.assetValue));

            // Remove any existing housing asset instance so we can reposition it or remove it entirely if 0
            currentAssets = currentAssets.filter(a =>
                a.name !== assetName &&
                a.name !== 'Housing' &&
                a.name !== 'Logement' &&
                a.name !== 'Main Residence' &&
                a.name !== 'Valeur Nette du Bien'
            );

            if (numericAssetValue > 0) {
                // Generate a new ID based on current max
                const maxId = currentAssets.length > 0 ? Math.max(...currentAssets.map(a => a.id)) : 0;

                const housingAsset = {
                    id: maxId + 1,
                    name: assetName,
                    amount: numericAssetValue.toString(),
                    category: 'Illiquid', // Force Illiquid
                    preserve: 'Yes',      // Force Yes
                    availabilityType: 'Period', // Force Period
                    availabilityTimeframe: 'within_20_25y', // Default timeframe
                    availabilityDate: '',
                    locked: false
                };

                // Add to the START of the list (Unshift)
                currentAssets.unshift(housingAsset);
            }
            // If value is 0, we simply don't add it back (effectively deleting it)

            await saveAssetsData(user.email, password, {
                currentAssets: currentAssets,
                desiredOutflows: assetsData.desiredOutflows || []
            });

            toast.success(t('realEstate.applySave') + " " + t('common.success'));
            navigate('/costs');

        } catch (error) {
            console.error(error);
            toast.error("An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-6 bg-background space-y-8">
            <PageHeader
                title={t('realEstate.title')}
                subtitle={t('realEstate.subtitle')}
                showBack={true}
                onBack={() => navigate('/costs')}
            />

            <div className="max-w-5xl mx-auto px-4 space-y-8">

                {/* TABLE 1: Mortgage */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('realEstate.mortgageDetails')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('realEstate.name')}</TableHead>
                                    <TableHead>{t('realEstate.amount')}</TableHead>
                                    <TableHead>{t('realEstate.maturityDate')}</TableHead>
                                    <TableHead className="w-32">{t('realEstate.rate')}</TableHead>
                                    <TableHead>{t('realEstate.yearlyCost')} (CHF)</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mortgageRows.map(row => {
                                    const yearly = (parseFloat(row.amount) || 0) * ((parseFloat(row.rate) || 0) / 100);
                                    return (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <Input value={row.name} onChange={e => updateRow(setMortgageRows, row.id, 'name', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/'/g, '');
                                                        if (!isNaN(rawValue)) {
                                                            updateRow(setMortgageRows, row.id, 'amount', rawValue);
                                                        }
                                                    }}
                                                    className="text-right"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="date" value={row.maturityDate} onChange={e => updateRow(setMortgageRows, row.id, 'maturityDate', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" step="0.01" value={row.rate} onChange={e => updateRow(setMortgageRows, row.id, 'rate', e.target.value)} />
                                            </TableCell>
                                            <TableCell>
                                                {yearly.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => deleteRow(setMortgageRows, row.id)} className="text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {/* Footer Line */}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell>{t('realEstate.total')}</TableCell>
                                    <TableCell>CHF {totals.mortgageTotal.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                    <TableCell>{totals.mortgageYearlyTotal.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setMortgageRows, { name: '', amount: '', maturityDate: '', rate: '' })}>
                            <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                        </Button>
                    </CardContent>
                </Card>

                {/* TABLE 2: Market Value */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('realEstate.marketValue')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('realEstate.name')}</TableHead>
                                    <TableHead>{t('realEstate.estimatedValue')}</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assetRows.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Input value={row.name} onChange={e => updateRow(setAssetRows, row.id, 'name', e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/'/g, '');
                                                    if (!isNaN(rawValue)) {
                                                        updateRow(setAssetRows, row.id, 'amount', rawValue);
                                                    }
                                                }}
                                                className="text-right"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteRow(setAssetRows, row.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell>{t('realEstate.totalMarketValue')}</TableCell>
                                    <TableCell>CHF {totals.marketValueTotal.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setAssetRows, { name: '', amount: '' })}>
                            <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                        </Button>
                    </CardContent>
                </Card>

                {/* TABLE 3: Maintenance & Other Costs */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('realEstate.maintenance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('realEstate.name')}</TableHead>
                                    <TableHead>{t('realEstate.amount')}</TableHead>
                                    <TableHead>{t('realEstate.frequency')}</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maintenanceRows.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Input value={row.name} onChange={e => updateRow(setMaintenanceRows, row.id, 'name', e.target.value)} />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/'/g, '');
                                                    if (!isNaN(rawValue)) {
                                                        updateRow(setMaintenanceRows, row.id, 'amount', rawValue);
                                                    }
                                                }}
                                                className="text-right"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <RadioGroup
                                                value={row.frequency}
                                                onValueChange={val => updateRow(setMaintenanceRows, row.id, 'frequency', val)}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="Monthly" id={`m-${row.id}`} />
                                                    <Label htmlFor={`m-${row.id}`}>{t('realEstate.monthly')}</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="Yearly" id={`y-${row.id}`} />
                                                    <Label htmlFor={`y-${row.id}`}>{t('realEstate.yearly')}</Label>
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteRow(setMaintenanceRows, row.id)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setMaintenanceRows, { name: '', amount: '', frequency: 'Yearly' })}>
                            <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                        </Button>
                    </CardContent>
                </Card>

                {/* KEY FIGURES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('realEstate.totalCostsYearly')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">
                                CHF {totals.yearlyCost.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/10 border-primary/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('realEstate.totalCostsMonthly')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-primary">
                                CHF {totals.monthlyCost.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('realEstate.carriedToCosts')}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-500/10 border-green-500/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('realEstate.netAssetValue')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                CHF {totals.assetValue.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('realEstate.carriedToAssets')}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 py-8">
                    <Button variant="outline" size="lg" onClick={() => navigate('/costs')}>
                        {t('realEstate.cancel')}
                    </Button>
                    <Button size="lg" onClick={handleApply} disabled={loading} className="px-8">
                        {loading ? t('realEstate.saving') : t('realEstate.applySave')}
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default RealEstate;
