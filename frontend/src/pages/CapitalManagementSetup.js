import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { getScenarioData, saveScenarioData, getUserData } from '../utils/database';
import { investmentProducts, getAssetClassStyle } from '../data/investmentProducts';
import { getLegalRetirementDate } from '../utils/calculations';
import PageHeader from '../components/PageHeader';
import DateInputWithShortcuts from '../components/DateInputWithShortcuts';
import { Split, TrendingUp, TrendingDown, Home, Landmark, Banknote, Coins, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

const CapitalManagementSetup = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [tableRows, setTableRows] = useState([]);
    const [isClusterMode, setIsClusterMode] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [assetClassFilter, setAssetClassFilter] = useState(null); // null = show all
    const [highlightedPeriod, setHighlightedPeriod] = useState({}); // { productId: 'loss' | 'gain' | null }
    const [deathDate, setDeathDate] = useState('');
    const [legalRetirementDate, setLegalRetirementDate] = useState('');
    const [wishedRetirementDate, setWishedRetirementDate] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [user, masterKey]);

    const handleContinue = async () => {
        if (!user?.email || !masterKey) return;

        setIsSaving(true);
        try {
            const scenarioData = await getScenarioData(user.email, masterKey);

            // Transform tableRows into "Asset" like objects for the simulation
            // explicitly marking them as 'Invested' and mapping startDate to availabilityDate
            const investedBook = tableRows.map(row => ({
                id: row.id,
                name: row.name,
                amount: parseFloat(row.amount || 0), // Use the user-adjusted amount
                strategy: 'Invested',
                availabilityDate: row.startDate,
                endDate: row.endDate,
                // Ensure we keep the product selection ID if needed (though it's in investmentSelections)
                selectedProduct: row.selectedProduct
            }));

            scenarioData.investedBook = investedBook;

            await saveScenarioData(user.email, masterKey, scenarioData);
            navigate('/result');
        } catch (error) {
            console.error('Error saving invested book:', error);
            alert('Failed to save changes. Please try again.');
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm(language === 'fr'
            ? 'Voulez-vous vraiment réinitialiser ? Toutes les personnalisations de cet écran seront perdues.'
            : 'Are you sure you want to reset? All customizations on this screen will be lost.')) {
            return;
        }

        setLoading(true);
        try {
            const scenarioData = await getScenarioData(user.email, masterKey);
            // Clear current selections and the final invested book
            if (scenarioData) {
                scenarioData.investmentSelections = {};
                scenarioData.investedBook = [];
                await saveScenarioData(user.email, masterKey, scenarioData);
            }
            // Reload defaults
            await loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        if (!user?.email || !masterKey) {
            navigate('/');
            return;
        }

        try {
            const scenarioData = await getScenarioData(user.email, masterKey);
            const userData = await getUserData(user.email, masterKey);

            if (userData) {
                setDeathDate(userData.theoreticalDeathDate || '');
                const legalDate = getLegalRetirementDate(userData.birthDate, userData.gender);
                setLegalRetirementDate(legalDate.toISOString().split('T')[0]);
            }

            if (scenarioData) {
                setWishedRetirementDate(scenarioData.wishedRetirementDate || (userData ? getLegalRetirementDate(userData.birthDate, userData.gender).toISOString().split('T')[0] : ''));

                // Get only liquid assets marked as 'Invested'
                const liquidInvestedAssets = (scenarioData.currentAssets || []).filter(
                    asset => asset.category === 'Liquid' && asset.strategy === 'Invested'
                );

                // Check if any have cluster tags
                const hasClusters = liquidInvestedAssets.some(asset => asset.clusterTag && asset.clusterTag.trim() !== '');

                setIsClusterMode(hasClusters);

                if (hasClusters) {
                    // Group by cluster
                    const clusterMap = {};
                    liquidInvestedAssets.forEach(asset => {
                        const cluster = asset.clusterTag || 'Unclustered';
                        if (!clusterMap[cluster]) {
                            clusterMap[cluster] = {
                                name: cluster,
                                totalAmount: 0,
                                assets: []
                            };
                        }
                        clusterMap[cluster].totalAmount += parseFloat(asset.adjustedAmount || asset.amount || 0);
                        clusterMap[cluster].assets.push(asset);
                    });

                    const rows = Object.values(clusterMap).map((cluster, index) => ({
                        id: `cluster-${index}`,
                        name: cluster.name,
                        amount: cluster.totalAmount,
                        // Heuristic: Use date of first component, or Today
                        startDate: cluster.assets[0]?.availabilityDate ? cluster.assets[0].availabilityDate.split('T')[0] : new Date().toISOString().split('T')[0],
                        endDate: userData?.theoreticalDeathDate || '',
                        selectedProduct: null,
                        assets: cluster.assets
                    }));

                    // Restore saved product selections
                    if (scenarioData.investmentSelections) {
                        rows.forEach(row => {
                            if (scenarioData.investmentSelections[row.id]) {
                                row.selectedProduct = scenarioData.investmentSelections[row.id];
                            }
                        });
                    }

                    setTableRows(rows);
                } else {
                    // Individual mode
                    const rows = liquidInvestedAssets.map((asset, index) => ({
                        id: asset.id || `asset-${index}`,
                        name: asset.name,
                        amount: parseFloat(asset.adjustedAmount || asset.amount || 0),
                        startDate: asset.availabilityDate ? asset.availabilityDate.split('T')[0] : new Date().toISOString().split('T')[0],
                        endDate: userData?.theoreticalDeathDate || '',
                        selectedProduct: null,
                        originalAsset: asset
                    }));

                    // Restore saved product selections
                    if (scenarioData.investmentSelections) {
                        rows.forEach(row => {
                            if (scenarioData.investmentSelections[row.id]) {
                                row.selectedProduct = scenarioData.investmentSelections[row.id];
                            }
                        });
                    }

                    setTableRows(rows);
                }
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openProductPicker = (rowIndex) => {
        setSelectedRowIndex(rowIndex);
        setSelectedProductId(tableRows[rowIndex]?.selectedProduct || null);
        setShowProductPicker(true);
    };

    const saveProductSelection = async () => {
        if (selectedRowIndex !== null) {
            const updatedRows = [...tableRows];
            updatedRows[selectedRowIndex].selectedProduct = selectedProductId;
            setTableRows(updatedRows);

            // Persist to database
            try {
                console.log('Saving product selection...', { rowIndex: selectedRowIndex, productId: selectedProductId });
                const scenarioData = await getScenarioData(user.email, masterKey);

                // Update the scenario data with investment product selections
                if (!scenarioData.investmentSelections) {
                    scenarioData.investmentSelections = {};
                }

                // Store the selection by row ID
                const rowId = updatedRows[selectedRowIndex].id;
                scenarioData.investmentSelections[rowId] = selectedProductId;

                console.log('Saving to database...', { rowId, productId: selectedProductId });
                await saveScenarioData(user.email, masterKey, scenarioData);
                console.log('Product selection saved successfully!');
            } catch (error) {
                console.error('Error saving product selection:', error);
                alert('Failed to save product selection. Please try again.');
            }
        }
        setShowProductPicker(false);
        setSelectedRowIndex(null);
        setSelectedProductId(null);
    };

    const updateRow = (index, field, value) => {
        const updatedRows = [...tableRows];
        updatedRows[index][field] = value;
        setTableRows(updatedRows);
    };

    const splitRow = (index) => {
        const row = tableRows[index];
        const newRow = {
            ...row,
            id: `${row.id}-split-${Date.now()}`,
            startDate: row.endDate,
            endDate: deathDate
        };

        const updatedRows = [...tableRows];
        updatedRows.splice(index + 1, 0, newRow);
        setTableRows(updatedRows);
    };

    const formatAmount = (amount) => {
        return `CHF ${parseFloat(amount || 0).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const getProductName = (productId) => {
        const product = investmentProducts.find(p => p.id === productId);
        return product ? product.ticker : '-';
    };

    if (loading) {
        return <div className="p-8 text-center">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>;
    }

    if (showProductPicker) {
        return (
            <div className="min-h-screen bg-background text-foreground animate-in slide-in-from-bottom-4 duration-300" data-testid="product-picker-page">
                {/* Sticky Header */}
                <div className="border-b bg-card shadow-sm sticky top-0 z-50">
                    <div className="max-w-[1600px] mx-auto p-4 relative flex items-center justify-center">
                        {/* Centered Title */}
                        <div className="text-center">
                            <h2 className="text-2xl font-bold flex items-center justify-center gap-2 mb-1 tracking-tight font-sans">
                                {language === 'fr' ? 'Sélectionner un produit d\'investissement' : 'Select Investment Product'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {language === 'fr' ? 'Choisissez le produit qui correspond à votre stratégie' : 'Choose the product matching your strategy'}
                            </p>
                        </div>

                        {/* Right Actions */}
                        <div className="absolute right-4 flex gap-3">
                            <Button variant="outline" onClick={() => setShowProductPicker(false)}>
                                {language === 'fr' ? 'Annuler' : 'Cancel'}
                            </Button>
                            <Button
                                onClick={saveProductSelection}
                                disabled={!selectedProductId}
                                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                            >
                                {language === 'fr' ? 'Sauvegarder la sélection' : 'Save Selection'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto p-6 pb-20">
                    {/* Asset Class Filter Buttons */}
                    <div className="flex gap-3 mb-8 flex-wrap justify-center sticky top-[80px] z-40 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full border shadow-sm w-fit mx-auto px-6">
                        <button
                            onClick={() => setAssetClassFilter(null)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === null
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'hover:bg-muted'
                                }`}
                        >
                            {language === 'fr' ? 'Tous' : 'All'}
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Equities')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === 'Equities'
                                ? 'bg-red-500 text-white shadow-md'
                                : 'text-red-500 hover:bg-red-50'
                                }`}
                        >
                            <TrendingUp className="h-4 w-4" />
                            {language === 'fr' ? 'Actions' : 'Equities'}
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Bonds')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === 'Bonds'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-orange-500 hover:bg-orange-50'
                                }`}
                        >
                            <Landmark className="h-4 w-4" />
                            {language === 'fr' ? 'Obligations' : 'Bonds'}
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Real Estate')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === 'Real Estate'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-blue-500 hover:bg-blue-50'
                                }`}
                        >
                            <Home className="h-4 w-4" />
                            {language === 'fr' ? 'Immobilier' : 'Real Estate'}
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Commodities')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === 'Commodities'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'text-yellow-500 hover:bg-yellow-50'
                                }`}
                        >
                            <Coins className="h-4 w-4" />
                            {language === 'fr' ? 'Matières premières' : 'Commodities'}
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Money Market')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${assetClassFilter === 'Money Market'
                                ? 'bg-green-500 text-white shadow-md'
                                : 'text-green-500 hover:bg-green-50'
                                }`}
                        >
                            <Banknote className="h-4 w-4" />
                            {language === 'fr' ? 'Monétaire' : 'Money Market'}
                        </button>
                    </div>

                    <RadioGroup value={selectedProductId} onValueChange={setSelectedProductId}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {investmentProducts
                                .filter(product => assetClassFilter === null || product.assetClass === assetClassFilter)
                                .map((product) => {
                                    const isSelected = selectedProductId === product.id;
                                    return (
                                        <Card
                                            key={product.id}
                                            className={`relative cursor-pointer hover:border-primary transition-all duration-200 ${isSelected ? 'ring-2 ring-primary border-primary shadow-xl scale-[1.02]' : 'hover:shadow-md'
                                                }`}
                                            onClick={() => setSelectedProductId(previous => previous === product.id ? null : product.id)}
                                        >
                                            <CardContent className="p-5">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`p-2 rounded-lg ${getAssetClassStyle(product.assetClass).bgColor}`}>
                                                        {product.assetClass === 'Equities' && <TrendingUp className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />}
                                                        {product.assetClass === 'Bonds' && <Landmark className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />}
                                                        {product.assetClass === 'Real Estate' && <Home className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />}
                                                        {product.assetClass === 'Money Market' && <Banknote className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />}
                                                        {product.assetClass === 'Commodities' && <Coins className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />}
                                                    </div>
                                                    <RadioGroupItem value={product.id} id={product.id} className="mt-1" />
                                                </div>

                                                <div className="mb-4">
                                                    <h3 className="font-bold text-lg leading-tight mb-1 tracking-tight font-sans">{product.name}</h3>
                                                    <div className="text-sm text-muted-foreground font-mono">{product.ticker}</div>
                                                </div>

                                                <div className={`mb-4 w-full ${isSelected ? 'h-40' : 'h-32'}`}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={product.performanceData}>
                                                            <XAxis
                                                                dataKey="year"
                                                                axisLine={false}
                                                                tickLine={false}
                                                                tick={{ fontSize: 10, fill: '#888888' }}
                                                                minTickGap={30}
                                                            />
                                                            <YAxis hide domain={['auto', 'auto']} />
                                                            <Tooltip
                                                                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                                                itemStyle={{ padding: 0 }}
                                                            />

                                                            {/* Highlight Max Loss Period */}
                                                            {highlightedPeriod[product.id] === 'loss' && product.metrics.max3YLossPeriod && (
                                                                <ReferenceArea
                                                                    x1={parseInt(product.metrics.max3YLossPeriod.split('-')[0])}
                                                                    x2={parseInt(product.metrics.max3YLossPeriod.split('-')[1])}
                                                                    fill="red"
                                                                    fillOpacity={0.2}
                                                                />
                                                            )}

                                                            {/* Highlight Max Gain Period */}
                                                            {highlightedPeriod[product.id] === 'gain' && product.metrics.max3YGainPeriod && (
                                                                <ReferenceArea
                                                                    x1={parseInt(product.metrics.max3YGainPeriod.split('-')[0])}
                                                                    x2={parseInt(product.metrics.max3YGainPeriod.split('-')[1])}
                                                                    fill="green"
                                                                    fillOpacity={0.2}
                                                                />
                                                            )}

                                                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-sm pt-4 border-t">
                                                    <div>
                                                        <span className="text-muted-foreground block text-xs">{language === 'fr' ? 'Rendement (25a)' : 'Avg Return (25y)'}</span>
                                                        <span className="font-semibold text-green-600">+{product.metrics.avgReturn}%</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-muted-foreground block text-xs">{language === 'fr' ? 'Volatilité' : 'Volatility'}</span>
                                                        <span className="font-semibold">{product.metrics.avgVolatility}%</span>
                                                    </div>

                                                    <div
                                                        className="cursor-pointer hover:bg-red-50 p-1 -ml-1 rounded transition-colors group"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHighlightedPeriod(prev => ({ ...prev, [product.id]: prev[product.id] === 'loss' ? null : 'loss' }));
                                                        }}
                                                    >
                                                        <span className="text-muted-foreground block text-xs group-hover:text-red-600 transition-colors">{language === 'fr' ? 'Perte Max' : 'Max Loss'}</span>
                                                        <span className="font-semibold text-red-600">{product.metrics.max3YLoss}%</span>
                                                        {isSelected && product.metrics.max3YLossPeriod && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">({product.metrics.max3YLossPeriod})</span>
                                                        )}
                                                    </div>

                                                    <div
                                                        className="text-right cursor-pointer hover:bg-green-50 p-1 -mr-1 rounded transition-colors group"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHighlightedPeriod(prev => ({ ...prev, [product.id]: prev[product.id] === 'gain' ? null : 'gain' }));
                                                        }}
                                                    >
                                                        <span className="text-muted-foreground block text-xs group-hover:text-green-600 transition-colors">{language === 'fr' ? 'Gain Max' : 'Max Gain'}</span>
                                                        <span className="font-semibold text-green-600">+{product.metrics.max3YGain}%</span>
                                                        {isSelected && product.metrics.max3YGainPeriod && (
                                                            <span className="text-[10px] text-muted-foreground ml-1">({product.metrics.max3YGainPeriod})</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                        </div>
                    </RadioGroup>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-grow py-6" data-testid="capital-management-page">
            <PageHeader
                title={language === 'fr' ? 'Gestion du capital' : 'Capital management setup'}
                subtitle={language === 'fr'
                    ? 'Définissez la stratégie d\'investissement pour vos actifs liquides'
                    : 'Define investment strategy for your liquid assets'}
            />

            <div className="max-w-[1400px] mx-auto px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {isClusterMode
                                ? (language === 'fr' ? 'Investissements par cluster' : 'Investments by Cluster')
                                : (language === 'fr' ? 'Investissements individuels' : 'Individual Investments')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tableRows.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                {language === 'fr'
                                    ? 'Aucun actif liquide marqué comme "Investi" dans la revue des données.'
                                    : 'No liquid assets marked as "Invested" found in data review.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Nom' : 'Name'}</th>
                                            <th className="text-right p-3 font-semibold">{language === 'fr' ? 'Montant ajusté' : 'Adjusted Amount'}</th>
                                            <th className="text-left p-3 font-semibold min-w-[240px]">{language === 'fr' ? 'Date de début' : 'Start Date'}</th>
                                            <th className="text-left p-3 font-semibold min-w-[240px]">{language === 'fr' ? 'Date de fin' : 'End Date'}</th>
                                            <th className="text-center p-3 font-semibold">{language === 'fr' ? 'Produit' : 'Product'}</th>
                                            <th className="text-center p-3 font-semibold">{language === 'fr' ? 'Produit sélectionné' : 'Selected Product'}</th>
                                            <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, index) => (
                                            <tr key={row.id} className="border-b hover:bg-muted/30">
                                                <td className="p-3 font-medium">{row.name}</td>
                                                <td className="p-3 text-right">
                                                    <Input
                                                        type="number"
                                                        value={row.amount}
                                                        onChange={(e) => updateRow(index, 'amount', e.target.value)}
                                                        className="max-w-[150px] ml-auto text-right"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <DateInputWithShortcuts
                                                        value={row.startDate}
                                                        onChange={(e) => updateRow(index, 'startDate', e.target.value)}
                                                        className="min-w-[200px]"
                                                        retirementDate={wishedRetirementDate}
                                                        legalDate={legalRetirementDate}
                                                        mode="start"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <DateInputWithShortcuts
                                                        value={row.endDate}
                                                        onChange={(e) => updateRow(index, 'endDate', e.target.value)}
                                                        className="min-w-[200px]"
                                                        retirementDate={wishedRetirementDate}
                                                        legalDate={legalRetirementDate}
                                                        deathDate={deathDate}
                                                        mode="end"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Button
                                                        onClick={() => openProductPicker(index)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                    >
                                                        <TrendingUp className="h-4 w-4" />
                                                        {language === 'fr' ? 'Ajouter/Modifier' : 'Add/Edit Invest'}
                                                    </Button>
                                                </td>
                                                <td className="p-3 text-center font-medium">
                                                    {getProductName(row.selectedProduct)}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-center">
                                                        <Button
                                                            onClick={() => splitRow(index)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            title={language === 'fr' ? 'Diviser' : 'Split'}
                                                        >
                                                            <Split className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="mr-auto text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {language === 'fr' ? 'Réinitialiser' : 'Reset defaults'}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => navigate('/data-review')}
                            >
                                {language === 'fr' ? 'Retour' : 'Back'}
                            </Button>
                            <Button
                                onClick={handleContinue}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={isSaving}
                            >
                                {isSaving ? (language === 'fr' ? 'Sauvegarde...' : 'Saving...') : (language === 'fr' ? 'Continuer vers le verdict' : 'Continue to Verdict')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CapitalManagementSetup;
