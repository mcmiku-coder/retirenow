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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Data State
    const [mortgageRows, setMortgageRows] = useState([]);
    const [assetRows, setAssetRows] = useState([]);
    const [maintenanceRows, setMaintenanceRows] = useState([]);

    // Logic State
    const [lodgingSituation, setLodgingSituation] = useState('owner');
    const [propertyCount, setPropertyCount] = useState("1");

    // Rent State
    const [rentAmount, setRentAmount] = useState("");
    const [rentName, setRentName] = useState("");
    const [rentFrequency, setRentFrequency] = useState("Monthly");

    // Tab State
    const [activeTab, setActiveTab] = useState("1");

    const [totals, setTotals] = useState({
        yearlyCost: 0,
        monthlyCost: 0,
        assetValue: 0,
        mortgageTotal: 0,
        mortgageYearlyTotal: 0,
        marketValueTotal: 0
    });

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }
        loadData();
    }, [user, masterKey]);

    useEffect(() => {
        if (!rentName && t('realEstate.rent')) {
            setRentName(t('realEstate.rent'));
        }
    }, [t, rentName]);

    useEffect(() => {
        calculateGlobalTotals();
    }, [mortgageRows, assetRows, maintenanceRows, lodgingSituation, rentAmount, rentFrequency]);

    // Ensure defaults exist when propertyCount increases
    useEffect(() => {
        if (lodgingSituation === 'owner') {
            const count = parseInt(propertyCount);
            ensureDefaultsForCount(count);
        }
    }, [propertyCount, lodgingSituation]);

    const ensureDefaultsForCount = (count) => {
        let newMaintenance = [...maintenanceRows];
        let newMortgage = [...mortgageRows];
        let newAssets = [...assetRows];
        let hasChanges = false;

        const maxMaintId = newMaintenance.length > 0 ? Math.max(...newMaintenance.map(r => r.id)) : 0;
        let nextMaintId = maxMaintId + 1;

        const maxMortId = newMortgage.length > 0 ? Math.max(...newMortgage.map(r => r.id)) : 0;
        let nextMortId = maxMortId + 1;

        const maxAssetId = newAssets.length > 0 ? Math.max(...newAssets.map(r => r.id)) : 0;
        let nextAssetId = maxAssetId + 1;

        for (let i = 1; i <= count; i++) {
            // Check Maintenance
            const hasMaintenance = newMaintenance.some(r => (r.propertyId || 1) === i);
            if (!hasMaintenance) {
                const defaults = [
                    'electricity', 'heating', 'insurance', 'taxes', 'renovation', 'garden'
                ];
                defaults.forEach(key => {
                    newMaintenance.push({
                        id: nextMaintId++,
                        propertyId: i,
                        name: t(`realEstate.defaultMaintenance.${key}`),
                        amount: '',
                        frequency: 'Yearly'
                    });
                });
                hasChanges = true;
            }

            // Check Mortgage (Ensure at least 1 row)
            const hasMortgage = newMortgage.some(r => (r.propertyId || 1) === i);
            if (!hasMortgage) {
                newMortgage.push({
                    id: nextMortId++,
                    propertyId: i,
                    name: t('realEstate.defaultMortgageName'),
                    amount: '',
                    maturityDate: '',
                    rate: ''
                });
                hasChanges = true;
            }

            // Check Asset (Ensure at least 1 row)
            const hasAsset = newAssets.some(r => (r.propertyId || 1) === i);
            if (!hasAsset) {
                newAssets.push({
                    id: nextAssetId++,
                    propertyId: i,
                    name: `${t('realEstate.property')} ${i}`,
                    amount: ''
                });
                hasChanges = true;
            }
        }

        if (hasChanges) {
            setMaintenanceRows(newMaintenance);
            setMortgageRows(newMortgage);
            setAssetRows(newAssets);
        }
    };

    const loadData = async () => {
        try {
            const data = await getRealEstateData(user.email, masterKey);
            if (data) {
                const addPropId = (rows) => (rows || []).map(r => ({ ...r, propertyId: r.propertyId || 1 }));
                setMortgageRows(addPropId(data.mortgageRows));
                setAssetRows(addPropId(data.assetRows));
                setMaintenanceRows(addPropId(data.maintenanceRows));

                if (data.lodgingSituation) setLodgingSituation(data.lodgingSituation);
                if (data.propertyCount) {
                    setPropertyCount(data.propertyCount);
                    // We call ensureDefaultsForCount in the useEffect dependent on propertyCount, 
                    // but we might need to wait for state update. 
                    // However, effect will trigger on mount/change.
                }
                if (data.rentAmount) setRentAmount(data.rentAmount);
                if (data.rentName) setRentName(data.rentName);
                if (data.rentFrequency) setRentFrequency(data.rentFrequency);
            } else {
                // Initialize explicitly for Prop 1
                setPropertyCount("1");
                // The effect will catch "1" and init defaults.
            }
        } catch (error) {
            console.error('Error loading real estate data:', error);
            toast.error("Failed to load data");
        }
    };

    const calculateGlobalTotals = () => {
        if (lodgingSituation === 'tenant') {
            const rent = parseFloat(rentAmount) || 0;
            const rentYearly = rentFrequency === 'Monthly' ? rent * 12 : rent;

            // For tenants, we currently ignore the maintenance table in the OWNER tabs.
            // But if there are maintenance rows set for propertyId 1 (default), maybe we count them?
            // The requirement was "Tenant view shows maintenance table".
            // The tenant maintenance table in previous code was using `maintenanceRows`.
            // Now `maintenanceRows` has `propertyId`. 
            // We should assume tenant uses `propertyId: 1` or just "undefined" which defaults to 1?
            // Let's assume tenant operates on "Global Maintenance" or a specific subset. 
            // Given the new UI separates Owner Tabs, Tenant view has its ONW Maintenance card.
            // We should filter maintenanceRows for tenant view to show only those without specific owner prop, 
            // OR just reuse Prop 1 slots? 
            // Simplest: Tenant uses rows with propertyId=1.

            let maintenanceSum = 0;
            maintenanceRows.filter(r => (r.propertyId || 1) === 1).forEach(row => {
                const amount = parseFloat(row.amount) || 0;
                maintenanceSum += (row.frequency === 'Monthly' ? amount * 12 : amount);
            });

            const totalYearly = maintenanceSum + rentYearly;

            setTotals({
                yearlyCost: totalYearly,
                monthlyCost: totalYearly / 12,
                assetValue: 0,
                mortgageTotal: 0,
                mortgageYearlyTotal: 0,
                marketValueTotal: 0
            });
            return;
        }

        // OWNER GLOBAL (All Properties)
        let mortgagePrincipalSum = 0;
        let mortgageYearlyCostSum = 0;
        mortgageRows.forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            const rate = parseFloat(row.rate) || 0;
            mortgagePrincipalSum += amount;
            mortgageYearlyCostSum += amount * (rate / 100);
        });

        let marketValueSum = 0;
        assetRows.forEach(row => {
            marketValueSum += parseFloat(row.amount) || 0;
        });

        let maintenanceYearlySumCalc = 0;
        maintenanceRows.forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            maintenanceYearlySumCalc += (row.frequency === 'Monthly' ? amount * 12 : amount);
        });

        const totalYearly = mortgageYearlyCostSum + maintenanceYearlySumCalc;
        setTotals({
            yearlyCost: totalYearly,
            monthlyCost: totalYearly / 12,
            assetValue: marketValueSum - mortgagePrincipalSum,
            mortgageTotal: mortgagePrincipalSum,
            mortgageYearlyTotal: mortgageYearlyCostSum,
            marketValueTotal: marketValueSum
        });
    };

    const getPropertyTotals = (propId) => {
        const id = parseInt(propId);

        let mortgageP = 0;
        let mortgageY = 0;
        mortgageRows.filter(r => (r.propertyId || 1) === id).forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            const rate = parseFloat(row.rate) || 0;
            mortgageP += amount;
            mortgageY += amount * (rate / 100);
        });

        let marketV = 0;
        assetRows.filter(r => (r.propertyId || 1) === id).forEach(row => {
            marketV += parseFloat(row.amount) || 0;
        });

        let maintY = 0;
        maintenanceRows.filter(r => (r.propertyId || 1) === id).forEach(row => {
            const amount = parseFloat(row.amount) || 0;
            maintY += (row.frequency === 'Monthly' ? amount * 12 : amount);
        });

        const totalYearly = mortgageY + maintY;
        return {
            yearlyCost: totalYearly,
            monthlyCost: totalYearly / 12,
            assetValue: marketV - mortgageP,
            mortgageTotal: mortgageP,
            mortgageYearlyTotal: mortgageY,
            marketValueTotal: marketV
        };
    };

    const updateRow = (setRows, id, field, value) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addRow = (setRows, template, propId) => {
        setRows(prev => {
            const maxId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) : 0;
            return [...prev, { ...template, id: maxId + 1, propertyId: parseInt(propId) }];
        });
    };

    const deleteRow = (setRows, id) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleApply = async () => {
        setLoading(true);
        try {
            await saveRealEstateData(user.email, masterKey, {
                mortgageRows,
                assetRows,
                maintenanceRows,
                totals,
                lodgingSituation,
                propertyCount,
                rentAmount,
                rentName,
                rentFrequency
            });

            const costs = await getCostData(user.email, masterKey) || [];
            const userData = await getUserData(user.email, masterKey);
            const today = new Date().toISOString().split('T')[0];
            const deathDateStr = userData?.theoreticalDeathDate || today;

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
                const maxId = costs.length > 0 ? Math.max(...costs.map(c => c.id)) : 0;
                costs.push({
                    id: maxId + 1,
                    name: 'Rent/Mortgage',
                    amount: newCostAmount,
                    frequency: 'Monthly',
                    category: 'Housing',
                    startDate: today,
                    endDate: deathDateStr,
                    locked: true,
                    categoryLocked: true
                });
            }
            await saveCostData(user.email, masterKey, costs);

            const assetsData = await getAssetsData(user.email, masterKey) || { currentAssets: [], desiredOutflows: [] };
            let currentAssets = assetsData.currentAssets || [];
            const assetName = t('realEstate.netAssetValue');
            const numericAssetValue = Math.max(0, Math.round(totals.assetValue));

            currentAssets = currentAssets.filter(a =>
                a.name !== assetName &&
                a.name !== 'Housing' &&
                a.name !== 'Logement' &&
                a.name !== 'Main Residence' &&
                a.name !== 'Valeur Nette du Bien'
            );

            if (numericAssetValue > 0 && lodgingSituation === 'owner') {
                const maxId = currentAssets.length > 0 ? Math.max(...currentAssets.map(a => a.id)) : 0;
                const housingAsset = {
                    id: maxId + 1,
                    name: assetName,
                    amount: numericAssetValue.toString(),
                    category: 'Illiquid',
                    preserve: 'Yes',
                    availabilityType: 'Period',
                    availabilityTimeframe: 'within_20_25y',
                    availabilityDate: '',
                    locked: false
                };
                currentAssets.unshift(housingAsset);
            }

            await saveAssetsData(user.email, masterKey, {
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

    const translateDefault = (name) => {
        const defaults = {
            'Primary Mortgage': 'realEstate.defaultMortgageName',
            'Main Property': 'realEstate.defaultPropertyName',
            'Electricity': 'realEstate.defaultMaintenance.electricity',
            'Heating': 'realEstate.defaultMaintenance.heating',
            'Insurance': 'realEstate.defaultMaintenance.insurance',
            'Taxes': 'realEstate.defaultMaintenance.taxes',
            'Renovation funding': 'realEstate.defaultMaintenance.renovation',
            'Garden': 'realEstate.defaultMaintenance.garden'
        };
        return defaults[name] ? t(defaults[name]) : name;
    };

    const renderKeyFigures = (data, isZone1 = false) => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('realEstate.totalCostsYearly')}</h3>
                    <div className="text-xl font-bold text-primary">
                        CHF {data.yearlyCost.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/30">
                <CardContent className="pt-4 pb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('realEstate.totalCostsMonthly')}</h3>
                    <div className="text-2xl font-bold text-primary">
                        CHF {data.monthlyCost.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t('realEstate.carriedToCosts')}</p>
                </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-4 pb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('realEstate.netAssetValue')}</h3>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        CHF {data.assetValue.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t('realEstate.carriedToAssets')}</p>
                </CardContent>
            </Card>
        </div>
    );

    // Tenant Maintenance Rows (Use Prop 1)
    const tenantMaintenanceRows = maintenanceRows.filter(r => (r.propertyId || 1) === 1);

    return (
        <div className="min-h-screen py-6 bg-background space-y-8">
            <PageHeader
                title={t('realEstate.title')}
                subtitle={t('realEstate.subtitle')}
                showBack={true}
                onBack={() => navigate('/costs')}
            />

            <div className="max-w-5xl mx-auto px-4 space-y-8">

                {/* 1. LODGING SITUATION TOGGLE */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">{t('realEstate.lodgingSituation')}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <RadioGroup
                            value={lodgingSituation}
                            onValueChange={setLodgingSituation}
                            className="flex items-center gap-6"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="owner" id="r-owner" />
                                <Label htmlFor="r-owner" className="font-medium text-base cursor-pointer">{t('realEstate.owner')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="tenant" id="r-tenant" />
                                <Label htmlFor="r-tenant" className="font-medium text-base cursor-pointer">{t('realEstate.tenant')}</Label>
                            </div>
                        </RadioGroup>

                        {lodgingSituation === 'owner' && (
                            <div className="flex items-center gap-3 ml-0 sm:ml-4 border-l pl-0 sm:pl-6 border-border/50">
                                <Label className="whitespace-nowrap font-medium">{t('realEstate.howManyProperties')}</Label>
                                <Select value={propertyCount} onValueChange={setPropertyCount}>
                                    <SelectTrigger className="w-[70px]">
                                        <SelectValue placeholder="1" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ZONE 2: GLOBAL KEY FIGURES */}
                {renderKeyFigures(totals)}

                {/* 3. TENANT VIEW */}
                {lodgingSituation === 'tenant' && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('realEstate.rentAmount')}</CardTitle>
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
                                        <TableRow>
                                            <TableCell>
                                                <Input
                                                    value={rentName}
                                                    onChange={(e) => setRentName(e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="text"
                                                    value={rentAmount ? rentAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/'/g, '');
                                                        if (!isNaN(rawValue)) {
                                                            setRentAmount(rawValue);
                                                        }
                                                    }}
                                                    className="text-right"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <RadioGroup
                                                    value={rentFrequency}
                                                    onValueChange={setRentFrequency}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Monthly" id="rent-monthly" />
                                                        <Label htmlFor="rent-monthly">{t('realEstate.monthly')}</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="Yearly" id="rent-yearly" />
                                                        <Label htmlFor="rent-yearly">{t('realEstate.yearly')}</Label>
                                                    </div>
                                                </RadioGroup>
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* MAINTENANCE (Tenant - Prop 1) */}
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
                                        {tenantMaintenanceRows.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell>
                                                    <Input value={translateDefault(row.name)} onChange={e => updateRow(setMaintenanceRows, row.id, 'name', e.target.value)} />
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
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setMaintenanceRows, { name: '', amount: '', frequency: 'Yearly' }, 1)}>
                                    <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                                </Button>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* 4. OWNER VIEW: TABS */}
                {lodgingSituation === 'owner' && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList>
                            {Array.from({ length: parseInt(propertyCount) }, (_, i) => i + 1).map(num => (
                                <TabsTrigger key={num} value={num.toString()} className="px-8 text-lg">
                                    {t('realEstate.property')} {num}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {Array.from({ length: parseInt(propertyCount) }, (_, i) => i + 1).map(num => {
                            const tabId = num;
                            const propTotals = getPropertyTotals(tabId);
                            const propMortgages = mortgageRows.filter(r => (r.propertyId || 1) === tabId);
                            const propAssets = assetRows.filter(r => (r.propertyId || 1) === tabId);
                            const propMaintenance = maintenanceRows.filter(r => (r.propertyId || 1) === tabId);

                            return (
                                <TabsContent key={num} value={num.toString()} className="mt-0">
                                    <div className="border border-border/50 rounded-lg p-6 space-y-8 bg-card/30">

                                        {/* ZONE 1: PROPERTY SPECIFIC TOTALS */}
                                        {renderKeyFigures(propTotals, true)}

                                        {/* MORTGAGE */}
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
                                                        {propMortgages.map(row => {
                                                            const yearly = (parseFloat(row.amount) || 0) * ((parseFloat(row.rate) || 0) / 100);
                                                            return (
                                                                <TableRow key={row.id}>
                                                                    <TableCell>
                                                                        <Input value={translateDefault(row.name)} onChange={e => updateRow(setMortgageRows, row.id, 'name', e.target.value)} />
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
                                                        <TableRow className="bg-muted/50 font-bold">
                                                            <TableCell>{t('realEstate.total')}</TableCell>
                                                            <TableCell className="text-right">CHF {propTotals.mortgageTotal.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                            <TableCell colSpan={2}></TableCell>
                                                            <TableCell className="text-right">{propTotals.mortgageYearlyTotal.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                                <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setMortgageRows, { name: '', amount: '', maturityDate: '', rate: '' }, tabId)}>
                                                    <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        {/* MARKET VALUE (Fixed Single Row) */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>{t('realEstate.marketValue')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {/* Ensure we have at least one asset row to display. Logic handled in ensureDefaults, but fallback here just in case visually */}
                                                {(() => {
                                                    const row = propAssets[0] || { id: -1, name: '', amount: '' }; // Should exist via ensureDefaults
                                                    // If for some reason it doesn't exist yet (render timing), we act safe.
                                                    if (row.id === -1) return null;

                                                    return (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <Label>{t('realEstate.name')}</Label>
                                                                <Input
                                                                    value={row.name}
                                                                    onChange={e => updateRow(setAssetRows, row.id, 'name', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('realEstate.estimatedValue')}</Label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">CHF</span>
                                                                    <Input
                                                                        type="text"
                                                                        value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                                        onChange={(e) => {
                                                                            const rawValue = e.target.value.replace(/'/g, '');
                                                                            if (!isNaN(rawValue)) {
                                                                                updateRow(setAssetRows, row.id, 'amount', rawValue);
                                                                            }
                                                                        }}
                                                                        className="pl-12 text-right"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </CardContent>
                                        </Card>

                                        {/* MAINTENANCE */}
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
                                                        {propMaintenance.map(row => (
                                                            <TableRow key={row.id}>
                                                                <TableCell>
                                                                    <Input value={translateDefault(row.name)} onChange={e => updateRow(setMaintenanceRows, row.id, 'name', e.target.value)} />
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
                                                        <TableRow className="bg-muted/50 font-bold">
                                                            <TableCell>{t('realEstate.total')}</TableCell>
                                                            <TableCell className="text-right">CHF {
                                                                propMaintenance.reduce((sum, r) => sum + (r.frequency === 'Monthly' ? (parseFloat(r.amount) || 0) * 12 : (parseFloat(r.amount) || 0)), 0).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                                            }</TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                                <Button variant="outline" size="sm" className="mt-4" onClick={() => addRow(setMaintenanceRows, { name: '', amount: '', frequency: 'Yearly' }, tabId)}>
                                                    <Plus className="h-4 w-4 mr-2" /> {t('realEstate.addLine')}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                )}

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
