import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { ArrowLeft, Download } from 'lucide-react';

const SimulationDataTable = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();

    const [showDebugColumns, setShowDebugColumns] = useState(false);
    const [filterText, setFilterText] = useState('');

    // Get data from navigation state
    const monthlyData = location.state?.monthlyData || [];
    const metadata = location.state?.metadata || {};

    // Filter data based on search text (must be before early return)
    const filteredData = useMemo(() => {
        if (!filterText) return monthlyData;
        const lowerFilter = filterText.toLowerCase();
        return monthlyData.filter(row =>
            row.Date_EOM?.toLowerCase().includes(lowerFilter) ||
            row.MonthIndex?.toString().includes(lowerFilter)
        );
    }, [monthlyData, filterText]);

    // Handle missing data
    if (!monthlyData || monthlyData.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{language === 'fr' ? 'Aucune donnée disponible' : 'No Data Available'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4">
                            {language === 'fr'
                                ? 'Aucune donnée de simulation disponible. Veuillez retourner à la page de résultats.'
                                : 'No simulation data available. Please return to the results page.'}
                        </p>
                        <Button onClick={() => navigate('/result')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {language === 'fr' ? 'Retour à la simulation' : 'Back to Simulation'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Define columns
    const columns = [
        { key: 'Date_EOM', label: language === 'fr' ? 'Date (Fin de mois)' : 'Date (EOM)', width: 120 },
        { key: 'MonthIndex', label: language === 'fr' ? 'Index Mois' : 'Month Index', width: 100 },
        { key: 'IncomeFlow', label: language === 'fr' ? 'Flux Revenus' : 'Income Flow', width: 120, format: 'currency' },
        { key: 'CostFlow', label: language === 'fr' ? 'Flux Dépenses' : 'Cost Flow', width: 120, format: 'currency' },
        { key: 'NetFlow', label: language === 'fr' ? 'Balance Revenus/Coûts' : 'Income/Cost Balance', width: 140, format: 'currency', colorConditional: true },
        { key: 'NonInvestedAssetFlow', label: language === 'fr' ? 'Flux Actifs Non-Inv.' : 'Non-Inv. Asset Flow', width: 140, format: 'currency' },
        { key: 'InvestContributionFlow', label: language === 'fr' ? 'Flux Contrib. Inv.' : 'Invest Contrib. Flow', width: 140, format: 'currency' },
        { key: 'NonInvestedWealth_EOM', label: language === 'fr' ? 'Patrimoine Non-Inv. (FM)' : 'Non-Inv. Wealth (EOM)', width: 160, format: 'currency' },
        { key: 'PrincipalInvested_EOM', label: language === 'fr' ? 'Principal Investi (P)' : 'Principal Invested (P)', width: 160, format: 'currency' },
        { key: 'InvestedValue_P0_EOM', label: language === 'fr' ? 'Valeur Inv. P0 (FM)' : 'Invested Value P0 (EOM)', width: 160, format: 'currency' },
        { key: 'InvestedValue_P5_EOM', label: language === 'fr' ? 'Portefeuille P5 (FM)' : 'Invested Value P5 (EOM)', width: 140, format: 'currency' },
        { key: 'InvestedValue_P10_EOM', label: language === 'fr' ? 'Portefeuille P10 (FM)' : 'Invested Value P10 (EOM)', width: 140, format: 'currency' },
        { key: 'InvestedValue_P50_EOM', label: language === 'fr' ? 'Portefeuille P50 (FM)' : 'Invested Value P50 (EOM)', width: 140, format: 'currency' },
        { key: 'InvestedValue_P95_EOM', label: language === 'fr' ? 'Portefeuille P95 (FM)' : 'Invested Value P95 (EOM)', width: 140, format: 'currency' },
        { key: 'BaselineTotal_EOM', label: language === 'fr' ? 'Total Baseline (FM)' : 'Baseline Total (EOM)', width: 160, format: 'currency' },
        { key: 'Total_P5_EOM', label: language === 'fr' ? 'Total P5 (FM)' : 'Total P5 (EOM)', width: 140, format: 'currency' },
        { key: 'Total_P10_EOM', label: language === 'fr' ? 'Total P10 (FM)' : 'Total P10 (EOM)', width: 140, format: 'currency' },
        { key: 'Total_P50_EOM', label: language === 'fr' ? 'Total P50 (FM)' : 'Total P50 (EOM)', width: 140, format: 'currency' },
        { key: 'Total_P95_EOM', label: language === 'fr' ? 'Total P95 (FM)' : 'Total P95 (EOM)', width: 140, format: 'currency' },
        { key: 'InjectionFlag', label: language === 'fr' ? 'Injection?' : 'Injection?', width: 100, format: 'boolean' },
        { key: 'InjectionAmount', label: language === 'fr' ? 'Montant Injection' : 'Injection Amount', width: 140, format: 'currency' },
    ];

    const debugColumns = [
        { key: 'Year', label: language === 'fr' ? 'Année' : 'Year', width: 80 },
        { key: 'IsYearEndSampled', label: language === 'fr' ? 'Fin d\'année?' : 'Year End?', width: 100, format: 'boolean' },
        { key: 'IdentityDiff', label: language === 'fr' ? 'Diff. Identité' : 'Identity Diff', width: 120, format: 'currency' },
    ];

    const visibleColumns = showDebugColumns ? [...columns, ...debugColumns] : columns;

    // Format value based on column type
    const formatValue = (value, format) => {
        if (value === null || value === undefined) return '-';

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat(language === 'fr' ? 'fr-CH' : 'en-CH', {
                    style: 'currency',
                    currency: 'CHF',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(value);
            case 'boolean':
                return value ? '✓' : '';
            default:
                return value;
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = visibleColumns.map(col => col.label).join(',');
        const rows = filteredData.map(row =>
            visibleColumns.map(col => {
                const value = row[col.key];
                if (value === null || value === undefined) return '';
                if (col.format === 'boolean') return value ? 'true' : 'false';
                if (col.format === 'currency') return value;
                return value;
            }).join(',')
        );

        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `simulation_data_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mx-auto p-6 max-w-full">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={() => navigate('/result')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {language === 'fr' ? 'Retour à la simulation' : 'Back to Simulation'}
                            </Button>
                            <CardTitle>
                                {language === 'fr' ? 'Données Mensuelles de Simulation' : 'Monthly Simulation Data'}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="showDebug"
                                    checked={showDebugColumns}
                                    onCheckedChange={setShowDebugColumns}
                                />
                                <Label htmlFor="showDebug" className="cursor-pointer">
                                    {language === 'fr' ? 'Afficher colonnes debug' : 'Show Debug Columns'}
                                </Label>
                            </div>
                            <Button variant="outline" onClick={exportToCSV}>
                                <Download className="mr-2 h-4 w-4" />
                                {language === 'fr' ? 'Exporter CSV' : 'Export CSV'}
                            </Button>
                        </div>
                    </div>
                    {metadata.simulationStartDate && (
                        <p className="text-sm text-gray-400 mt-2">
                            {language === 'fr' ? 'Début de simulation: ' : 'Simulation start: '}
                            {new Date(metadata.simulationStartDate).toLocaleDateString(language === 'fr' ? 'fr-CH' : 'en-CH')}
                            {' | '}
                            {language === 'fr' ? 'Horizon: ' : 'Horizon: '}
                            {metadata.horizonMonths} {language === 'fr' ? 'mois' : 'months'}
                            {' | '}
                            {language === 'fr' ? 'Lignes: ' : 'Rows: '}
                            {filteredData.length}
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Filter Input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder={language === 'fr' ? 'Filtrer par date ou index...' : 'Filter by date or index...'}
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-200 text-black placeholder:text-gray-500"
                        />
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg overflow-hidden">
                        {/* Header */}
                        <div className="flex bg-gray-800 border-b-2 border-gray-600 sticky top-0 z-20">
                            {visibleColumns.map((col, index) => (
                                <div
                                    key={col.key}
                                    style={{ width: col.width }}
                                    className={`px-3 py-3 text-sm font-semibold text-gray-100 flex-shrink-0 ${index === 0 ? 'sticky left-0 bg-gray-800 z-30' : ''}`}
                                >
                                    {col.label}
                                </div>
                            ))}
                        </div>

                        {/* Body */}
                        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
                            {filteredData.map((row, index) => (
                                <div key={index} className="flex border-b border-gray-700 hover:bg-gray-800 bg-gray-900">
                                    {visibleColumns.map((col, colIndex) => (
                                        <div
                                            key={col.key}
                                            style={{ width: col.width }}
                                            className={`px-3 py-2 text-sm flex-shrink-0 ${colIndex === 0 ? 'sticky left-0 bg-gray-900 z-10' : ''} ${col.colorConditional
                                                ? (row[col.key] >= 0 ? 'text-green-400' : 'text-red-400')
                                                : 'text-gray-100'
                                                }`}
                                        >
                                            {formatValue(row[col.key], col.format)}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SimulationDataTable;
