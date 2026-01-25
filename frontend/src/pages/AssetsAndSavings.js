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
import { getAssetsData, saveAssetsData, getUserData, getRealEstateData } from '../utils/database';
import PageHeader from '../components/PageHeader';
import { Plus, Trash2 } from 'lucide-react';

const AssetsOverview = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
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
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                // Get theoretical death date from user data
                const userData = await getUserData(user.email, masterKey);
                const deathDate = userData?.theoreticalDeathDate || '';
                setTheoreticalDeathDate(deathDate);

                const savedData = await getAssetsData(user.email, masterKey);
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
    }, [user, masterKey, navigate, t, language]);

    const getDefaultAssets = (today) => [
        {
            id: 1,
            name: language === 'fr' ? 'Actifs liquides' : 'Liquid assets',
            amount: '',
            category: 'Liquid',
            preserve: 'No',
            ownType: 'Date',
            ownDate: today,
            availabilityType: 'Date',
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
            ownType: 'Date',
            ownDate: today,
            availabilityType: 'Date',
            availabilityDate: today,
            availabilityTimeframe: '',
            locked: false
        },
        {
            id: 3,
            name: language === 'fr' ? 'Héritage' : 'Inheritance',
            amount: '',
            category: 'Illiquid',
            preserve: 'No',
            ownType: 'Date',
            ownDate: '',
            availabilityType: 'Date',
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
                    ownType: 'Date',
                    ownDate: today,
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
                desiredOutflows
            };
            await saveAssetsData(user.email, masterKey, dataToSave);
            toast.success(language === 'fr' ? 'Actifs réinitialisés' : 'Assets reset to defaults');
        } catch (error) {
            console.error('Error saving reset assets:', error);
            toast.error(language === 'fr' ? 'Erreur lors de la réinitialisation' : 'Error resetting assets');
        }
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

    const resetOutflows = async () => {
        const newOutflows = getDefaultOutflows(theoreticalDeathDate);
        setDesiredOutflows(newOutflows);
        setNextOutflowId(3);

        // Save to database immediately
        try {
            const dataToSave = {
                currentAssets,
                desiredOutflows: newOutflows
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
                desiredOutflows
            };

            await saveAssetsData(user.email, masterKey, dataToSave);
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
        <div className="min-h-screen py-6">
            <div className="w-[80%] mx-auto mb-6 px-4">
            </div>

            <PageHeader
                title={language === 'fr' ? 'Vue d\'overview et perspective des actifs' : 'Asset overview and perspective'}
                subtitle={language === 'fr'
                    ? 'Définissez vos actifs actuels, entrées attendues et sorties souhaitées'
                    : 'Define your current assets, expected inflows, and desired outflows'}
            />

            <div className="w-[80%] mx-auto px-4">
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
                                                <th className="text-left p-2 font-semibold" style={{ width: '200px' }}>{language === 'fr' ? 'Nom' : 'Name'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Montant (CHF)' : 'Amount (CHF)'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Catégorie' : 'Category'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Propre Type' : 'Own Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '250px' }}>{language === 'fr' ? 'Propre Valeur' : 'Own Value'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '150px' }}>{language === 'fr' ? 'Type de disponibilité' : 'Availability Type'}</th>
                                                <th className="text-left p-2 font-semibold" style={{ width: '250px' }}>{language === 'fr' ? 'Valeur de dispo.' : 'Availability Value'}</th>
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
                                                            value={row.ownType || 'Date'}
                                                            onValueChange={(value) => updateAsset(row.id, 'ownType', value)}
                                                            disabled={row.locked}
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
                                                        {row.ownType === 'Period' ? (
                                                            <Select
                                                                value={row.ownTimeframe}
                                                                onValueChange={(value) => updateAsset(row.id, 'ownTimeframe', value)}
                                                                disabled={row.locked}
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
                                                                value={row.ownDate || ''}
                                                                onChange={(e) => updateAsset(row.id, 'ownDate', e.target.value)}
                                                                disabled={row.locked}
                                                                className="min-w-[140px]"
                                                            />
                                                        )}
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
                                                <th className="text-left p-2 font-semibold" style={{ width: '250px' }}>{language === 'fr' ? 'Valeur de dispo.' : 'Availability Value'}</th>
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
