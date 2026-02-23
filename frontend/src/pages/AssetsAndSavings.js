import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { getAssetsData, saveAssetsData, getUserData, getRealEstateData, getScenarioData } from '../utils/database';
import { getLegalRetirementDate } from '../utils/calculations';
import PageHeader from '../components/PageHeader';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';
import { Plus, Trash2 } from 'lucide-react';

const AssetsOverview = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [currentAssets, setCurrentAssets] = useState([]);
    const [projectedOutflows, setProjectedOutflows] = useState([]);
    const [theoreticalDeathDate, setTheoreticalDeathDate] = useState('');
    const [legalRetirementDate, setLegalRetirementDate] = useState('');
    const [wishedRetirementDate, setWishedRetirementDate] = useState('');
    const [nextAssetId, setNextAssetId] = useState(4);
    const [nextOutflowId, setNextOutflowId] = useState(3);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [p1RetirementLegalDate, setP1RetirementLegalDate] = useState('');
    const [p1WishedRetirementDate, setP1WishedRetirementDate] = useState('');
    const [p1DeathDate, setP1DeathDate] = useState('');
    const [p2RetirementLegalDate, setP2RetirementLegalDate] = useState('');
    const [p2WishedRetirementDate, setP2WishedRetirementDate] = useState('');
    const [p2DeathDate, setP2DeathDate] = useState('');

    const timeframeOptions = [
        { value: 'within_5y', label: language === 'fr' ? 'dans les 5 prochaines années' : 'within next 5 years' },
        { value: 'within_5_10y', label: language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y' },
        { value: 'within_10_15y', label: language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y' },
        { value: 'within_15_20y', label: language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y' },
        { value: 'within_20_25y', label: language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y' },
        { value: 'within_25_30y', label: language === 'fr' ? 'dans 25 à 30 ans' : 'within 25 to 30y' }
    ];

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                // Get theoretical death date from user data
                const userData = await getUserData(user.email, masterKey);
                setUserData(userData);

                const scenarioData = await getScenarioData(user.email, masterKey);

                if (userData) {
                    // Person 1 Dates
                    const p1Legal = getLegalRetirementDate(userData.birthDate, userData.gender);
                    const p1LegalStr = p1Legal.toISOString().split('T')[0];
                    setP1RetirementLegalDate(p1LegalStr);
                    setP1WishedRetirementDate(scenarioData?.wishedRetirementDate || p1LegalStr);

                    if (userData.theoreticalDeathDate) {
                        setP1DeathDate(userData.theoreticalDeathDate);
                    } else {
                        const approx = userData.gender === 'male' ? 80 : 85;
                        const d = new Date(userData.birthDate);
                        d.setUTCFullYear(d.getUTCFullYear() + approx);
                        setP1DeathDate(d.toISOString().split('T')[0]);
                    }

                    // Person 2 Dates
                    if (userData.analysisType === 'couple' && userData.birthDate2) {
                        const p2Legal = getLegalRetirementDate(userData.birthDate2, userData.gender2);
                        const p2LegalStr = p2Legal.toISOString().split('T')[0];
                        setP2RetirementLegalDate(p2LegalStr);
                        setP2WishedRetirementDate(scenarioData?.wishedRetirementDate2 || p2LegalStr);

                        if (userData.theoreticalDeathDate2) {
                            setP2DeathDate(userData.theoreticalDeathDate2);
                        } else {
                            const approx = userData.gender2 === 'male' ? 80 : 85;
                            const d = new Date(userData.birthDate2);
                            d.setUTCFullYear(d.getUTCFullYear() + approx);
                            setP2DeathDate(d.toISOString().split('T')[0]);
                        }
                    }
                }

                const savedData = await getAssetsData(user.email, masterKey);
                const today = new Date().toISOString().split('T')[0];

                if (savedData && savedData.currentAssets && savedData.currentAssets.length > 0) {
                    // Ensure owner exists for saved assets
                    const assetsWithOwner = savedData.currentAssets.map(a => ({
                        ...a,
                        owner: a.owner || (userData?.analysisType === 'couple' ? 'shared' : 'p1')
                    }));
                    setCurrentAssets(assetsWithOwner);

                    // Ensure owner exists for saved outflows
                    const savedOutflows = savedData.projectedOutflows || savedData.desiredOutflows || [];
                    const outflowsWithOwner = savedOutflows.length > 0
                        ? savedOutflows.map(o => ({
                            ...o,
                            owner: o.owner || (userData?.analysisType === 'couple' ? 'shared' : 'p1')
                        }))
                        : getDefaultOutflows(p1Death, p2Death);

                    setProjectedOutflows(outflowsWithOwner);

                    const maxAssetId = Math.max(...assetsWithOwner.map(r => r.id));
                    setNextAssetId(maxAssetId + 1);
                    if (outflowsWithOwner.length > 0) {
                        const maxOutflowId = Math.max(...outflowsWithOwner.map(r => r.id));
                        setNextOutflowId(maxOutflowId + 1);
                    }
                } else {
                    // Initialize with default rows
                    setCurrentAssets(getDefaultAssets(today));
                    setProjectedOutflows(getDefaultOutflows(p1Death, p2Death));
                }
            } catch (error) {
                console.error('Error loading assets data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, masterKey, navigate, t, language]);

    const getDefaultAssets = (today) => [
        {
            id: 1,
            name: language === 'fr' ? 'Actifs liquides' : 'Liquid assets',
            amount: '',
            category: 'Liquid',
            preserve: 'No',
            availabilityType: 'Date',
            availabilityDate: today,
            availabilityTimeframe: '',
            owner: 'shared',
            locked: false
        },
        {
            id: 2,
            name: language === 'fr' ? 'Actifs illiquides' : 'Illiquid assets',
            amount: '',
            category: 'Illiquid',
            preserve: 'No',
            availabilityType: 'Date',
            availabilityDate: today,
            availabilityTimeframe: '',
            owner: 'shared',
            locked: false
        },
        {
            id: 3,
            name: language === 'fr' ? 'Héritage' : 'Inheritance',
            amount: '',
            category: 'Illiquid',
            preserve: 'No',
            availabilityType: 'Date',
            availabilityDate: '',
            availabilityTimeframe: '',
            owner: 'shared',
            locked: false
        }
    ];

    const getDefaultOutflows = (p1Death, p2Death) => {
        const sharedDeathDate = (p1Death > p2Death) ? p1Death : p2Death;
        return [
            {
                id: 1,
                name: language === 'fr' ? 'Donations avant décès' : 'Donations before death',
                amount: '',
                category: 'none',
                madeAvailableDate: '',
                madeAvailableTimeframe: '',
                owner: 'shared',
                locked: false
            },
            {
                id: 2,
                name: language === 'fr' ? 'Transmission au décès' : 'Transmission at death',
                amount: '',
                category: 'Illiquid',
                madeAvailableDate: sharedDeathDate,
                madeAvailableTimeframe: '',
                owner: 'shared',
                locked: false
            }
        ];
    };

    // Current Assets functions
    const updateAsset = (id, field, value) => {
        setCurrentAssets(currentAssets.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addAsset = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentAssets([...currentAssets, {
            id: nextAssetId,
            name: '',
            amount: '',
            category: 'Liquid',
            preserve: 'No',
            availabilityDate: today,
            availabilityTimeframe: '',
            owner: userData?.analysisType === 'couple' ? 'shared' : 'p1',
            locked: false
        }]);
        setNextAssetId(nextAssetId + 1);
    };

    const deleteAsset = (id) => {
        setCurrentAssets(currentAssets.filter(row => row.id !== id));
    };

    const resetAssets = async () => {
        const today = new Date().toISOString().split('T')[0];
        let newAssets = getDefaultAssets(today);

        try {
            const reData = await getRealEstateData(user.email, masterKey);
            if (reData && reData.totals && reData.totals.assetValue > 0) {
                const maxId = Math.max(...newAssets.map(a => a.id));
                newAssets.push({
                    id: maxId + 1,
                    name: t('realEstate.netAssetValue'),
                    amount: Math.round(reData.totals.assetValue).toString(),
                    category: 'Illiquid',
                    preserve: 'Yes',
                    availabilityType: 'Date',
                    availabilityDate: '',
                    availabilityTimeframe: '',
                    locked: false
                });
            }
        } catch (error) {
            console.error('Error fetching real estate data for reset:', error);
        }

        setCurrentAssets(newAssets);
        const finalMaxId = Math.max(...newAssets.map(a => a.id));
        setNextAssetId(finalMaxId + 1);

        // Save to database immediately
        try {
            const dataToSave = {
                currentAssets: newAssets,
                projectedOutflows
            };
            await saveAssetsData(user.email, masterKey, dataToSave);

            // ALSO clear investment book in scenarioData if it exists
            const scenarioData = await getScenarioData(user.email, masterKey);
            if (scenarioData) {
                await saveScenarioData(user.email, masterKey, {
                    ...scenarioData,
                    investedBook: []
                });
            }

            toast.success(language === 'fr' ? 'Actifs réinitialisés' : 'Assets reset to defaults');
        } catch (error) {
            console.error('Error saving reset assets:', error);
            toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting assets');
        }
    };

    // Projected Outflows functions
    const updateOutflow = (id, field, value) => {
        setProjectedOutflows(projectedOutflows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addOutflow = () => {
        setProjectedOutflows([...projectedOutflows, {
            id: nextOutflowId,
            name: '',
            amount: '',
            category: 'none',
            madeAvailableDate: '',
            madeAvailableTimeframe: '',
            owner: userData?.analysisType === 'couple' ? 'shared' : 'p1',
            locked: false
        }]);
        setNextOutflowId(nextOutflowId + 1);
    };

    const deleteOutflow = (id) => {
        setProjectedOutflows(projectedOutflows.filter(row => row.id !== id));
    };

    const resetOutflows = async () => {
        const newOutflows = getDefaultOutflows(p1DeathDate, p2DeathDate);
        setProjectedOutflows(newOutflows);
        setNextOutflowId(3);

        // Save to database immediately
        try {
            const dataToSave = {
                currentAssets,
                projectedOutflows: newOutflows
            };
            await saveAssetsData(user.email, masterKey, dataToSave);
            toast.success(language === 'fr' ? 'Sorties réinitialisées' : 'Outflows reset to defaults');
        } catch (error) {
            console.error('Error saving reset outflows:', error);
            toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting outflows');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                currentAssets,
                projectedOutflows
            };

            await saveAssetsData(user.email, masterKey, dataToSave);
            navigate('/retirement-inputs'); // Navigate to new retirement benefits questionnaire
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
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-6">
            <div className="w-[68%] mx-auto mb-6 px-4">
            </div>

            <PageHeader
                title={language === 'fr' ? 'Vue d\'overview et perspective des actifs' : 'Asset overview and perspective'}
                subtitle={language === 'fr'
                    ? 'Définissez vos actifs actuels, entrées attendues et sorties projetées'
                    : 'Define your current assets, expected inflows, and projected outflows'}
            />

            <div className="w-[68%] mx-auto px-4">
                <div className="w-full mx-auto">

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Current Assets and Possible Inflows */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {language === 'fr' ? 'Actifs actuels et entrées possibles' : 'Current assets and possible inflows'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                {userData?.analysisType === 'couple' && (
                                                    <th className="text-left p-2 font-semibold" style={{ width: '130px' }}>{language === 'fr' ? 'Personne' : 'Person'}</th>
                                                )}
                                                <th className="text-left p-2 font-semibold" style={{ width: '200px' }}>{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '130px' }}>{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '130px' }}>{language === 'fr' ? 'Type' : 'Availability Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '220px' }}>{language === 'fr' ? 'Valeur' : 'Availability Value'}</th>
                                                <th className="text-center p-2 font-semibold" style={{ width: '80px' }}>{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentAssets.map((row) => (
                                                <tr key={row.id} className="border-b hover:bg-muted/30">
                                                    {userData?.analysisType === 'couple' && (
                                                        <td className="p-2">
                                                            <Select
                                                                value={row.owner || 'shared'}
                                                                onValueChange={(value) => updateAsset(row.id, 'owner', value)}
                                                            >
                                                                <SelectTrigger className={`w-[130px] font-medium ${(row.owner === 'p1') ? 'text-blue-400' : (row.owner === 'p2') ? 'text-purple-400' : 'text-gray-400'}`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="p1" className="text-blue-400 font-medium">{userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1')}</SelectItem>
                                                                    <SelectItem value="p2" className="text-purple-400 font-medium">{userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')}</SelectItem>
                                                                    <SelectItem value="shared" className="text-gray-400">{language === 'fr' ? 'Partagé' : 'Shared'}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                    )}
                                                    <td className="p-2">
                                                        <Input
                                                            value={row.name}
                                                            onChange={(e) => updateAsset(row.id, 'name', e.target.value)}
                                                            disabled={row.locked}
                                                            className="min-w-[150px]"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="text"
                                                            value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    updateAsset(row.id, 'amount', rawValue);
                                                                }
                                                            }}
                                                            placeholder="0"
                                                            className="min-w-[120px] text-right"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={row.category}
                                                            onValueChange={(value) => updateAsset(row.id, 'category', value)}
                                                            disabled={row.locked}
                                                        >
                                                            <SelectTrigger className="min-w-[120px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Liquid">{language === 'fr' ? 'Liquide' : 'Liquid'}</SelectItem>
                                                                <SelectItem value="Illiquid">{language === 'fr' ? 'Illiquide' : 'Illiquid'}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={row.availabilityType || (row.availabilityTimeframe ? 'Period' : 'Date')}
                                                            onValueChange={(value) => updateAsset(row.id, 'availabilityType', value)}
                                                        >
                                                            <SelectTrigger className="min-w-[120px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                                                <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-2">
                                                        {(row.availabilityType === 'Period' || (!row.availabilityType && row.availabilityTimeframe)) ? (
                                                            <Select
                                                                value={row.availabilityTimeframe}
                                                                onValueChange={(value) => updateAsset(row.id, 'availabilityTimeframe', value)}
                                                            >
                                                                <SelectTrigger className="min-w-[180px]">
                                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {timeframeOptions.map(opt => (
                                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <DateInputWithShortcuts
                                                                value={row.availabilityDate}
                                                                onChange={(e) => updateAsset(row.id, 'availabilityDate', e.target.value)}
                                                                className="w-fit"
                                                                retirementDate={row.owner === 'p2' ? p2WishedRetirementDate : p1WishedRetirementDate}
                                                                legalDate={row.owner === 'p2' ? p2RetirementLegalDate : p1RetirementLegalDate}
                                                                mode="start"
                                                            />
                                                        )}
                                                    </td>

                                                    <td className="p-2 text-center">
                                                        <Button
                                                            type="button"
                                                            onClick={() => deleteAsset(row.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button type="button" onClick={addAsset} variant="outline" size="sm">
                                        <Plus className="h-4 w-4 mr-1" />
                                        {language === 'fr' ? '+ ajouter actif ou entrée' : '+ add asset or inflow'}
                                    </Button>
                                    <Button type="button" onClick={resetAssets} variant="outline" size="sm">
                                        {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Projected Outflows */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {language === 'fr' ? 'Sorties projetées' : 'Projected outflows'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                {userData?.analysisType === 'couple' && (
                                                    <th className="text-left p-2 font-semibold" style={{ width: '130px' }}>{language === 'fr' ? 'Personne' : 'Person'}</th>
                                                )}
                                                <th className="text-left p-2 font-semibold" style={{ width: '200px' }}>{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '130px' }}>{language === 'fr' ? 'Type' : 'Availability Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '220px' }}>{language === 'fr' ? 'Valeur' : 'Availability Value'}</th>
                                                <th className="text-center p-2 font-semibold" style={{ width: '80px' }}>{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {projectedOutflows.map((row) => (
                                                <tr key={row.id} className="border-b hover:bg-muted/30">
                                                    {userData?.analysisType === 'couple' && (
                                                        <td className="p-2">
                                                            <Select
                                                                value={row.owner || 'shared'}
                                                                onValueChange={(value) => updateOutflow(row.id, 'owner', value)}
                                                            >
                                                                <SelectTrigger className={`w-[130px] font-medium ${(row.owner === 'p1') ? 'text-blue-400' : (row.owner === 'p2') ? 'text-purple-400' : 'text-gray-400'}`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="p1" className="text-blue-400 font-medium">{userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1')}</SelectItem>
                                                                    <SelectItem value="p2" className="text-purple-400 font-medium">{userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2')}</SelectItem>
                                                                    <SelectItem value="shared" className="text-gray-400">{language === 'fr' ? 'Partagé' : 'Shared'}</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                    )}
                                                    <td className="p-2">
                                                        <Input
                                                            value={row.name}
                                                            onChange={(e) => updateOutflow(row.id, 'name', e.target.value)}
                                                            disabled={row.locked}
                                                            className="min-w-[150px]"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="text"
                                                            value={row.amount ? row.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/'/g, '');
                                                                if (!isNaN(rawValue)) {
                                                                    updateOutflow(row.id, 'amount', rawValue);
                                                                }
                                                            }}
                                                            placeholder="0"
                                                            className="min-w-[120px] text-right"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Select
                                                            value={row.madeAvailableType || (row.madeAvailableTimeframe ? 'Period' : 'Date')}
                                                            onValueChange={(value) => updateOutflow(row.id, 'madeAvailableType', value)}
                                                        >
                                                            <SelectTrigger className="min-w-[120px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Date">{language === 'fr' ? 'Date' : 'Date'}</SelectItem>
                                                                <SelectItem value="Period">{language === 'fr' ? 'Période' : 'Period'}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="p-2">
                                                        {(row.madeAvailableType === 'Period' || (!row.madeAvailableType && row.madeAvailableTimeframe)) ? (
                                                            <Select
                                                                value={row.madeAvailableTimeframe}
                                                                onValueChange={(value) => updateOutflow(row.id, 'madeAvailableTimeframe', value)}
                                                            >
                                                                <SelectTrigger className="min-w-[180px]">
                                                                    <SelectValue placeholder={language === 'fr' ? 'Sélectionner' : 'Select'} />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {timeframeOptions.map(opt => (
                                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <DateInputWithShortcuts
                                                                value={row.madeAvailableDate}
                                                                onChange={(e) => updateOutflow(row.id, 'madeAvailableDate', e.target.value)}
                                                                className="w-fit"
                                                                retirementDate={row.owner === 'p2' ? p2WishedRetirementDate : p1WishedRetirementDate}
                                                                legalDate={row.owner === 'p2' ? p2RetirementLegalDate : p1RetirementLegalDate}
                                                                deathDate={row.owner === 'p2' ? p2DeathDate : (row.owner === 'shared' ? (p1DeathDate > p2DeathDate ? p1DeathDate : p2DeathDate) : p1DeathDate)}
                                                                mode="end"
                                                            />
                                                        )}
                                                    </td>

                                                    <td className="p-2 text-center">
                                                        <Button
                                                            type="button"
                                                            onClick={() => deleteOutflow(row.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <Button type="button" onClick={addOutflow} variant="outline" size="sm">
                                        <Plus className="h-4 w-4 mr-1" />
                                        {language === 'fr' ? '+ ajouter sortie' : '+ add outflow'}
                                    </Button>
                                    <Button type="button" onClick={resetOutflows} variant="outline" size="sm">
                                        {language === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to defaults'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Continue Button */}
                        <div className="flex justify-center mt-6">
                            <Button type="submit" size="lg" className="px-12 text-lg" disabled={loading}>
                                {language === 'fr' ? 'Continuer vers les prestations de retraite' : 'Continue to retirement benefits'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssetsOverview;
