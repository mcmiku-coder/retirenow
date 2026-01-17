import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { getIncomeData, getCostData, getUserData, getScenarioData, getRetirementData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';
import WorkflowNavigation from '../components/WorkflowNavigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChevronDown, ChevronUp, Download, RefreshCw, SlidersHorizontal } from 'lucide-react';


const ScenarioResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, password } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Data State
  const [userData, setUserData] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [costs, setCosts] = useState([]);
  const [assets, setAssets] = useState([]); // from currentAssets
  const [debts, setDebts] = useState([]); // from desiredOutflows
  // Retirement data pillars are merged into incomes for unified processing usually, but kept separate here for filtering
  const [retirementData, setRetirementData] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);

  // UI State
  const [isTableOpen, setIsTableOpen] = useState(false);

  // Filter State - Track which items are enabled for calculation
  const [activeFilters, setActiveFilters] = useState({});

  // Result State
  const [projection, setProjection] = useState({
    yearlyBreakdown: [],
    finalBalance: 0,
    canQuit: false,
    balanceBeforeTransmission: 0,
    transmissionAmount: 0
  });

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load Data
  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const loadAllData = async () => {
      try {
        const [uData, iData, cData, rData, sData] = await Promise.all([
          getUserData(user.email, password),
          getIncomeData(user.email, password),
          getCostData(user.email, password),
          getRetirementData(user.email, password),
          getScenarioData(user.email, password)
        ]);

        // Use provided data from location state (simulation adjusted) or fallback to DB
        // Note: DataReview passes 'adjustedIncomes', 'adjustedCosts', 'adjustedAssets', 'adjustedDebts' if modified
        // However, standard flow might access /result directly.
        // We must be robust.

        const finalIncomes = location.state?.adjustedIncomes || iData || [];
        const finalCosts = location.state?.adjustedCosts || cData || [];

        // Scenario Data contains currentAssets and desiredOutflows arrays usually
        // But DataReview might have passed modified versions.
        const finalAssets = location.state?.adjustedAssets || sData?.currentAssets || [];
        const finalDebts = location.state?.adjustedDebts || sData?.desiredOutflows || [];

        // Filter Retirement Pillars: Exclude 'One-time' items (3a, LPP Capital) handled in Assets
        if (rData?.rows) {
          rData.rows = rData.rows.filter(r => r.frequency !== 'One-time' && parseFloat(r.amount) > 0);
        }

        setUserData(uData);
        setIncomes(finalIncomes);
        setCosts(finalCosts);
        setAssets(finalAssets);
        setDebts(finalDebts);
        setRetirementData(rData);
        setScenarioData(sData);

        // Initialize filters with prefixed keys to avoid ID collisions
        const filters = {};

        const addToFilters = (list, prefix) => {
          list.forEach(item => {
            const id = item.id || item.name;
            filters[`${prefix}-${id}`] = true;
          });
        };

        addToFilters(finalIncomes, 'income');
        addToFilters(finalCosts, 'cost');
        addToFilters(finalAssets, 'asset');
        addToFilters(finalDebts, 'debt');

        if (rData?.rows) {
          rData.rows.forEach(r => {
            const id = r.id || r.name;
            filters[`pillar-${id}`] = true;
          });
        }

        setActiveFilters(filters);
        setLoading(false);

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error(t('common.error'));
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, password, navigate, location]);

  // Calculate Projection whenever filters or data changes
  useEffect(() => {
    if (loading || !userData) return;

    const calculateProjection = () => {
      const currentYear = new Date().getFullYear();
      const birthDate = new Date(userData.birthDate);

      // Death date logic
      let deathYear;
      if (userData.theoreticalDeathDate) {
        deathYear = new Date(userData.theoreticalDeathDate).getFullYear();
      } else {
        const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
        deathYear = birthDate.getFullYear() + approximateLifeExpectancy;
      }

      const breakdown = [];
      // Initial Balance (starts at 0, accumulating flows)
      let cumulativeBalance = 0;

      // Transmission logic
      const transmissionAmt = location.state?.transmissionAmount || scenarioData?.transmissionAmount || 0;
      let balanceBeforeTransmission = 0;
      const wishedRetirementYear = new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate || new Date()).getFullYear();

      for (let year = currentYear; year <= deathYear; year++) {
        let yearIncome = 0;
        let yearCosts = 0;
        const incomeBreakdown = {};
        const costBreakdown = {};

        // --- INCOMES ---
        incomes.forEach(row => {
          const id = row.id || row.name;
          if (!activeFilters[`income-${id}`]) return;

          const amount = parseFloat(row.adjustedAmount || row.amount) || 0;
          // Note: 'Net Salary' usually monthly
          const val = calculateYearlyAmount(amount, row.frequency, row.startDate, row.endDate, year);
          if (val > 0) {
            yearIncome += val;
            incomeBreakdown[row.name] = (incomeBreakdown[row.name] || 0) + val;
          }
        });

        // --- RETIREMENT PILLARS ---
        if (retirementData?.rows) {
          retirementData.rows.forEach(row => {
            const id = row.id || row.name;
            if (!activeFilters[`pillar-${id}`]) return;

            const amount = parseFloat(row.amount) || 0;
            if (amount > 0) {
              const deathDateStr = `${deathYear}-12-31`;
              let endDateStr = deathDateStr;
              if (row.frequency === 'One-time') endDateStr = row.startDate;
              if (row.endDate) endDateStr = row.endDate; // Respect explicit end date if present

              const val = calculateYearlyAmount(amount, row.frequency, row.startDate, endDateStr, year);
              if (val > 0) {
                yearIncome += val;
                incomeBreakdown[row.name] = (incomeBreakdown[row.name] || 0) + val;
              }
            }
          });
        }

        // Helper to determine period range
        const getPeriodRange = (timeframe) => {
          let startOffset = 0;
          let endOffset = 0;
          switch (timeframe) {
            case 'within_5y': startOffset = 0; endOffset = 5; break;
            case 'within_5_10y': startOffset = 5; endOffset = 10; break;
            case 'within_10_15y': startOffset = 10; endOffset = 15; break;
            case 'within_15_20y': startOffset = 15; endOffset = 20; break;
            case 'within_20_25y': startOffset = 20; endOffset = 25; break;
            case 'within_25_30y': startOffset = 25; endOffset = 30; break;
            default: return null;
          }
          return {
            startYear: currentYear + startOffset,
            endYear: currentYear + endOffset,
            duration: endOffset - startOffset
          };
        };

        // --- ASSETS (as Inflows) ---
        assets.forEach(asset => {
          const id = asset.id || asset.name;
          if (!activeFilters[`asset-${id}`]) return;

          const amount = Math.abs(parseFloat(asset.adjustedAmount || asset.amount) || 0);

          // Check for Period Availability
          // DataReview sets availabilityType='Period' and availabilityTimeframe='within_...'
          if (asset.availabilityType === 'Period' || (!asset.availabilityDate && asset.availabilityTimeframe)) {
            const period = getPeriodRange(asset.availabilityTimeframe);
            if (period && year >= period.startYear && year < period.endYear) {
              const yearlyVal = amount / period.duration;
              yearIncome += yearlyVal;
              incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + yearlyVal;
            }
          }
          // Check for specific Date Availability
          else if (asset.availabilityDate) {
            const val = calculateYearlyAmount(amount, 'One-time', asset.availabilityDate, null, year);
            if (val > 0) {
              yearIncome += val;
              incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + val;
            }
          }
          // No date/period = Available NOW (Initial Capital)
          else {
            if (year === currentYear) {
              yearIncome += amount;
              incomeBreakdown[asset.name] = (incomeBreakdown[asset.name] || 0) + amount;
            }
          }
        });

        // --- COSTS ---
        costs.forEach(row => {
          const id = row.id || row.name;
          if (!activeFilters[`cost-${id}`]) return;

          const amount = Math.abs(parseFloat(row.adjustedAmount || row.amount) || 0);
          const val = calculateYearlyAmount(amount, row.frequency, row.startDate, row.endDate, year);
          if (val > 0) {
            yearCosts += val;
            const cat = row.category || row.name || 'Other';
            costBreakdown[cat] = (costBreakdown[cat] || 0) + val;
          }
        });

        // --- DEBTS (as Outflows) ---
        debts.forEach(debt => {
          const id = debt.id || debt.name;
          if (!activeFilters[`debt-${id}`]) return;

          const amount = Math.abs(parseFloat(debt.adjustedAmount || debt.amount) || 0);

          // Check for Period Availability (Debts use madeAvailableType/Timeframe)
          if (debt.madeAvailableType === 'Period' || (!debt.madeAvailableDate && debt.madeAvailableTimeframe)) {
            const period = getPeriodRange(debt.madeAvailableTimeframe);
            if (period && year >= period.startYear && year < period.endYear) {
              const yearlyVal = amount / period.duration;
              yearCosts += yearlyVal;
              costBreakdown[debt.name] = (costBreakdown[debt.name] || 0) + yearlyVal;
            }
          }
          // Check for specific Date 
          else {
            // Debts usually One-time payoff at date?
            const date = debt.madeAvailableDate || debt.startDate || debt.date || currentYear + '-01-01';
            const val = calculateYearlyAmount(amount, 'One-time', date, null, year);
            if (val > 0) {
              yearCosts += val;
              costBreakdown[debt.name] = (costBreakdown[debt.name] || 0) + val;
            }
          }
        });


        // Subtract transmission at death
        if (year === deathYear && transmissionAmt > 0) {
          balanceBeforeTransmission = cumulativeBalance + (yearIncome - yearCosts);
          cumulativeBalance -= transmissionAmt;
        }

        const annualBalance = yearIncome - yearCosts;
        cumulativeBalance += annualBalance;

        breakdown.push({
          year,
          income: yearIncome,
          costs: yearCosts,
          // Force negative for graph, ensure it goes DOWN
          negCosts: -Math.abs(yearCosts),
          annualBalance,
          cumulativeBalance,
          incomeBreakdown,
          costBreakdown
        });
      }

      setProjection({
        yearlyBreakdown: breakdown,
        finalBalance: cumulativeBalance,
        canQuit: cumulativeBalance >= 0,
        balanceBeforeTransmission,
        transmissionAmount: transmissionAmt
      });
    };

    calculateProjection();

  }, [loading, userData, incomes, costs, assets, debts, retirementData, activeFilters, location.state]);

  const handleFilterChange = (key, checked) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const toggleAll = (items, prefix, checked) => {
    const newFilters = { ...activeFilters };
    items.forEach(item => {
      const id = item.id || item.name;
      newFilters[`${prefix}-${id}`] = checked;
    });
    setActiveFilters(newFilters);
  };

  // Helper to format item label with details
  const formatItemLabel = (item, type = 'standard') => {
    const amount = parseFloat(item.adjustedAmount || item.amount || 0).toLocaleString();
    const freq = item.frequency ? item.frequency.charAt(0) : (type === 'asset' || type === 'debt' ? '1x' : '?');

    let dateInfo = '';
    if (item.startDate) {
      dateInfo = `${new Date(item.startDate).toLocaleDateString()}`;
      if (item.endDate) dateInfo += ` -> ${new Date(item.endDate).toLocaleDateString()}`;
      else if (freq !== '1x') dateInfo += ' -> ...';
    } else if (item.availabilityDate) {
      dateInfo = `${new Date(item.availabilityDate).toLocaleDateString()}`;
    }

    return (
      <div className="flex flex-col leading-tight">
        <span className="font-medium truncate">{item.name}</span>
        <span className="text-xs text-muted-foreground truncate">
          CHF {amount} ({freq}) • {dateInfo}
        </span>
      </div>
    );
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs">
          <p className="font-bold mb-2 text-sm">{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

          <div className="mb-2">
            <p className="font-semibold text-green-400 mb-1">{language === 'fr' ? 'Revenus' : 'Income'}</p>
            {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => (
              <div key={name} className="flex justify-between gap-4">
                <span>{name}</span>
                <span>CHF {Math.round(val).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
              <span>Total</span>
              <span>CHF {Math.round(data.income).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <p className="font-semibold text-red-400 mb-1">{language === 'fr' ? 'Dépenses' : 'Costs'}</p>
            {Object.entries(data.costBreakdown || {}).map(([name, val]) => (
              <div key={name} className="flex justify-between gap-4">
                <span>{name}</span>
                <span>CHF {Math.round(val).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
              <span>Total</span>
              <span>CHF {Math.round(data.costs).toLocaleString()}</span>
            </div>
          </div>

          <div className={`mt-2 pt-2 border-t border-gray-600 font-bold flex justify-between ${data.annualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <span>{language === 'fr' ? 'Solde annuel' : 'Annual Balance'}</span>
            <span>CHF {Math.round(data.annualBalance || (data.income - data.costs)).toLocaleString()}</span>
          </div>

          <div className="mt-1 flex justify-between text-blue-300 font-bold">
            <span>{language === 'fr' ? 'Solde cumulé' : 'Cumulative'}</span>
            <span>CHF {Math.round(data.cumulativeBalance).toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 bg-background text-foreground" data-testid="scenario-result-page">
      <div className="max-w-[1600px] w-full mx-auto">
        <WorkflowNavigation />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

          {/* LEFT COLUMN: Controls & Verdict */}
          <div className="xl:col-span-1 space-y-6">

            {/* Verdict Card */}
            <Card className="overflow-hidden border-2 shadow-sm">
              <div className={`h-3 w-full ${projection.canQuit ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  {/* Image on left */}
                  <img
                    src={projection.canQuit ? '/yes_quit.png' : '/no_quit.png'}
                    alt="Verdict"
                    className="w-24 h-24 object-contain"
                  />

                  {/* Balance on right */}
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${projection.canQuit ? 'text-green-500' : 'text-red-500'}`}>
                      CHF {Math.round(projection.finalBalance).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'fr' ? 'Solde final projeté' : 'Projected Final Balance'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Toggles */}
            <Card className="max-h-[520px] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  {language === 'fr' ? 'Contributeurs actifs' : 'Active Contributors'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Incomes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Revenus' : 'Incomes'}</h4>
                    <Button variant="ghost" size="sm" onClick={() => { toggleAll(incomes, 'income', true); toggleAll(retirementData?.rows || [], 'pillar', true); }} className="h-6 text-xs px-2">All</Button>
                  </div>
                  <div className="space-y-3">
                    {incomes.map(item => (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-income-${item.id || item.name}`}
                          checked={!!activeFilters[`income-${item.id || item.name}`]}
                          onCheckedChange={(checked) => handleFilterChange(`income-${item.id || item.name}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-income-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item)}
                        </Label>
                      </div>
                    ))}
                    {retirementData?.rows?.map(item => (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-pillar-${item.id || item.name}`}
                          checked={!!activeFilters[`pillar-${item.id || item.name}`]}
                          onCheckedChange={(checked) => handleFilterChange(`pillar-${item.id || item.name}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-pillar-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assets */}
                {assets.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Actifs' : 'Assets'}</h4>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(assets, 'asset', true)} className="h-6 text-xs px-2">All</Button>
                    </div>
                    <div className="space-y-3">
                      {assets.map(item => (
                        <div key={item.id || item.name} className="flex items-start space-x-2">
                          <Checkbox
                            id={`filter-asset-${item.id || item.name}`}
                            checked={!!activeFilters[`asset-${item.id || item.name}`]}
                            onCheckedChange={(checked) => handleFilterChange(`asset-${item.id || item.name}`, checked)}
                            className="mt-1"
                          />
                          <Label htmlFor={`filter-asset-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                            {formatItemLabel(item, 'asset')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Costs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Dépenses' : 'Costs'}</h4>
                    <Button variant="ghost" size="sm" onClick={() => toggleAll(costs, 'cost', true)} className="h-6 text-xs px-2">All</Button>
                  </div>
                  <div className="space-y-3">
                    {costs.map(item => (
                      <div key={item.id || item.name} className="flex items-start space-x-2">
                        <Checkbox
                          id={`filter-cost-${item.id || item.name}`}
                          checked={!!activeFilters[`cost-${item.id || item.name}`]}
                          onCheckedChange={(checked) => handleFilterChange(`cost-${item.id || item.name}`, checked)}
                          className="mt-1"
                        />
                        <Label htmlFor={`filter-cost-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                          {formatItemLabel(item)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Debts */}
                {debts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">{language === 'fr' ? 'Dettes / Sorties' : 'Debts / Outflows'}</h4>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(debts, 'debt', true)} className="h-6 text-xs px-2">All</Button>
                    </div>
                    <div className="space-y-3">
                      {debts.map(item => (
                        <div key={item.id || item.name} className="flex items-start space-x-2">
                          <Checkbox
                            id={`filter-debt-${item.id || item.name}`}
                            checked={!!activeFilters[`debt-${item.id || item.name}`]}
                            onCheckedChange={(checked) => handleFilterChange(`debt-${item.id || item.name}`, checked)}
                            className="mt-1"
                          />
                          <Label htmlFor={`filter-debt-${item.id || item.name}`} className="text-sm cursor-pointer whitespace-normal">
                            {formatItemLabel(item, 'debt')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Graph & Table */}
          <div className="xl:col-span-3 space-y-6">

            {/* Graph */}
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Projection Financière en CHF' : 'Financial Projection in CHF'}</CardTitle>
              </CardHeader>
              <CardContent className="h-[530px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projection.yearlyBreakdown} margin={{ top: 10, right: 30, left: 20, bottom: 0 }} stackOffset="sign">
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cumulativeBalance"
                      stroke={projection.finalBalance >= 0 ? "#10b981" : "#ef4444"}
                      fill={projection.finalBalance >= 0 ? "url(#colorBalance)" : "url(#colorNegative)"}
                      name={language === 'fr' ? 'Solde cumulé' : 'Cumulative Balance'}
                      stackId="area"
                    />
                    <Bar dataKey="income" barSize={10} fill="#22c55e" name={language === 'fr' ? 'Revenus annuels' : 'Annual Income'} stackId="bars" />
                    <Bar dataKey="negCosts" barSize={10} fill="#ef4444" name={language === 'fr' ? 'Dépenses annuelles' : 'Annual Costs'} stackId="bars" />

                    <ReferenceLine
                      x={new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate).getFullYear()}
                      stroke="#f59042"
                      label={{
                        position: 'insideTopLeft',
                        value: `${language === 'fr' ? 'Retraite' : 'Retirement'}: ${new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate).toLocaleDateString()}`,
                        fill: '#f59042',
                        fontSize: 12
                      }}
                      strokeDasharray="3 3"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>



          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioResult;
