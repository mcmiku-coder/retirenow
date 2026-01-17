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
import { getAssetsData, saveAssetsData, getUserData } from '../utils/database';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { Plus, Trash2 } from 'lucide-react';

const AssetsOverview = () => {
    const navigate = useNavigate();
    const { user, password } = useAuth();
    const { t, language } = useLanguage();
    const [currentAssets, setCurrentAssets] = useState([]);
    const [desiredOutflows, setDesiredOutflows] = useState([]);
    const [theoreticalDeathDate, setTheoreticalDeathDate] = useState('');
    const [nextAssetId, setNextAssetId] = useState(4);
    const [nextOutflowId, setNextOutflowId] = useState(3);
    const [loading, setLoading] = useState(true);

    const timeframeOptions = [
        { value: 'within_5y', label: language === 'fr' ? 'dans les 5 prochaines années' : 'within next 5 years' },
        { value: 'within_5_10y', label: language === 'fr' ? 'dans 5 à 10 ans' : 'within 5 to 10y' },
        { value: 'within_10_15y', label: language === 'fr' ? 'dans 10 à 15 ans' : 'within 10 to 15y' },
        { value: 'within_15_20y', label: language === 'fr' ? 'dans 15 à 20 ans' : 'within 15 to 20y' },
        { value: 'within_20_25y', label: language === 'fr' ? 'dans 20 à 25 ans' : 'within 20 to 25y' },
        { value: 'within_25_30y', label: language === 'fr' ? 'dans 25 à 30 ans' : 'within 25 to 30y' }
    ];

    useEffect(() => {
        if (!user || !password) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                // Get theoretical death date from user data
                const userData = await getUserData(user.email, password);
                const deathDate = userData?.theoreticalDeathDate || '';
                setTheoreticalDeathDate(deathDate);

                const savedData = await getAssetsData(user.email, password);
                const today = new Date().toISOString().split('T')[0];

                if (savedData && savedData.currentAssets && savedData.currentAssets.length > 0) {
                    setCurrentAssets(savedData.currentAssets);
                    setDesiredOutflows(savedData.desiredOutflows || getDefaultOutflows(deathDate));
                    const maxAssetId = Math.max(...savedData.currentAssets.map(r => r.id));
                    setNextAssetId(maxAssetId + 1);
                    if (savedData.desiredOutflows && savedData.desiredOutflows.length > 0) {
                        const maxOutflowId = Math.max(...savedData.desiredOutflows.map(r => r.id));
                        setNextOutflowId(maxOutflowId + 1);
                    }
                } else {
                    // Initialize with default rows
                    setCurrentAssets(getDefaultAssets(today));
                    setDesiredOutflows(getDefaultOutflows(deathDate));
                }
            } catch (error) {
                console.error('Error loading assets data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, password, navigate, t, language]);

    const getDefaultAssets = (today) => [
        {
            id: 1,
            name: language === 'fr' ? 'Actifs liquides' : 'Liquid assets',
            amount: '',
            category: 'Liquid',
            preserve: 'No',
            availabilityDate: today,
            availabilityTimeframe: '',
            locked: false
        },
        {
            id: 2,
            name: language === 'fr' ? 'Actifs illiquides' : 'Illiquid assets',
            amount: '',
            category: 'Illiquid',
            preserve: 'No',
            availabilityDate: '',
            availabilityTimeframe: '',
            locked: false
        },
        {
            id: 3,
            name: language === 'fr' ? 'Héritage' : 'Inheritance',
            amount: '',
            category: 'Illiquid',
            preserve: 'No',
            availabilityDate: '',
            availabilityTimeframe: '',
            locked: false
        }
    ];

    const getDefaultOutflows = (deathDate) => [
        {
            id: 1,
            name: language === 'fr' ? 'Donations avant décès' : 'Donations before death',
            amount: '',
            category: 'none',
            madeAvailableDate: '',
            madeAvailableTimeframe: '',
            locked: false
        },
        {
            id: 2,
            name: language === 'fr' ? 'Transmission au décès' : 'Transmission at death',
            amount: '',
            category: 'Illiquid',
            madeAvailableDate: deathDate,
            madeAvailableTimeframe: '',
            locked: false
        }
    ];

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
            locked: false
        }]);
        setNextAssetId(nextAssetId + 1);
    };

    const deleteAsset = (id) => {
        setCurrentAssets(currentAssets.filter(row => row.id !== id));
    };

    const resetAssets = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentAssets(getDefaultAssets(today));
        setNextAssetId(4);
    };

    // Desired Outflows functions
    const updateOutflow = (id, field, value) => {
        setDesiredOutflows(desiredOutflows.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addOutflow = () => {
        setDesiredOutflows([...desiredOutflows, {
            id: nextOutflowId,
            name: '',
            amount: '',
            category: 'none',
            madeAvailableDate: '',
            madeAvailableTimeframe: '',
            locked: false
        }]);
        setNextOutflowId(nextOutflowId + 1);
    };

    const deleteOutflow = (id) => {
        setDesiredOutflows(desiredOutflows.filter(row => row.id !== id));
    };

    const resetOutflows = () => {
        setDesiredOutflows(getDefaultOutflows(theoreticalDeathDate));
        setNextOutflowId(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                currentAssets,
                desiredOutflows
            };

            await saveAssetsData(user.email, password, dataToSave);
            navigate('/retirement-parameters'); // Updated: skip removed retirement-inputs page
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
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <WorkflowNavigation />
                <div className="max-w-6xl w-full">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                                {language === 'fr' ? 'Vue d\'ensemble et perspective des actifs' : 'Asset overview and perspective'}
                            </h1>
                            <p className="text-muted-foreground">
                                {language === 'fr'
                                    ? 'Définissez vos actifs actuels, entrées attendues et sorties souhaitées'
                                    : 'Define your current assets, expected inflows, and desired outflows'}
                            </p>
                        </div>
                    </div>

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
                                                <th className="text-left p-2 font-semibold" style={{ width: '200px' }}>{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Préserver' : 'Preserve'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Type de disponibilité' : 'Availability Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '250px' }}>{language === 'fr' ? 'Détails de disponibilité' : 'Availability Details'}</th>
                                                <th className="text-center p-2 font-semibold" style={{ width: '80px' }}>{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentAssets.map((row) => (
                                                <tr key={row.id} className="border-b hover:bg-muted/30">
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
                                                            type="number"
                                                            value={row.amount}
                                                            onChange={(e) => updateAsset(row.id, 'amount', e.target.value)}
                                                            placeholder="0"
                                                            className="min-w-[120px]"
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
                                                        <RadioGroup
                                                            value={row.preserve}
                                                            onValueChange={(value) => updateAsset(row.id, 'preserve', value)}
                                                            className="flex gap-4"
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="Yes" id={`asset-yes-${row.id}`} />
                                                                <Label htmlFor={`asset-yes-${row.id}`} className="text-sm">{language === 'fr' ? 'Oui' : 'Yes'}</Label>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <RadioGroupItem value="No" id={`asset-no-${row.id}`} />
                                                                <Label htmlFor={`asset-no-${row.id}`} className="text-sm">{language === 'fr' ? 'Non' : 'No'}</Label>
                                                            </div>
                                                        </RadioGroup>
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
                                                            <Input
                                                                type="date"
                                                                value={row.availabilityDate}
                                                                onChange={(e) => updateAsset(row.id, 'availabilityDate', e.target.value)}
                                                                className="min-w-[140px]"
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

                        {/* Desired Outflows */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {language === 'fr' ? 'Sorties souhaitées' : 'Desired outflows'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="border-b">
                                                <th className="text-left p-2 font-semibold" style={{ width: '200px' }}>{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Type de disponibilité' : 'Availability Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '250px' }}>{language === 'fr' ? 'Détails de disponibilité' : 'Availability Details'}</th>
                                                <th className="text-center p-2 font-semibold" style={{ width: '80px' }}>{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {desiredOutflows.map((row) => (
                                                <tr key={row.id} className="border-b hover:bg-muted/30">
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
                                                            type="number"
                                                            value={row.amount}
                                                            onChange={(e) => updateOutflow(row.id, 'amount', e.target.value)}
                                                            placeholder="0"
                                                            className="min-w-[120px]"
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
                                                            <Input
                                                                type="date"
                                                                value={row.madeAvailableDate}
                                                                onChange={(e) => updateOutflow(row.id, 'madeAvailableDate', e.target.value)}
                                                                className="min-w-[140px]"
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
                                {language === 'fr' ? 'Continuer vers les options de simulation et saisie des prestations de retraite' : 'Continue to simulation options and retirement benefits inputs'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AssetsOverview;
