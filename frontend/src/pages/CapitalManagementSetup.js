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
import { Split, TrendingUp, TrendingDown, Home, Landmark, Banknote, Coins, RefreshCw, ChevronLeft, ChevronRight, Scissors, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';


const CapitalManagementSetup = () => {
    const navigate = useNavigate();
    const { user, masterKey } = useAuth();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [tableRows, setTableRows] = useState([]);

    const [assetClassFilter, setAssetClassFilter] = useState(null); // null = show all
    const [highlightedPeriod, setHighlightedPeriod] = useState({}); // { productId: 'loss' | 'gain' | null }
    const [deathDate, setDeathDate] = useState('');
    const [legalRetirementDate, setLegalRetirementDate] = useState('');
    const [wishedRetirementDate, setWishedRetirementDate] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const scrollContainerRef = React.useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
        }
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

    // Palette for divided row badges
    const divideColors = [
        'bg-blue-100 text-blue-800 border-blue-200',
        'bg-green-100 text-green-800 border-green-200',
        'bg-purple-100 text-purple-800 border-purple-200',
        'bg-orange-100 text-orange-800 border-orange-200',
        'bg-pink-100 text-pink-800 border-pink-200',
        'bg-indigo-100 text-indigo-800 border-indigo-200',
        'bg-teal-100 text-teal-800 border-teal-200',
    ];

    const divideRow = (index) => {
        const row = tableRows[index];
        const currentAmount = parseFloat(row.amount);
        const halfAmount = Math.floor(currentAmount / 2);
        const remainingAmount = currentAmount - halfAmount; // Handle odd numbers

        const divideGroupId = `div-${Date.now()}`;
        // Pick a random color from palette
        const divideColor = divideColors[Math.floor(Math.random() * divideColors.length)];

        // Update current row (Become 'Divided A')
        const updatedRow = {
            ...row,
            amount: remainingAmount,
            divideGroupId,
            originalDivisionTotal: currentAmount,
            divideRole: 'A',
            divideColor
        };

        // Create new divided row (Become 'Divided B')
        const newRow = {
            ...row,
            id: `${row.id}-divide-${Date.now()}`,
            name: row.name, // Keep original name, badge will distinguish
            amount: halfAmount,
            // Keep same dates (Concurrent)
            startDate: row.startDate,
            endDate: row.endDate,
            divideGroupId,
            originalDivisionTotal: currentAmount,
            divideRole: 'B',
            divideColor
        };

        const updatedRows = [...tableRows];
        updatedRows[index] = updatedRow; // Update original
        updatedRows.splice(index + 1, 0, newRow); // Insert split
        setTableRows(updatedRows);
    };

    const removeDivide = (index) => {
        const rowToDelete = tableRows[index];
        if (!rowToDelete.divideGroupId || rowToDelete.divideRole !== 'B') return;

        const updatedRows = [...tableRows];

        // Find partner (Divided A)
        const partnerIndex = updatedRows.findIndex(r => r.divideGroupId === rowToDelete.divideGroupId && r.id !== rowToDelete.id);

        if (partnerIndex !== -1) {
            const partnerRow = updatedRows[partnerIndex];
            // Restore total amount and remove division properties
            updatedRows[partnerIndex] = {
                ...partnerRow,
                amount: parseFloat(partnerRow.originalDivisionTotal),
                divideGroupId: null,
                originalDivisionTotal: null,
                divideRole: null,
                divideColor: null
            };
        }

        // Remove the 'Divided B' row
        updatedRows.splice(index, 1);
        setTableRows(updatedRows);
    };

    useEffect(() => {
        loadData();
    }, [user, masterKey]);

    const handleContinue = async () => {
        if (!user?.email || !masterKey) return;

        setIsSaving(true);
        try {
            const scenarioData = await getScenarioData(user.email, masterKey);

            // Create investmentSelections map for compatibility/legacy
            const investmentSelections = {};

            // Transform tableRows into "Asset" like objects for the simulation
            // explicitly marking them as 'Invested' and mapping startDate to availabilityDate
            const investedBook = tableRows.map(row => {
                // Populate investmentSelections map
                if (row.selectedProduct) {
                    investmentSelections[row.id] = row.selectedProduct;
                }

                return {
                    // Copy original asset properties (crucial for simulation engine to know asset type, currency, etc. for new rows)
                    ...row.originalAsset,

                    id: row.id,
                    // Append A/B to name to ensure uniqueness in simulation/graphs
                    name: row.divideRole ? `${row.name} (${row.divideRole === 'A' ? 'A' : 'B'})` : row.name,
                    amount: parseFloat(row.amount || 0), // Use the user-adjusted amount
                    adjustedAmount: parseFloat(row.amount || 0), // CRITICAL: Overwrite original adjustedAmount
                    strategy: 'Invested',
                    // Force Liquid Assets to be treated as Initial Capital (available at t=0)
                    isInitialCapital: true,
                    availabilityDate: row.startDate,
                    endDate: row.endDate,
                    // Ensure we keep the product selection ID if needed (though it's in investmentSelections)
                    selectedProduct: row.selectedProduct,
                    // Save grouping info
                    groupedWith: row.groupedWith,
                    investGroupName: row.investGroupName,
                    // Save linked division info
                    divideGroupId: row.divideGroupId,
                    originalDivisionTotal: row.originalDivisionTotal,
                    divideRole: row.divideRole,
                    divideColor: row.divideColor
                };
            });


            // 1. Filter out existing Liquid & Invested assets from currentAssets (we will replace them)
            const otherAssets = (scenarioData.currentAssets || []).filter(
                asset => !(asset.category === 'Liquid' && asset.strategy === 'Invested')
            );

            // 2. Create new assets from tableRows
            const newLiquidAssets = tableRows.map(row => ({
                ...row.originalAsset, // Base properties from original
                id: row.id,
                name: row.name,
                amount: parseFloat(row.amount || 0),
                adjustedAmount: parseFloat(row.amount || 0), // Important for simulation
                availabilityDate: row.startDate,
                endDate: row.endDate,
                strategy: 'Invested',
                category: 'Liquid',
                // Fix Simulation: Ensure product ID is available in proper fields
                selectedProduct: row.selectedProduct,
                productId: row.selectedProduct,

                // Persistence for divided rows
                divideGroupId: row.divideGroupId,
                originalDivisionTotal: row.originalDivisionTotal,
                divideRole: row.divideRole,
                divideColor: row.divideColor,
                groupedWith: row.groupedWith,
                investGroupName: row.investGroupName
            }));

            // 3. Update scenarioData
            // DO NOT update currentAssets with simulation-specific splits (this corrupts Data Review)

            scenarioData.investedBook = investedBook;
            scenarioData.investmentSelections = investmentSelections; // Save the map too

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

                // Individual mode
                // Create a lookup map for saved invested book items
                const savedBookMap = new Map();
                if (scenarioData.investedBook && Array.isArray(scenarioData.investedBook)) {
                    scenarioData.investedBook.forEach(item => {
                        if (item.id) savedBookMap.set(item.id, item);
                    });
                }

                const rows = liquidInvestedAssets.flatMap((asset, index) => {
                    const baseId = asset.id || `asset-${index}`; // This is the ID of the original asset

                    // Find all saved rows that belong to this asset
                    // They match if savedItem.id == baseId OR savedItem.id starts with baseId + '-'
                    const assetRows = [];

                    if (scenarioData.investedBook && Array.isArray(scenarioData.investedBook)) {
                        scenarioData.investedBook.forEach(item => {
                            if (item.id === baseId || (item.id && item.id.toString().startsWith(`${baseId}-`))) {
                                assetRows.push(item);
                            }
                        });
                    }

                    // If we found saved rows, map them back to table rows
                    if (assetRows.length > 0) {
                        return assetRows.map(savedItem => {
                            const id = savedItem.id;
                            const amount = parseFloat(savedItem.amount);
                            const startDate = savedItem.availabilityDate;
                            const endDate = savedItem.endDate;

                            const divideGroupId = savedItem.divideGroupId;
                            const originalDivisionTotal = parseFloat(savedItem.originalDivisionTotal || 0);
                            const divideRole = savedItem.divideRole;
                            const divideColor = savedItem.divideColor;

                            const groupedWith = savedItem.groupedWith || 'not grouped';
                            const investGroupName = savedItem.investGroupName || asset.name;

                            let selectedProduct = null;
                            if (savedItem.selectedProduct) {
                                selectedProduct = savedItem.selectedProduct;
                            }

                            return {
                                id,
                                name: asset.name, // Always use current asset name
                                amount,
                                startDate,
                                endDate,
                                selectedProduct,
                                originalAsset: asset,
                                groupedWith,
                                investGroupName,
                                divideGroupId,
                                originalDivisionTotal,
                                divideRole,
                                divideColor
                            };
                        });
                    }

                    // If no saved data for this asset, create default row
                    return [{
                        id: baseId,
                        name: asset.name,
                        amount: parseFloat(asset.adjustedAmount || asset.amount || 0),
                        startDate: asset.availabilityDate ? asset.availabilityDate.split('T')[0] : new Date().toISOString().split('T')[0],
                        endDate: userData?.theoreticalDeathDate || '',
                        selectedProduct: null,
                        originalAsset: asset,
                        groupedWith: 'not grouped',
                        investGroupName: asset.name,
                        divideGroupId: null,
                        originalDivisionTotal: 0,
                        divideRole: null,
                        divideColor: null
                    }];
                });

                // Restore saved product selections from legacy map (overrides if present)
                if (scenarioData.investmentSelections) {
                    rows.forEach(row => {
                        if (scenarioData.investmentSelections[row.id]) {
                            row.selectedProduct = scenarioData.investmentSelections[row.id];
                        }
                    });
                }

                setTableRows(rows);
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

    const updateProductSelection = (index, productId) => {
        const updatedRows = [...tableRows];
        updatedRows[index].selectedProduct = productId;
        setTableRows(updatedRows);
    };

    const updateRow = (index, field, value) => {
        const updatedRows = [...tableRows];
        updatedRows[index][field] = value;

        // Auto-update linked divided row amounts
        if (field === 'amount' && updatedRows[index].divideGroupId) {
            const row = updatedRows[index];
            const newAmount = parseFloat(value || 0);
            const total = parseFloat(row.originalDivisionTotal);

            // Find partner
            const partnerIndex = updatedRows.findIndex(r => r.divideGroupId === row.divideGroupId && r.id !== row.id);
            if (partnerIndex !== -1) {
                const partnerAmount = Math.max(0, total - newAmount);
                updatedRows[partnerIndex].amount = partnerAmount;
            }
        }

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
        <div className="flex-grow py-6" data-testid="capital-management-page">
            <PageHeader
                title={language === 'fr' ? 'Gestion du capital' : 'Capital management setup'}
                subtitle={language === 'fr'
                    ? 'Définissez la stratégie d\'investissement pour vos actifs liquides'
                    : 'Define investment strategy for your liquid assets'}
            />

            <div className="w-[80%] mx-auto px-4">

                {/* Investment Product Carousel - Moved to Top */}
                <div className="mb-8">
                    <div className="flex gap-3 mb-4 flex-wrap justify-center py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full border shadow-sm w-fit mx-auto px-6">
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

                    <style>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                        .scrollbar-hide {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `}</style>

                    <div className="relative group/carousel w-full min-w-0 rounded-xl overflow-hidden bg-card border shadow-sm p-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background hidden md:flex"
                            onClick={scrollLeft}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background hidden md:flex"
                            onClick={scrollRight}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>

                        <div
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto pb-4 gap-6 snap-x snap-mandatory px-4 scrollbar-hide"
                        >
                            {investmentProducts
                                .filter(product => assetClassFilter === null || product.assetClass === assetClassFilter)
                                .map((product) => {
                                    return (
                                        <div key={product.id} className="min-w-[300px] md:min-w-[340px] snap-center pt-2">
                                            <Card
                                                className={`h-full relative hover:border-primary transition-all duration-200 hover:shadow-md cursor-default`}
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
                                                    </div>

                                                    <div className="mb-4">
                                                        <h3 className="font-bold text-lg leading-tight mb-1 tracking-tight font-sans">{product.name}</h3>
                                                        <div className="text-sm text-muted-foreground font-mono">{product.ticker}</div>
                                                    </div>

                                                    <div className={`mb-4 w-full h-32`}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={product.performanceData}>
                                                                <XAxis
                                                                    dataKey="date"
                                                                    axisLine={false}
                                                                    tickLine={false}
                                                                    tick={{ fontSize: 10, fill: '#888888' }}
                                                                    minTickGap={30}
                                                                    tickFormatter={(value) => {
                                                                        return value.split('-')[0];
                                                                    }}
                                                                />
                                                                <YAxis hide domain={['auto', 'auto']} />
                                                                <Tooltip
                                                                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                                                                    itemStyle={{ padding: 0 }}
                                                                    labelFormatter={(value) => {
                                                                        return value;
                                                                    }}
                                                                />
                                                                {highlightedPeriod[product.id] === 'loss' && product.metrics.max3YLossPeriod && (() => {
                                                                    const [startYear, endYear] = product.metrics.max3YLossPeriod.split('-');
                                                                    const startData = product.performanceData.find(d => d.date.startsWith(startYear));
                                                                    const endData = [...product.performanceData].reverse().find(d => d.date.startsWith(endYear));
                                                                    if (startData && endData) {
                                                                        return <ReferenceArea x1={startData.date} x2={endData.date} fill="red" fillOpacity={0.2} />;
                                                                    }
                                                                    return null;
                                                                })()}

                                                                {highlightedPeriod[product.id] === 'gain' && product.metrics.max3YGainPeriod && (() => {
                                                                    const period = String(product.metrics.max3YGainPeriod);
                                                                    const startData = product.performanceData.find(d => d.date.startsWith(period));
                                                                    const endData = [...product.performanceData].reverse().find(d => d.date.startsWith(period));
                                                                    if (startData && endData) {
                                                                        return <ReferenceArea x1={startData.date} x2={endData.date} fill="green" fillOpacity={0.2} />;
                                                                    }
                                                                    return null;
                                                                })()}

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
                                                            {product.metrics.max3YLossPeriod && (
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
                                                            {product.metrics.max3YGainPeriod && (
                                                                <span className="text-[10px] text-muted-foreground ml-1">({product.metrics.max3YGainPeriod})</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {/* Removed isClusterMode ternary, always showing Individual Investments title or removing conditional logic if preferred */}
                            {language === 'fr' ? 'Investissements individuels' : 'Individual Investments'}
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
                                            <th className="p-3 text-left font-medium w-[20%]">{language === 'fr' ? 'Nom du Cluster' : 'Cluster Name'}</th>
                                            <th className="p-3 text-left font-medium w-[15%]">{language === 'fr' ? 'Montant' : 'Amount'}</th>
                                            <th className="p-3 text-left font-medium w-[15%]">{language === 'fr' ? 'Date de disponibilité' : 'Availability Date'}</th>
                                            <th className="p-3 text-left font-medium w-[15%]">{language === 'fr' ? 'Date de fin' : 'End Date'}</th>
                                            <th className="p-3 text-left font-medium w-[20%]">{language === 'fr' ? 'Produit' : 'Product'}</th>
                                            <th className="p-3 text-left font-medium w-[15%]">{language === 'fr' ? 'Groupé avec' : 'Grouped with'}</th>
                                            <th className="p-3 text-left font-medium w-[15%]">{language === 'fr' ? 'Nom Invest/Groupe' : 'Invest/Group name'}</th>
                                            <th className="p-3 text-left font-medium w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, index) => {
                                            // Determine available parents for "Grouped with" dropdown
                                            // Filter out:
                                            // 1. The row itself
                                            // 2. Rows that are already grouped (a row cannot be a parent if it is a child) - *Correction*: Usually simple hierarchy, let's just avoid circular
                                            // For simplicity based on prompt: "dropdown with 'not grouped' as default and options from other asset names"
                                            const availableParents = tableRows.filter((r, i) => i !== index && (!r.groupedWith || r.groupedWith === 'not grouped'));

                                            return (
                                                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="p-3 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {row.name}
                                                            {row.divideRole && (
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${row.divideColor || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                                    Divided {row.divideRole}
                                                                </span>
                                                            )}
                                                            {row.divideRole === 'B' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeDivide(index)}
                                                                    title={language === 'fr' ? 'Supprimer la division' : 'Remove division'}
                                                                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            value={row.amount}
                                                            onChange={(e) => updateRow(index, 'amount', e.target.value)}
                                                            className="min-w-[120px]"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <DateInputWithShortcuts
                                                            value={row.startDate}
                                                            onChange={(e) => updateRow(index, 'startDate', e.target.value)}
                                                            className="min-w-[150px]"
                                                            retirementDate={wishedRetirementDate}
                                                            legalDate={legalRetirementDate}
                                                            mode="start"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <DateInputWithShortcuts
                                                            value={row.endDate}
                                                            onChange={(e) => updateRow(index, 'endDate', e.target.value)}
                                                            className="min-w-[150px]"
                                                            retirementDate={wishedRetirementDate}
                                                            legalDate={legalRetirementDate}
                                                            deathDate={deathDate}
                                                            mode="end"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={row.selectedProduct || ''}
                                                            onChange={(e) => updateProductSelection(index, e.target.value)}
                                                        >
                                                            <option value="" className="bg-card text-foreground">{language === 'fr' ? 'Sélectionner...' : 'Select...'}</option>
                                                            {investmentProducts
                                                                .filter(product => assetClassFilter === null || product.assetClass === assetClassFilter)
                                                                .map(product => (
                                                                    <option key={product.id} value={product.id} className="bg-card text-foreground">
                                                                        {product.name} ({product.ticker})
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={row.groupedWith || 'not grouped'}
                                                            onChange={(e) => updateRow(index, 'groupedWith', e.target.value)}
                                                        >
                                                            <option value="not grouped" className="bg-card text-foreground">{language === 'fr' ? 'Non groupé' : 'not grouped'}</option>
                                                            {availableParents.map(parent => (
                                                                <option key={parent.id} value={parent.id} className="bg-card text-foreground">
                                                                    {parent.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        {(!row.groupedWith || row.groupedWith === 'not grouped') && (
                                                            <Input
                                                                type="text"
                                                                value={row.investGroupName !== undefined ? row.investGroupName : row.name}
                                                                onChange={(e) => updateRow(index, 'investGroupName', e.target.value)}
                                                                className="min-w-[150px]"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => divideRow(index)}
                                                                title={language === 'fr' ? 'Diviser le montant (concurrent)' : 'Divide amount (concurrent)'}
                                                                disabled={!!row.divideRole} // Disable divide if already divided (simple for now)
                                                            >
                                                                <Scissors className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => splitRow(index)}
                                                                title={language === 'fr' ? 'Diviser la durée (temporel)' : 'Split duration (temporal)'}
                                                            >
                                                                <Split className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-8 flex">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="mr-auto text-muted-foreground hover:text-foreground border-dashed"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {language === 'fr' ? 'Réinitialiser' : 'Reset defaults'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* External Navigation Buttons */}
                <div className="mt-12 flex justify-between items-center relative">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/data-review')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent"
                    >
                        <ChevronLeft className="h-6 w-6" />
                        <span className="text-lg">{language === 'fr' ? 'Retour' : 'Back'}</span>
                    </Button>

                    <div className="absolute left-1/2 -translate-x-1/2 transform">
                        <Button
                            onClick={handleContinue}
                            disabled={isSaving}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-6 text-xl rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                        >
                            {isSaving ? (language === 'fr' ? 'Sauvegarde...' : 'Saving...') : (language === 'fr' ? 'Continuer vers le verdict' : 'Continue to Verdict')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CapitalManagementSetup;
