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
import PageHeader from '../components/PageHeader';
import { Split, TrendingUp, TrendingDown, Home, Landmark, Banknote, Coins } from 'lucide-react';
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

    useEffect(() => {
        loadData();
    }, [user, masterKey]);

    const loadData = async () => {
        if (!user?.email || !masterKey) {
            navigate('/');
            return;
        }

        try {
            const scenarioData = await getScenarioData(user.email, masterKey);
            const userData = await getUserData(user.email, masterKey);

            setDeathDate(userData?.theoreticalDeathDate || '');

            if (scenarioData) {
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
                        startDate: new Date().toISOString().split('T')[0],
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
                        startDate: new Date().toISOString().split('T')[0],
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

    return (
        <div className="min-h-screen py-6" data-testid="capital-management-page">
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
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Date de début' : 'Start Date'}</th>
                                            <th className="text-left p-3 font-semibold">{language === 'fr' ? 'Date de fin' : 'End Date'}</th>
                                            <th className="text-center p-3 font-semibold">{language === 'fr' ? 'Produit' : 'Product'}</th>
                                            <th className="text-center p-3 font-semibold">{language === 'fr' ? 'Produit sélectionné' : 'Selected Product'}</th>
                                            <th className="text-center p-3 font-semibold w-[80px]">{language === 'fr' ? 'Actions' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, index) => (
                                            <tr key={row.id} className="border-b hover:bg-muted/30">
                                                <td className="p-3 font-medium">{row.name}</td>
                                                <td className="text-right p-3 text-muted-foreground">{formatAmount(row.amount)}</td>
                                                <td className="p-3">
                                                    <Input
                                                        type="date"
                                                        value={row.startDate}
                                                        onChange={(e) => updateRow(index, 'startDate', e.target.value)}
                                                        className="max-w-[150px]"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <Input
                                                        type="date"
                                                        value={row.endDate}
                                                        onChange={(e) => updateRow(index, 'endDate', e.target.value)}
                                                        className="max-w-[150px]"
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
                                onClick={() => navigate('/data-review')}
                            >
                                {language === 'fr' ? 'Retour' : 'Back'}
                            </Button>
                            <Button
                                onClick={() => navigate('/result')}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {language === 'fr' ? 'Continuer vers le verdict' : 'Continue to Verdict'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Investment Product Picker Modal */}
            <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {language === 'fr' ? 'Sélectionner un produit d\'investissement' : 'Select Investment Product'}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Asset Class Filter Buttons */}
                    <div className="flex gap-3 mt-4 mb-2 flex-wrap justify-center">
                        <button
                            onClick={() => setAssetClassFilter(null)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === null
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <span className="font-medium text-sm">{language === 'fr' ? 'Tous' : 'All'}</span>
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Equities')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === 'Equities'
                                ? 'bg-red-500/20 border-2 border-red-500'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <TrendingUp className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-sm text-red-500">{language === 'fr' ? 'Actions' : 'Equities'}</span>
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Bonds')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === 'Bonds'
                                ? 'bg-orange-500/20 border-2 border-orange-500'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <Landmark className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-sm text-orange-500">{language === 'fr' ? 'Obligations' : 'Bonds'}</span>
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Real Estate')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === 'Real Estate'
                                ? 'bg-blue-500/20 border-2 border-blue-500'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <Home className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-sm text-blue-500">{language === 'fr' ? 'Immobilier' : 'Real Estate'}</span>
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Commodities')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === 'Commodities'
                                ? 'bg-yellow-500/20 border-2 border-yellow-500'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-sm text-yellow-500">{language === 'fr' ? 'Matières premières' : 'Commodities'}</span>
                        </button>

                        <button
                            onClick={() => setAssetClassFilter('Money Market')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${assetClassFilter === 'Money Market'
                                ? 'bg-green-500/20 border-2 border-green-500'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <Banknote className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-sm text-green-500">{language === 'fr' ? 'Monétaire' : 'Money Market'}</span>
                        </button>
                    </div>

                    <RadioGroup value={selectedProductId} onValueChange={setSelectedProductId}>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            {investmentProducts
                                .filter(product => assetClassFilter === null || product.assetClass === assetClassFilter)
                                .map((product, index) => {
                                    const isSelected = selectedProductId === product.id;
                                    // Determine transform origin based on position in grid
                                    const row = Math.floor(index / 3);
                                    const col = index % 3;
                                    let transformOrigin = 'center';
                                    if (row === 0 && col === 0) transformOrigin = 'top left';
                                    else if (row === 0 && col === 2) transformOrigin = 'top right';
                                    else if (row === 0) transformOrigin = 'top center';
                                    else if (col === 0) transformOrigin = 'center left';
                                    else if (col === 2) transformOrigin = 'center right';

                                    return (
                                        <Card
                                            key={product.id}
                                            className={`relative cursor-pointer hover:border-primary transition-all duration-300 ${isSelected ? 'scale-125 z-10 border-primary shadow-2xl' : 'scale-100'
                                                }`}
                                            style={{
                                                transformOrigin: transformOrigin,
                                            }}
                                        >
                                            <CardContent className="p-4">
                                                {/* Header with Icon and Radio Button - CLICKABLE ZONE */}
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        // Toggle: if already selected, deselect (set to null), otherwise select this product
                                                        setSelectedProductId(selectedProductId === product.id ? null : product.id);
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        {/* Asset Class Icon */}
                                                        <div className={`p-2 rounded-lg ${getAssetClassStyle(product.assetClass).bgColor}`}>
                                                            {product.assetClass === 'Equities' && (
                                                                <TrendingUp className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />
                                                            )}
                                                            {product.assetClass === 'Bonds' && (
                                                                <Landmark className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />
                                                            )}
                                                            {product.assetClass === 'Real Estate' && (
                                                                <Home className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />
                                                            )}
                                                            {product.assetClass === 'Money Market' && (
                                                                <Banknote className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />
                                                            )}
                                                            {product.assetClass === 'Commodities' && (
                                                                <Coins className={`h-5 w-5 ${getAssetClassStyle(product.assetClass).color}`} />
                                                            )}
                                                        </div>

                                                        {/* Radio Button */}
                                                        <RadioGroupItem value={product.id} id={product.id} />
                                                    </div>

                                                    {/* Product Name */}
                                                    <div className="block mb-3">
                                                        <div className="font-semibold text-sm">{product.name}</div>
                                                        <div className="text-xs text-muted-foreground">{product.ticker}</div>
                                                    </div>
                                                </div>

                                                {/* Performance Chart */}
                                                <div className={`mb-3 ${isSelected ? 'h-36' : 'h-32'}`}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={product.performanceData}>
                                                            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                                                            <YAxis tick={{ fontSize: 10 }} />
                                                            <Tooltip />

                                                            {/* Highlight Max Loss Period */}
                                                            {highlightedPeriod[product.id] === 'loss' && product.metrics.max3YLossPeriod && (
                                                                <ReferenceArea
                                                                    x1={parseInt(product.metrics.max3YLossPeriod.split('-')[0])}
                                                                    x2={parseInt(product.metrics.max3YLossPeriod.split('-')[1])}
                                                                    fill="red"
                                                                    fillOpacity={0.3}
                                                                    stroke="red"
                                                                    strokeWidth={2}
                                                                />
                                                            )}

                                                            {/* Highlight Max Gain Period */}
                                                            {highlightedPeriod[product.id] === 'gain' && product.metrics.max3YGainPeriod && (
                                                                <ReferenceArea
                                                                    x1={parseInt(product.metrics.max3YGainPeriod.split('-')[0])}
                                                                    x2={parseInt(product.metrics.max3YGainPeriod.split('-')[1])}
                                                                    fill="green"
                                                                    fillOpacity={0.3}
                                                                    stroke="green"
                                                                    strokeWidth={2}
                                                                />
                                                            )}

                                                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Metrics */}
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">{language === 'fr' ? 'Rendement moyen (25a)' : 'Avg Return (25y)'}</span>
                                                        <span className="font-semibold text-green-600">+{product.metrics.avgReturn}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">{language === 'fr' ? 'Volatilité moyenne' : 'Avg Volatility'}</span>
                                                        <span className="font-semibold">{product.metrics.avgVolatility}%</span>
                                                    </div>
                                                    <div
                                                        className="flex justify-between cursor-pointer hover:bg-red-500/10 p-1 rounded transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHighlightedPeriod(prev => ({
                                                                ...prev,
                                                                [product.id]: prev[product.id] === 'loss' ? null : 'loss'
                                                            }));
                                                        }}
                                                    >
                                                        <span className="text-muted-foreground">{language === 'fr' ? 'Perte max (3a)' : 'Max Loss (3y)'}</span>
                                                        <div className="text-right">
                                                            <span className="font-semibold text-red-600">{product.metrics.max3YLoss}%</span>
                                                            {isSelected && product.metrics.max3YLossPeriod && (
                                                                <div className="text-[10px] text-muted-foreground">({product.metrics.max3YLossPeriod})</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="flex justify-between cursor-pointer hover:bg-green-500/10 p-1 rounded transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHighlightedPeriod(prev => ({
                                                                ...prev,
                                                                [product.id]: prev[product.id] === 'gain' ? null : 'gain'
                                                            }));
                                                        }}
                                                    >
                                                        <span className="text-muted-foreground">{language === 'fr' ? 'Gain max (3a)' : 'Max Gain (3y)'}</span>
                                                        <div className="text-right">
                                                            <span className="font-semibold text-green-600">+{product.metrics.max3YGain}%</span>
                                                            {isSelected && product.metrics.max3YGainPeriod && (
                                                                <div className="text-[10px] text-muted-foreground">({product.metrics.max3YGainPeriod})</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                        </div>
                    </RadioGroup>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setShowProductPicker(false)}>
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </Button>
                        <Button
                            onClick={saveProductSelection}
                            disabled={!selectedProductId}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {language === 'fr' ? 'Sauvegarder' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CapitalManagementSetup;
