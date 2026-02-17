import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { ArrowLeft, Download, Info, HelpCircle, Activity } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";

const SimulationDataTable = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useLanguage();

    const [activeTab, setActiveTab] = useState('essential');
    const [filterText, setFilterText] = useState('');
    const [selectedScenario, setSelectedScenario] = useState('p5');

    const S = selectedScenario.toUpperCase();

    // Get data from navigation state
    const monthlyData = location.state?.monthlyData || [];
    const metadata = location.state?.metadata || {};

    // Filter data based on search text
    const filteredData = useMemo(() => {
        if (!filterText) return monthlyData;
        const lowerFilter = filterText.toLowerCase();
        return monthlyData.filter(row =>
            row.Date_EOM?.toLowerCase().includes(lowerFilter) ||
            row.MonthIndex?.toString().includes(lowerFilter)
        );
    }, [monthlyData, filterText]);

    if (!monthlyData || monthlyData.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <Card className="bg-gray-900 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">{language === 'fr' ? 'Aucune donnée disponible' : 'No Data Available'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-gray-400">
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

    // Helper for tooltips
    const renderHeader = (col) => (
        <th
            key={col.key}
            style={{ width: col.width }}
            className={`p-0 m-0 font-normal border-none flex-shrink-0 ${col.sticky ? 'sticky left-0 z-30 bg-gray-800 shadow-[1px_0_0_0_rgba(255,255,255,0.1)]' : ''}`}
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={`px-3 py-3 text-sm font-semibold text-gray-100 flex items-center gap-1 group cursor-help transition-colors hover:bg-gray-700/50 h-full w-full`}
                        >
                            <span className="truncate">{col.label}</span>
                            <HelpCircle size={12} className="text-gray-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-gray-800 border-gray-700 text-gray-100 p-3 shadow-xl">
                        <p className="font-bold text-blue-400 mb-1">{col.label}</p>
                        <p className="text-xs mb-2">{col.tooltip}</p>
                        <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-1">
                            <span className="font-semibold uppercase">{language === 'fr' ? 'Source' : 'Source'}:</span> {col.source}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </th>
    );

    // Common column definitions with tooltips and sources
    const colDef = {
        Date: {
            key: 'Date_EOM',
            label: language === 'fr' ? 'Date' : 'Date',
            width: 110,
            sticky: true,
            tooltip: language === 'fr' ? "Date de fin du mois civil." : "End of the calendar month.",
            source: language === 'fr' ? "Calendrier système." : "System calendar."
        },
        Total: {
            key: `Total_${S}_EOM`,
            label: language === 'fr' ? `Total ${S}` : `Total ${S}`,
            width: 140,
            format: 'currency',
            emphasis: true,
            tooltip: language === 'fr' ? `Richesse totale (Cash + Investi + Immo) dans le scénario ${S}.` : `Total wealth (Cash + Invested + Real Estate) in the ${S} scenario.`,
            source: language === 'fr' ? `Agrégation multi-actifs (Moteur Monte Carlo ${S} + Saisie).` : `Multi-asset aggregation (Monte Carlo ${S} + User inputs).`
        },
        WealthDelta: {
            key: 'WealthDelta',
            label: language === 'fr' ? 'Var. Patrimoine' : 'Wealth Delta',
            width: 130,
            format: 'currency',
            colorConditional: true,
            tooltip: language === 'fr' ? "Variation de votre richesse totale par rapport au mois précédent." : "Change in your total wealth compared to the previous month.",
            source: language === 'fr' ? "Calcul différentiel (Mois n - Mois n-1)." : "Differential calculation (Month n - Month n-1)."
        },
        NetFlow: {
            key: 'NetFlow',
            label: language === 'fr' ? 'Solde Flux' : 'Net Flow',
            width: 130,
            format: 'currency',
            colorConditional: true,
            tooltip: language === 'fr' ? "Différence entre vos revenus perçus et vos dépenses sur le mois." : "Difference between income received and expenses during the month.",
            source: language === 'fr' ? "Pages Revenus & Dépenses." : "Income & Expenses pages."
        },
        Yield: {
            key: `InvestedYield_${S}`,
            label: language === 'fr' ? 'Gain/Perte Bourse' : 'Inv. Yield',
            width: 140,
            format: 'currency',
            colorConditional: true,
            tooltip: language === 'fr' ? `Performance pure de vos placements (gains/pertes cumulés) dans le scénario ${S}.` : `Pure performance of your investments (cumulative gains/losses) in the ${S} scenario.`,
            source: language === 'fr' ? `Moteur Monte Carlo (${S}).` : `Monte Carlo Engine (${S}).`
        },
        LiquidNonInv: {
            key: 'LiquidNonInvested_EOM',
            label: language === 'fr' ? 'Compte Courant' : 'Cash (Non-Inv)',
            width: 140,
            format: 'currency',
            tooltip: language === 'fr' ? "Total des liquidités disponibles non exposées au marché (Comptes, épargne, cash)." : "Total available liquidity not exposed to market fluctuations (Accounts, savings, cash).",
            source: language === 'fr' ? "Pages Actifs (Catégorie Liquide, non investi)." : "Asset pages (Liquid category, non-invested)."
        },
        InvestedMarket: {
            key: `InvestedMarketValue_${S}`,
            label: language === 'fr' ? `Portefeuille ${S}` : `Portfolio ${S}`,
            width: 140,
            format: 'currency',
            tooltip: language === 'fr' ? `Valeur de marché de vos placements encore actifs dans le portefeuille (${S}).` : `Market value of your active investments in the portfolio (${S}).`,
            source: language === 'fr' ? `Moteur Monte Carlo (${S}).` : `Monte Carlo Engine (${S}).`
        },
        Realized: {
            key: `RealizedCapital_${S}`,
            label: language === 'fr' ? `Capital Réalisé ${S}` : `Realized Cap ${S}`,
            width: 140,
            format: 'currency',
            tooltip: language === 'fr' ? `Cash sécurisé suite à la vente ou à l'échéance d'un placement (${S}).` : `Secured cash following the sale or maturity of an investment (${S}).`,
            source: language === 'fr' ? `Moteur Monte Carlo (${S}).` : `Monte Carlo Engine (${S}).`
        },
        InvestContrib: {
            key: 'InvestContributionFlow',
            label: language === 'fr' ? 'Versement Inv.' : 'Inv. Contrib.',
            width: 130,
            format: 'currency',
            colorConditional: true,
            tooltip: language === 'fr' ? "Montant net injecté dans le portefeuille. Les montants négatifs indiquent une sortie de principal (liquidation)." : "Net amount injected into the portfolio. Negative amounts indicate a principal exit (liquidation).",
            source: language === 'fr' ? "Saisie utilisateur & Moteur Monte Carlo." : "User inputs & Monte Carlo Engine."
        },
        Illiquid: {
            key: 'IlliquidWealth_EOM',
            label: language === 'fr' ? 'Patrimoine non-liquide' : 'Illiquid Assets',
            width: 150,
            format: 'currency',
            tooltip: language === 'fr' ? "Valeur brute de vos actifs non-liquides (Immobilier, Collections, etc.)." : "Gross value of your non-liquid assets (Real Estate, Collections, etc.).",
            source: language === 'fr' ? "Pages Actifs (Catégorie Immobilier/Illiquide)." : "Asset pages (Real Estate/Illiquid categories)."
        }
    };

    // Tab configurations
    const tabsConfig = {
        essential: [colDef.Date, colDef.Total, colDef.WealthDelta, colDef.NetFlow, colDef.LiquidNonInv],
        investor: [colDef.Date, colDef.Total, colDef.InvestedMarket, colDef.Realized, colDef.Yield, colDef.InvestContrib],
        debug: [
            colDef.Date,
            { key: 'MonthIndex', label: 'Index', width: 60, tooltip: 'Index du mois', source: 'Système' },
            colDef.Total,
            colDef.LiquidNonInv,
            colDef.InvestedMarket,
            colDef.Realized,
            colDef.Illiquid,
            colDef.NetFlow,
            colDef.Yield,
            { key: 'InvestContributionFlow', label: 'Flux Inv.', width: 110, format: 'currency', tooltip: 'Nouveau versement investi', source: 'Saisie' },
            { key: 'LiquidNonInvestedFlow', label: 'Flux Cash', width: 110, format: 'currency', tooltip: 'Apport de cash hors revenus', source: 'Saisie' },
            { key: 'IncomeFlow', label: 'Revenus', width: 120, format: 'currency', tooltip: 'Total des revenus', source: 'Calcul' },
            { key: 'CostFlow', label: 'Dépenses', width: 120, format: 'currency', tooltip: 'Total des dépenses', source: 'Calcul' },
            { key: 'Year', label: 'Année', width: 70, tooltip: 'Année civile', source: 'Système' }
        ]
    };

    const currentColumns = tabsConfig[activeTab];

    const formatValue = (value, format) => {
        if (value === null || value === undefined) return '-';
        if (format === 'currency') {
            return new Intl.NumberFormat(language === 'fr' ? 'fr-CH' : 'en-CH', {
                style: 'currency',
                currency: 'CHF',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value);
        }
        return value;
    };

    const exportToCSV = () => {
        const csvCols = tabsConfig.debug;
        const headers = csvCols.map(col => col.label).join(',');
        const rows = filteredData.map(row =>
            csvCols.map(col => {
                const val = row[col.key];
                return (val === null || val === undefined) ? '' : val;
            }).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `simulation_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mx-auto p-6 max-w-full min-h-screen bg-gray-950">
            <Card className="bg-gray-900 border-gray-800 shadow-2xl">
                <CardHeader className="border-b border-gray-800 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate('/result')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {language === 'fr' ? 'Retour' : 'Back'}
                            </Button>
                            <div>
                                <CardTitle className="text-2xl text-white font-bold">
                                    {language === 'fr' ? 'Tableau de Bord Mensuel' : 'Monthly Dashboard'}
                                </CardTitle>
                                {metadata.retirementDate && (
                                    <p className="text-xs text-blue-400 font-medium">
                                        {language === 'fr' ? 'Objectif Retraite: ' : 'Retirement Target: '}
                                        {new Date(metadata.retirementDate).toLocaleDateString(language === 'fr' ? 'fr-CH' : 'en-CH', { month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="px-4 py-2 pl-10 border border-gray-700 rounded-full bg-gray-800 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none w-48 lg:w-64"
                                />
                                <div className="absolute left-3 top-2.5 text-gray-500">
                                    <Info size={16} />
                                </div>
                            </div>
                            <Button variant="outline" className="rounded-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" onClick={exportToCSV}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex items-center justify-between mb-6">
                            <TabsList className="bg-gray-800 border border-gray-700 rounded-lg p-1">
                                <TabsTrigger value="essential" className="rounded-md px-6 py-2 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                    {language === 'fr' ? 'Essentielle' : 'Essential'}
                                </TabsTrigger>
                                <TabsTrigger value="investor" className="rounded-md px-6 py-2 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                    {language === 'fr' ? 'Investisseur' : 'Investor'}
                                </TabsTrigger>
                                <TabsTrigger value="debug" className="rounded-md px-6 py-2 transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                    {language === 'fr' ? 'Toutes les données' : 'All Data'}
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-3">
                                <Activity size={16} className="text-blue-400" />
                                <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                                    <SelectTrigger className="w-56 bg-gray-800 border-gray-700 text-gray-100 text-xs h-9 rounded-full">
                                        <SelectValue placeholder="Choisir un scénario" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                        <SelectItem value="p5">Scénario P5 (Pessimiste)</SelectItem>
                                        <SelectItem value="p10">Scénario P10 (Prudent)</SelectItem>
                                        <SelectItem value="p25">Scénario P25 (Modéré)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900 shadow-inner">
                            <div className="overflow-auto h-[60vh] scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
                                <table className="w-full text-left border-collapse table-fixed min-w-max">
                                    <thead>
                                        <tr className="bg-gray-800/80 sticky top-0 z-20">
                                            {currentColumns.map(col => renderHeader(col))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={`
                                                    border-b border-gray-800 group transition-colors 
                                                    ${idx % 2 === 0 ? 'bg-gray-900/50' : 'bg-transparent'}
                                                    ${row.InjectionEvent ? 'bg-blue-900/10' : ''}
                                                    hover:bg-gray-800/40
                                                `}
                                            >
                                                {currentColumns.map((col, colIdx) => (
                                                    <td
                                                        key={col.key}
                                                        style={{ width: col.width }}
                                                        className={`
                                                            px-3 py-3 text-sm flex-shrink-0 transition-colors
                                                            ${col.sticky ? 'sticky left-0 bg-gray-900 z-10 font-medium group-hover:bg-gray-800 border-r border-gray-800' : ''}
                                                            ${col.emphasis ? 'font-bold text-white' : 'text-gray-400 group-hover:text-gray-200'}
                                                            ${col.colorConditional
                                                                ? (row[col.key] > 0 ? 'text-green-400 font-medium' : row[col.key] < 0 ? 'text-red-400 font-medium' : '')
                                                                : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            {formatValue(row[col.key], col.format)}
                                                            {colIdx === 0 && row.InjectionEvent && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse cursor-info" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right" className="bg-blue-900 border-blue-700 text-white p-3 shadow-2xl">
                                                                            <p className="font-bold flex items-center gap-2">
                                                                                <Info size={14} />
                                                                                {language === 'fr' ? 'Événement Particulier' : 'Special Event'}
                                                                            </p>
                                                                            <p className="text-xs mt-1">
                                                                                {row.InjectionEvent.name}:
                                                                                <span className="font-bold ml-1">
                                                                                    {formatValue(row.InjectionEvent.amount, 'currency')}
                                                                                </span>
                                                                            </p>
                                                                            {row.InjectionEvent.isExit && (
                                                                                <p className="text-[10px] opacity-80 mt-2 italic max-w-[200px]">
                                                                                    {language === 'fr'
                                                                                        ? "Cet actif est sorti du portefeuille. Le capital réalisé a été transféré vers vos liquidités."
                                                                                        : "This asset exited the portfolio. The realized capital was transferred to your cash."}
                                                                                </p>
                                                                            )}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default SimulationDataTable;
