import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ChevronLeft } from 'lucide-react';
import InvestFlowChart from '../components/InvestFlowChart';

const InvestFlowGraph = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { language } = useLanguage();

    // State
    const [selectedScenario, setSelectedScenario] = useState('p5'); // Default Very Pessimistic (P5)
    const [yearlyData, setYearlyData] = useState([]);
    const [maxPosLayers, setMaxPosLayers] = useState(0);
    const [maxNegLayers, setMaxNegLayers] = useState(0);

    // Get Data from Location State
    const mcDetails = location.state?.monteCarloDetails;
    const simStartDate = location.state?.simulationStartDate;

    useEffect(() => {
        if (!mcDetails || !simStartDate) {
            // Redirect if no data
            navigate('/result');
            return;
        }

        // Process Data: Aggregate Monthly to Yearly
        const { processedData, maxP, maxN } = processMonteCarloData(mcDetails, simStartDate, selectedScenario);
        setYearlyData(processedData);
        setMaxPosLayers(maxP);
        setMaxNegLayers(maxN);

    }, [mcDetails, simStartDate, selectedScenario, navigate]);

    // Data Processing Logic
    const processMonteCarloData = (details, startDateStr, scenario) => {
        const startDate = new Date(startDateStr);
        const startYear = startDate.getUTCFullYear();
        const horizonMonths = details.horizonMonths;

        // Group by Year
        const yearsMap = new Map();

        // Initialize years
        for (let m = 0; m <= horizonMonths; m++) {
            const date = new Date(startDate);
            date.setUTCMonth(date.getUTCMonth() + m);
            const year = date.getUTCFullYear();

            if (!yearsMap.has(year)) {
                yearsMap.set(year, {
                    year,
                    netFlow: 0,
                    investedPrincipal: 0,
                    portfolioValue: 0,
                    lastMonthIndex: m, // Track last month to take EOY value
                    // Detailed Flows for Stacking
                    posFlows: [],
                    negFlows: []
                });
            }
            const yData = yearsMap.get(year);
            yData.lastMonthIndex = m;
        }

        // 1. Calculate Flows from Injections (Detailed)
        let globalMaxPos = 0;
        let globalMaxNeg = 0;

        if (details.injections) {
            details.injections.forEach(inj => {
                const date = new Date(startDate);
                date.setUTCMonth(date.getUTCMonth() + inj.monthIndex);
                const year = date.getUTCFullYear();

                if (yearsMap.has(year)) {
                    const yData = yearsMap.get(year);
                    yData.netFlow += inj.amount;

                    if (inj.amount > 0) {
                        yData.posFlows.push({ amount: inj.amount, assetId: inj.assetId, name: inj.name });
                    } else if (inj.amount < 0) {
                        yData.negFlows.push({ amount: inj.amount, assetId: inj.assetId, name: inj.name });
                    }
                }
            });
        }

        // Flatten Flows into Layers for Recharts
        const processedArray = Array.from(yearsMap.values()).map(yData => {
            // Sort flows to ensure consistent stacking (e.g. largest at bottom or by ID)
            // Sorting by magnitude descending often looks best for pyramids, but here we just want consistency.
            // Let's sort by amount descending (absolute)
            yData.posFlows.sort((a, b) => b.amount - a.amount);
            yData.negFlows.sort((a, b) => a.amount - b.amount); // Most negative first

            // Update global max layers
            if (yData.posFlows.length > globalMaxPos) globalMaxPos = yData.posFlows.length;
            if (yData.negFlows.length > globalMaxNeg) globalMaxNeg = yData.negFlows.length;

            // Map to Layer Keys for Rendering
            yData.posFlows.forEach((flow, i) => {
                yData[`posLayer${i}`] = flow.amount;
                yData[`posMeta${i}`] = flow;
            });
            yData.negFlows.forEach((flow, i) => {
                yData[`negLayer${i}`] = flow.amount;
                yData[`negMeta${i}`] = flow;
            });

            // [UI-ENHANCE] Calculate Totals for Labels
            const totalPos = yData.posFlows.reduce((sum, f) => sum + f.amount, 0);
            const totalNeg = yData.negFlows.reduce((sum, f) => sum + f.amount, 0);
            yData.totalPos = totalPos;
            yData.totalNeg = totalNeg;
            yData.netFlow = totalPos + totalNeg;

            return yData;
        });

        // 2 & 3. Get Principal and Portfolio Value (EOY)
        // [FIX] Use isolated 'graphPrincipalPath' if available
        const principalPath = details.graphPrincipalPath || details.principalPath;
        const portfolioPath = details.percentiles[scenario];

        // [NEW] Track total injected principal up to each year's end
        const injections = details.injections || [];

        processedArray.forEach(yData => {
            const idx = yData.lastMonthIndex;

            // Populate basic values
            if (idx < principalPath.length) {
                yData.investedPrincipal = principalPath[idx];
            }
            if (portfolioPath && idx < portfolioPath.length) {
                yData.totalPortfolioValue = portfolioPath[idx]; // Keep original for reference maybe?
            }

            // Calculate cumulative injections up to this year's end
            const totalInjectedUpToNow = injections
                .filter(inj => inj.monthIndex <= idx && inj.amount > 0)
                .reduce((sum, inj) => sum + inj.amount, 0);

            // New Valuation Logic:
            // Valuation = Active Principal + Gains
            // Gains = Total Portfolio Value - Total Principal Injected
            // Displayed Valuation = InvestedPrincipal + (TotalValue - TotalInjected)
            const currentPrincipal = yData.investedPrincipal || 0;
            const totalValue = portfolioPath && idx < portfolioPath.length ? portfolioPath[idx] : 0;

            const gainLoss = totalValue - totalInjectedUpToNow;
            yData.portfolioValue = currentPrincipal + gainLoss;

            // [UI-ENHANCE] Calculate anchor for labels AFTER values are set
            yData.maxYearlyValue = Math.max(
                yData.portfolioValue || 0,
                yData.investedPrincipal || 0,
                Math.abs(yData.netFlow || 0)
            );
        });

        return { processedData: processedArray, maxP: globalMaxPos, maxN: globalMaxNeg };
    };

    const handleBack = () => {
        navigate('/result', { state: location.state });
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        {language === 'fr' ? 'Retour' : 'Back'}
                    </Button>
                    <h1 className="text-xl font-bold">
                        {language === 'fr' ? 'Flux d\'Investissement' : 'Investment Flow Graph'}
                    </h1>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-border bg-card p-4 flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                            {language === 'fr' ? 'Scénario' : 'Scenario'}
                        </h3>
                        <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="p5">5% ({language === 'fr' ? 'Très Pessimiste' : 'Very Pessimistic'})</SelectItem>
                                <SelectItem value="p10">10% ({language === 'fr' ? 'Pessimiste' : 'Pessimistic'})</SelectItem>
                                <SelectItem value="p25">25% ({language === 'fr' ? 'Conservateur' : 'Conservative'})</SelectItem>
                                <SelectItem value="p50">50% ({language === 'fr' ? 'Médian' : 'Median'})</SelectItem>
                                <SelectItem value="p95">95% ({language === 'fr' ? 'Optimiste' : 'Optimistic'})</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-muted/30 p-4 rounded-lg text-xs space-y-3">
                        <h4 className="font-semibold">{language === 'fr' ? 'Légende' : 'Legend'}</h4>

                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                            <span>{language === 'fr' ? 'Nouvel Investissement' : 'New Investment'} ({language === 'fr' ? 'Positif' : 'Positive'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                            <span>{language === 'fr' ? 'Sortie d\'Investissement' : 'Investment Exit'} ({language === 'fr' ? 'Négatif' : 'Negative'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                            <span>{language === 'fr' ? 'Principal Actif' : 'Active Principal'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                            <span>{language === 'fr' ? 'Valeur investissements avec gains/pertes accumulés' : 'Investment valuation incl. cumulated gain/loss'}</span>
                        </div>
                    </div>
                </div>

                {/* Main Graph Area */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    <Card className="h-full flex flex-col shadow-none border-none bg-transparent">
                        <CardContent className="flex-1 p-0">
                            <InvestFlowChart
                                data={yearlyData}
                                language={language}
                                selectedScenario={selectedScenario}
                                maxPosLayers={maxPosLayers}
                                maxNegLayers={maxNegLayers}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default InvestFlowGraph;
