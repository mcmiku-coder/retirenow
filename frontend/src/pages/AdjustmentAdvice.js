import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getCostData, getUserData, saveScenarioData, getScenarioData } from '../utils/database';

// Cost name translation keys
const COST_KEYS = {
    'Rent/Mortgage': 'rentMortgage',
    'Taxes': 'taxes',
    'Health insurance': 'healthInsurance',
    'Food': 'food',
    'Clothing': 'clothing',
    'Private transportation': 'privateTransport',
    'Public transportation': 'publicTransport',
    'TV/Internet/Phone': 'tvInternetPhone',
    'Restaurants': 'restaurants',
    'Vacation': 'vacation'
};

const AdjustmentAdvice = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [adjustRows, setAdjustRows] = useState([]);
    const [birthDate, setBirthDate] = useState('');
    const [deathDate, setDeathDate] = useState('');
    const [costs, setCosts] = useState([]);

    // Get translated cost name
    const getCostName = (englishName) => {
        const key = COST_KEYS[englishName];
        if (key) {
            return t(`costs.costNames.${key}`);
        }
        if (englishName && typeof englishName === 'string' && englishName.startsWith('costs.costNames.')) {
            return t(englishName);
        }
        return englishName;
    };

    // Frequency translation helper
    const getTranslatedFrequency = (frequency) => {
        switch (frequency) {
            case 'Monthly':
                return t('scenario.frequencyMonthly');
            case 'Yearly':
                return t('scenario.frequencyYearly');
            case 'One-time':
                return t('scenario.frequencyOneTime');
            default:
                return frequency;
        }
    };

    useEffect(() => {
        if (!user || !masterKey) {
            navigate('/');
            return;
        }

        const loadData = async () => {
            try {
                const userData = await getUserData(user.email, masterKey);
                const costData = await getCostData(user.email, masterKey) || [];
                const scenarioData = await getScenarioData(user.email, masterKey);

                if (userData) {
                    setBirthDate(userData.birthDate);

                    // Calculate death date (same logic as DataReview)
                    let deathDateStr;
                    if (userData.theoreticalDeathDate) {
                        deathDateStr = userData.theoreticalDeathDate;
                    } else {
                        const birthDateObj = new Date(userData.birthDate);
                        const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
                        const deathDateObj = new Date(birthDateObj);
                        deathDateObj.setFullYear(deathDateObj.getFullYear() + approximateLifeExpectancy);
                        deathDateStr = deathDateObj.toISOString().split('T')[0];
                    }
                    setDeathDate(deathDateStr);
                }

                // Load costs (original + adjusted from scenario)
                const originalCosts = costData.filter(c => c.amount).map(c => ({
                    ...c,
                    adjustedAmount: c.amount
                }));

                let currentCosts = originalCosts;
                if (scenarioData && scenarioData.adjustedCosts && scenarioData.adjustedCosts.length > 0) {
                    currentCosts = scenarioData.adjustedCosts;
                }
                setCosts(currentCosts);

                // Initialize Adjustment Rows - ALWAYS show these 3 categories
                const targetCostKeys = ['Vacation', 'Private transportation', 'Taxes'];

                const newRows = targetCostKeys.map(englishKey => {
                    const translationKey = COST_KEYS[englishKey];
                    const translatedName = t(`costs.costNames.${translationKey}`);

                    // Find cost by its original English name or its translated name
                    const cost = currentCosts.find(c =>
                        !c.isSplit &&
                        (c.name === englishKey ||
                            c.name === translatedName ||
                            (c.name && c.name.startsWith('costs.costNames.') && t(c.name) === translatedName))
                    );

                    const currentAmount = cost ? parseFloat(cost.amount || 0) : 0;
                    const adjustedAmount = cost ? parseFloat(cost.adjustedAmount || cost.amount || 0) : 0;

                    return {
                        id: cost ? cost.id : `new-${englishKey.toLowerCase().replace(/\s+/g, '-')}`,
                        name: cost ? getCostName(cost.name) : translatedName,
                        originalName: englishKey,
                        originalAmount: currentAmount,
                        frequency: cost ? cost.frequency : 'Yearly',
                        adjustedAmount: adjustedAmount,
                        changeAtAge: cost ? parseFloat(cost.changeAtAge || 75) : 80,
                        checked: false,
                        isNew: !cost
                    };
                });

                setAdjustRows(newRows);

            } catch (error) {
                console.error('Failed to load data:', error);
                toast.error(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, masterKey, navigate, t]);

    const handleAdjustRowChange = (id, field, value) => {
        setAdjustRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const applyTableAdjustments = async () => {
        let updatedCosts = [...costs];
        const bDateObj = new Date(birthDate);

        adjustRows.forEach(row => {
            const originalIndex = updatedCosts.findIndex(c => c.id === row.id);
            const isNew = row.isNew || originalIndex === -1;

            let targetCost;
            if (isNew) {
                // For "New" rows (like missing Taxes), find translation key
                const translationKey = COST_KEYS[row.originalName];
                const translatedName = t(`costs.costNames.${translationKey}`);

                targetCost = {
                    id: `cost-${Date.now()}-${row.originalName.toLowerCase()}`,
                    name: translatedName,
                    amount: 0,
                    adjustedAmount: row.adjustedAmount,
                    frequency: row.frequency || 'Yearly',
                    category: row.originalName === 'Taxes' ? 'Taxes' : 'Other',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: deathDate,
                    isManual: true
                };

                // Add to the list
                updatedCosts.push(targetCost);
                // Refresh index for subsequent logic
                const lastIdx = updatedCosts.length - 1;

                if (row.checked) {
                    // If checked for split, target the newly added item
                    applySplit(updatedCosts, lastIdx, row);
                }
            } else {
                const originalCost = updatedCosts[originalIndex];
                if (row.checked) {
                    applySplit(updatedCosts, originalIndex, row);
                } else {
                    updatedCosts[originalIndex] = {
                        ...originalCost,
                        adjustedAmount: row.adjustedAmount
                    };
                }
            }
        });

        // Helper for splitting (extracted to keep loop clean)
        function applySplit(costsArr, idx, r) {
            const originalCost = costsArr[idx];
            const splitAge = r.changeAtAge;
            const bDateObj = new Date(birthDate);
            const splitYear = bDateObj.getFullYear() + splitAge;
            const splitDateObj = new Date(splitYear, bDateObj.getMonth(), bDateObj.getDate());

            const day = String(splitDateObj.getDate()).padStart(2, '0');
            const month = String(splitDateObj.getMonth() + 1).padStart(2, '0');
            const year = splitDateObj.getFullYear();
            const splitDateStr = `${year}-${month}-${day}`;

            const groupId = originalCost.groupId || originalCost.id;

            costsArr[idx] = { ...originalCost, endDate: splitDateStr, groupId };
            costsArr.splice(idx + 1, 0, {
                ...originalCost,
                id: `${originalCost.id}-split-${Date.now()}`,
                parentId: originalCost.id,
                groupId: groupId,
                startDate: splitDateStr,
                adjustedAmount: r.adjustedAmount,
                isSplit: true
            });
        }

        // Save back to scenario data
        try {
            const existingData = await getScenarioData(user.email, masterKey) || {};
            await saveScenarioData(user.email, masterKey, {
                ...existingData,
                adjustedCosts: updatedCosts
            });
            toast.success(language === 'fr' ? 'Ajustements appliqués' : 'Adjustments applied');
            navigate('/data-review');
        } catch (error) {
            console.error('Failed to save adjustments:', error);
            toast.error(t('common.error'));
        }
    };

    const getAdviceText = (originalName) => {
        if (originalName === 'Vacation') {
            return language === 'fr'
                ? 'Vos dépenses de vacances diminuent dans les dernières années de votre vie, fixez un nouveau montant à partir d\'un âge choisi'
                : 'Your vacation expenses decrease in the later years of your life, set a new amount starting from a chosen age';
        }
        if (originalName === 'Private transportation') {
            return language === 'fr'
                ? 'Vos dépenses de transport privé diminuent généralement avec l\'âge, ajustez le montant à partir d\'un certain âge'
                : 'Your private transportation expenses usually decrease with age, set a new amount starting from a chosen age';
        }
        if (originalName === 'Taxes') {
            return language === 'fr'
                ? 'Vos impôts diminuent souvent après la retraite en raison de la baisse des revenus, ajustez le montant à partir de l\'âge de la retraite'
                : 'Your taxes often decrease after retirement due to lower income, set a new amount starting from retirement age';
        }
        return '';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 pt-8 flex flex-col">
            <div className="w-full mb-2">
                <PageHeader
                    title={language === 'fr' ? 'Conseils d\'ajustement' : 'Adjustment Advice'}
                    subtitle={language === 'fr' ? 'Ajustez vos dépenses futures en fonction de l\'évolution de votre mode de vie' : 'Adjust your future expenses based on lifestyle changes'}
                    leftContent={
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/data-review')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-lg font-medium"
                        >
                            <ChevronLeft className="h-5 w-5" />
                            {t('nav.back')}
                        </Button>
                    }
                />
            </div>

            <div className="max-w-[95%] xl:max-w-7xl mx-auto px-4 w-full">
                {/* Header Row */}
                <div className="grid grid-cols-[40px,1.5fr,1fr,1fr,1fr,1.5fr,1fr] gap-4 mb-4 text-base font-medium text-white px-2 hidden md:grid">
                    <div></div>
                    <div>{language === 'fr' ? 'Nom' : 'Name'}</div>
                    <div>{language === 'fr' ? 'Montant actuel' : 'Current Amount'}</div>
                    <div>{language === 'fr' ? 'Fréquence' : 'Frequency'}</div>
                    <div>{language === 'fr' ? 'Montant ajusté' : 'Adjusted Amount'}</div>
                    <div>{/* Slider */}</div>
                    <div className="text-right">{language === 'fr' ? 'Changement à' : 'Change at'}</div>
                </div>

                <div className="space-y-6">
                    {adjustRows.length === 0 && (
                        <div className="text-center text-muted-foreground py-12 bg-card rounded-lg border border-border">
                            {language === 'fr' ? 'Aucun coût pertinent trouvé à ajuster.' : 'No relevant costs found to adjust.'}
                        </div>
                    )}

                    {adjustRows.map(row => {
                        const birthYear = new Date(birthDate).getFullYear();
                        const deathYear = new Date(deathDate).getFullYear();
                        const currentYear = new Date().getFullYear();
                        const currentAge = currentYear - birthYear;
                        const deathAge = deathYear - birthYear;
                        const maxAge = deathAge - 1;
                        const startAge = currentAge + 1;
                        const ageOptions = [];
                        // Populate age dropdown (from next year until death)
                        if (startAge < maxAge) {
                            for (let y = startAge; y <= maxAge; y++) {
                                ageOptions.push(y);
                            }
                        } else {
                            ageOptions.push(startAge);
                        }

                        return (
                            <Card key={row.id} className="border-border bg-card">
                                <CardContent className="p-6">
                                    <p className="text-green-500 mb-4 text-sm font-medium">
                                        {getAdviceText(row.originalName)}
                                    </p>

                                    {/* Desktop Layout */}
                                    <div className="hidden md:grid grid-cols-[40px,1.5fr,1fr,1fr,1fr,1.5fr,1fr] gap-4 items-center">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={row.checked}
                                                onCheckedChange={(checked) => handleAdjustRowChange(row.id, 'checked', checked)}
                                            />
                                        </div>
                                        <div className="font-medium text-foreground truncate" title={row.name}>{row.name}</div>
                                        <div className="text-muted-foreground">CHF {parseFloat(row.originalAmount).toLocaleString()}</div>
                                        <div className="text-muted-foreground">{getTranslatedFrequency(row.frequency)}</div>
                                        <div>
                                            <Input
                                                type="text"
                                                value={row.adjustedAmount ? row.adjustedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/'/g, '');
                                                    if (!isNaN(rawValue)) {
                                                        handleAdjustRowChange(row.id, 'adjustedAmount', rawValue);
                                                    }
                                                }}
                                                className="h-9 text-right"
                                                style={{
                                                    backgroundColor: parseFloat(row.adjustedAmount) < parseFloat(row.originalAmount) ? 'rgba(34, 197, 94, 0.25)' : parseFloat(row.adjustedAmount) > parseFloat(row.originalAmount) ? 'rgba(239, 68, 68, 0.25)' : 'transparent'
                                                }}
                                            />
                                        </div>
                                        <div className="px-2">
                                            <Slider
                                                value={[parseFloat(row.adjustedAmount) || 0]}
                                                min={0}
                                                max={(parseFloat(row.originalAmount) || 1000) * 1.5}
                                                step={100}
                                                onValueChange={(val) => handleAdjustRowChange(row.id, 'adjustedAmount', val[0])}
                                                className="py-2"
                                            />
                                        </div>
                                        <div>
                                            <Select
                                                value={row.changeAtAge?.toString()}
                                                onValueChange={(val) => handleAdjustRowChange(row.id, 'changeAtAge', parseInt(val))}
                                                disabled={!row.checked}
                                            >
                                                <SelectTrigger className={`h-8 bg-background border-input text-foreground ${!row.checked ? 'opacity-50' : ''}`}>
                                                    <SelectValue placeholder={language === 'fr' ? 'Age' : 'Age'} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                                                    {ageOptions.map(age => (
                                                        <SelectItem key={age} value={age.toString()}>
                                                            {age} {language === 'fr' ? 'ans' : 'years'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Mobile Layout */}
                                    <div className="md:hidden space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Checkbox
                                                checked={row.checked}
                                                onCheckedChange={(checked) => handleAdjustRowChange(row.id, 'checked', checked)}
                                            />
                                            <span className="font-medium text-lg">{row.name}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block mb-1">{language === 'fr' ? 'Montant actuel' : 'Current Amount'}</span>
                                                <span>CHF {parseFloat(row.originalAmount).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block mb-1">{language === 'fr' ? 'Fréquence' : 'Frequency'}</span>
                                                <span>{getTranslatedFrequency(row.frequency)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-sm text-muted-foreground">{language === 'fr' ? 'Montant ajusté' : 'Adjusted Amount'}</span>
                                            <div className="flex gap-4">
                                                <Input
                                                    type="text"
                                                    value={row.adjustedAmount ? row.adjustedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") : ''}
                                                    onChange={(e) => {
                                                        const rawValue = e.target.value.replace(/'/g, '');
                                                        if (!isNaN(rawValue)) {
                                                            handleAdjustRowChange(row.id, 'adjustedAmount', rawValue);
                                                        }
                                                    }}
                                                    className="flex-1"
                                                />
                                            </div>
                                            <Slider
                                                value={[parseFloat(row.adjustedAmount) || 0]}
                                                min={0}
                                                max={(parseFloat(row.originalAmount) || 1000) * 1.5}
                                                step={100}
                                                onValueChange={(val) => handleAdjustRowChange(row.id, 'adjustedAmount', val[0])}
                                                className="py-4"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-sm text-muted-foreground">{language === 'fr' ? 'Changement à l\'âge de' : 'Change at age'}</span>
                                            <Select
                                                value={row.changeAtAge?.toString()}
                                                onValueChange={(val) => handleAdjustRowChange(row.id, 'changeAtAge', parseInt(val))}
                                                disabled={!row.checked}
                                            >
                                                <SelectTrigger className={`w-full bg-background border-input text-foreground ${!row.checked ? 'opacity-50' : ''}`}>
                                                    <SelectValue placeholder={language === 'fr' ? 'Age' : 'Age'} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border text-popover-foreground max-h-60">
                                                    {ageOptions.map(age => (
                                                        <SelectItem key={age} value={age.toString()}>
                                                            {age} {language === 'fr' ? 'ans' : 'years'}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="flex justify-center gap-4 mt-8 pb-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/data-review')}
                        className="px-8"
                    >
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={applyTableAdjustments}
                        className="px-12 bg-[#EF5343] hover:bg-[#d94334] text-white"
                    >
                        {language === 'fr' ? 'Appliquer les ajustements' : 'Apply Adjustments'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdjustmentAdvice;
