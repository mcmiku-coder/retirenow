import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { getIncomeData, getCostData, getUserData, getScenarioData, getRetirementData, saveScenarioData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronUp, Download, RefreshCw, SlidersHorizontal, LineChart as LineChartIcon, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';


const ScenarioResult = () => {
  console.log('Rendering ScenarioResult Component - Force Refresh');
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

        const finalIncomes = location.state?.adjustedIncomes || sData?.adjustedIncomes || iData || [];
        const finalCosts = location.state?.adjustedCosts || sData?.adjustedCosts || cData || [];

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
        // Restore from saved filters if available, otherwise default to true
        const savedFilters = sData?.activeFilters || {};
        const filters = {};

        const addToFilters = (list, prefix) => {
          list.forEach(item => {
            const id = item.id || item.name;
            const key = `${prefix}-${id}`;
            // If saved state exists, use it. Else default to true.
            if (savedFilters.hasOwnProperty(key)) {
              filters[key] = savedFilters[key];
            } else {
              filters[key] = true;
            }
          });
        };

        addToFilters(finalIncomes, 'income');
        addToFilters(finalCosts, 'cost');
        addToFilters(finalAssets, 'asset');
        addToFilters(finalDebts, 'debt');

        if (rData?.rows) {
          rData.rows.forEach(r => {
            const id = r.id || r.name;
            const key = `pillar-${id}`;
            if (savedFilters.hasOwnProperty(key)) {
              filters[key] = savedFilters[key];
            } else {
              filters[key] = true;
            }
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
            // Do not aggregate by category. Use name to match Data Review columns.
            const costKey = row.name;
            costBreakdown[costKey] = (costBreakdown[costKey] || 0) + val;
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
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      items.forEach(item => {
        const id = item.id || item.name;
        newFilters[`${prefix}-${id}`] = checked;
      });
      return newFilters;
    });
  };

  // Autosave filters when they change
  useEffect(() => {
    if (!loading && user && password && scenarioData && Object.keys(activeFilters).length > 0) {
      const saveFilters = async () => {
        try {
          // Debounce could be added here, but for now we save on change
          // to ensure persistence on navigation.
          await saveScenarioData(user.email, password, {
            ...scenarioData,
            activeFilters: activeFilters
          });
        } catch (err) {
          console.error("Failed to save filters", err);
        }
      };
      // Short timeout to debounce slightly and avoid rapid writes
      const timeoutId = setTimeout(saveFilters, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [activeFilters, loading, user, password, scenarioData]);

  // Generate Comprehensive PDF Report
  const generatePDF = async () => {
    try {
      setGeneratingPdf(true);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Helper function to format numbers without special characters
      const formatNumber = (num) => {
        // Handle NaN, null, undefined, or invalid numbers
        if (isNaN(num) || num === null || num === undefined) {
          return '0';
        }
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
      };

      // Helper to format dates
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
      };

      // ===== PAGE 1: HEADER, SIMULATION OPTION, GRAPH =====

      // Header
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Can I Quit? - Retirement Simulation Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Simulation Option - Full Explanation
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Chosen Simulation Option', 15, yPosition);
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const option = scenarioData?.retirementOption || 'option1';
      const retireDate = new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate);
      const birthDate = new Date(userData.birthDate);
      const retireAge = retireDate.getFullYear() - birthDate.getFullYear();

      let optionText = '';
      if (option === 'option0') {
        optionText = `Option 0: Legal Retirement Date (Age 65)`;
      } else if (option === 'option1') {
        optionText = `Option 1: Early Retirement with LPP Pension at Age ${retireAge}`;
        if (scenarioData?.pensionCapital) {
          optionText += `\nCurrent Pension Capital: CHF ${formatNumber(scenarioData.pensionCapital)}`;
        }
      } else if (option === 'option2') {
        optionText = `Option 2: Early Retirement with LPP Capital at Age ${retireAge}`;
        if (scenarioData?.projectedLPPCapital) {
          optionText += `\nProjected LPP Capital: CHF ${formatNumber(scenarioData.projectedLPPCapital)}`;
        }
      } else if (option === 'option3') {
        optionText = `Option 3: Calculate earliest possible retirement (balance > 0)`;
      }

      const lines = pdf.splitTextToSize(optionText, pageWidth - 30);

      // Set blue color for the option text (RGB: 59, 130, 246 - blue-500)
      pdf.setTextColor(59, 130, 246);
      pdf.text(lines, 15, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black

      yPosition += lines.length * 5 + 5;

      pdf.text(`Name: ${userData?.firstName || ''} ${userData?.lastName || ''}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Birth Date: ${formatDate(userData?.birthDate)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Retirement Date: ${formatDate(retireDate)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Final Balance: CHF ${formatNumber(projection.finalBalance)}`, 15, yPosition);
      yPosition += 6;
      pdf.text(`Status: ${projection.canQuit ? 'Positive' : 'Negative'}`, 15, yPosition);
      yPosition += 12;

      // Capture Graph
      const chartElement = document.querySelector('.recharts-wrapper');
      if (chartElement) {
        const canvas = await html2canvas(chartElement, { backgroundColor: '#1a1a1a', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
      }

      // ===== PAGES 2-N: ALL DATA REVIEW TABLES WITH ALL COLUMNS =====

      pdf.addPage();
      yPosition = 20;

      // Periodic Inflows Table (ALL columns)
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Periodic Inflows - Can be adjusted for simulation', 15, yPosition);
      yPosition += 8;

      const activeIncomes = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);
      if (activeIncomes.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Frequency', 'Start Date', 'End Date', 'Cluster']],
          body: activeIncomes.map(i => [
            i.name,
            formatNumber(parseFloat(i.amount)),
            formatNumber(parseFloat(i.adjustedAmount || i.amount)),
            i.frequency,
            formatDate(i.startDate),
            formatDate(i.endDate),
            i.clusterTag || ''
          ]),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const income = activeIncomes[rowIndex];
              const original = parseFloat(income.amount) || 0;
              const adjusted = parseFloat(income.adjustedAmount || income.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Current or Future Assets Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Current or Future Assets', 15, yPosition);
      yPosition += 8;

      const activeAssets = assets.filter(a => activeFilters[`asset-${a.id || a.name}`]);

      if (activeAssets.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Category', 'Preserve', 'Avail.Type', 'Avail.Details', 'Strategy', 'Cluster']],
          body: activeAssets.map(a => {
            // Use amount for both original and adjusted if adjustedAmount is missing
            const originalAmount = parseFloat(a.amount) || 0;
            const adjustedAmount = parseFloat(a.adjustedAmount || a.amount) || 0;

            // Infer availability type if not explicitly set
            let availType = a.availabilityType || '';
            if (!availType && a.availabilityTimeframe) availType = 'Period';
            if (!availType && a.availabilityDate) availType = 'Date';

            // Get availability details
            let availDetails = '';
            if (a.availabilityDate) {
              availDetails = formatDate(a.availabilityDate);
            } else if (a.availabilityTimeframe) {
              availDetails = a.availabilityTimeframe;
            }

            const row = [
              a.name || '',
              formatNumber(originalAmount),
              formatNumber(adjustedAmount),
              a.category || '',
              a.preserve || '',
              availType,
              availDetails,
              a.strategy || '',
              a.clusterTag || ''
            ];

            return row;
          }),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 7 },
          styles: { fontSize: 6 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const asset = activeAssets[rowIndex];
              const original = parseFloat(asset.amount) || 0;
              const adjusted = parseFloat(asset.adjustedAmount || asset.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Periodic Outflows Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Periodic Outflows - Can be adjusted for simulation', 15, yPosition);
      yPosition += 8;

      const activeCosts = costs.filter(c => activeFilters[`cost-${c.id || c.name}`]);
      if (activeCosts.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Frequency', 'Start Date', 'End Date', 'Cluster']],
          body: activeCosts.map(c => [
            c.name,
            formatNumber(parseFloat(c.amount)),
            formatNumber(parseFloat(c.adjustedAmount || c.amount)),
            c.frequency,
            formatDate(c.startDate),
            formatDate(c.endDate),
            c.clusterTag || ''
          ]),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const cost = activeCosts[rowIndex];
              const original = parseFloat(cost.amount) || 0;
              const adjusted = parseFloat(cost.adjustedAmount || cost.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
        yPosition = pdf.lastAutoTable.finalY + 10;
      }

      // Current or Future Debts Table (ALL columns)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Current or Future Debts', 15, yPosition);
      yPosition += 8;

      const activeDebts = debts.filter(d => activeFilters[`debt-${d.id || d.name}`]);
      if (activeDebts.length > 0) {
        autoTable(pdf, {
          startY: yPosition,
          head: [['Name', 'Original', 'Adjusted', 'Avail.Type', 'Avail.Details', 'Cluster']],
          body: activeDebts.map(d => {
            // Infer availability type if not explicitly set
            let availType = d.madeAvailableType || '';
            if (!availType && d.madeAvailableTimeframe) availType = 'Period';
            if (!availType && d.madeAvailableDate) availType = 'Date';

            // Get availability details
            let availDetails = '';
            if (d.madeAvailableDate) {
              availDetails = formatDate(d.madeAvailableDate);
            } else if (d.madeAvailableTimeframe) {
              availDetails = d.madeAvailableTimeframe;
            }

            return [
              d.name,
              formatNumber(parseFloat(d.amount)),
              formatNumber(parseFloat(d.adjustedAmount || d.amount)),
              availType,
              availDetails,
              d.clusterTag || ''
            ];
          }),
          theme: 'grid',
          headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
          styles: { fontSize: 7 },
          columnStyles: {
            1: { halign: 'right' }, // Original
            2: { halign: 'right' }  // Adjusted
          },
          didParseCell: function (data) {
            // Adjusted column is index 2
            if (data.section === 'body' && data.column.index === 2) {
              const rowIndex = data.row.index;
              const debt = activeDebts[rowIndex];
              const original = parseFloat(debt.amount) || 0;
              const adjusted = parseFloat(debt.adjustedAmount || debt.amount) || 0;

              if (adjusted < original) {
                data.cell.styles.textColor = [34, 197, 94]; // Green - reduction
              } else if (adjusted > original) {
                data.cell.styles.textColor = [239, 68, 68]; // Red - increase
              }
            }
          }
        });
      }

      // ===== LAST PAGE: LANDSCAPE YEAR-BY-YEAR BREAKDOWN =====

      pdf.addPage('a4', 'landscape');
      const landscapeWidth = pdf.internal.pageSize.getWidth();

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Year-by-Year Breakdown', 15, 15);

      // Build headers explicitly based on the active lists order to match Data Review
      const headers = ['Year'];

      // 1. Incomes
      const activeIncomeItems = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);
      activeIncomeItems.forEach(i => headers.push(i.name.substring(0, 25))); // Increased limit to avoid truncation

      // 2. Assets (displayed as inflows)
      const activeAssetItems = assets.filter(a => activeFilters[`asset-${a.id || a.name}`]);
      activeAssetItems.forEach(a => headers.push(a.name.substring(0, 25)));

      // 3. Costs
      const activeCostItems = costs.filter(c => activeFilters[`cost-${c.id || c.name}`]);
      activeCostItems.forEach(c => headers.push(c.name.substring(0, 25)));

      // 4. Debts (displayed as outflows)
      const activeDebtItems = debts.filter(d => activeFilters[`debt-${d.id || d.name}`]);
      activeDebtItems.forEach(d => headers.push(d.name.substring(0, 25)));

      headers.push('Annual Bal.');
      headers.push('Cumul. Bal.');

      // Build body data from projection
      const bodyData = projection.yearlyBreakdown.map(row => {
        const rowData = [row.year];

        // 1. Incomes
        activeIncomeItems.forEach(i => {
          const val = row.incomeBreakdown?.[i.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 2. Assets (stored in incomeBreakdown in calculation logic)
        activeAssetItems.forEach(a => {
          const val = row.incomeBreakdown?.[a.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 3. Costs (stored in costBreakdown)
        activeCostItems.forEach(c => {
          const val = row.costBreakdown?.[c.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // 4. Debts (stored in costBreakdown)
        activeDebtItems.forEach(d => {
          const val = row.costBreakdown?.[d.name] || 0;
          rowData.push(val > 0 ? formatNumber(val) : '');
        });

        // Balances
        rowData.push(formatNumber(row.annualBalance));
        rowData.push(formatNumber(row.cumulativeBalance));

        return rowData;
      });

      // Calculate boundaries for separators
      // Year is column 0
      const boundaryIncome = activeIncomeItems.length; // 0 (Year) + N incomes -> Last Income is at index N
      const boundaryAssets = boundaryIncome + activeAssetItems.length;
      const boundaryCosts = boundaryAssets + activeCostItems.length;
      const boundaryDebts = boundaryCosts + activeDebtItems.length;

      autoTable(pdf, {
        startY: 25,
        head: [headers],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], fontSize: 6, halign: 'right' },
        styles: { fontSize: 5, cellPadding: 1, halign: 'right' },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }
        },
        didDrawCell: function (data) {
          // Add thick colored vertical lines to separate sections
          if (data.section === 'body' || data.section === 'head') {
            const idx = data.column.index;
            // Draw line on the right edge of the cell if it's a boundary column
            if (idx === boundaryIncome || idx === boundaryAssets || idx === boundaryCosts || idx === boundaryDebts) {
              const doc = data.doc;
              doc.setDrawColor(59, 130, 246); // Blue color
              doc.setLineWidth(0.5); // Thicker line

              const x = data.cell.x + data.cell.width;
              const y = data.cell.y;
              const h = data.cell.height;

              doc.line(x, y, x, y + h);
            }
          }
        },
        didParseCell: function (data) {
          // Apply conditional formatting to the last two columns (Annual Bal. and Cumul. Bal.)
          const numColumns = headers.length;
          const annualBalColIndex = numColumns - 2;
          const cumulBalColIndex = numColumns - 1;

          if (data.section === 'body' && (data.column.index === annualBalColIndex || data.column.index === cumulBalColIndex)) {
            const rowIndex = data.row.index;
            const yearData = projection.yearlyBreakdown[rowIndex];

            if (yearData) {
              const value = data.column.index === annualBalColIndex ? yearData.annualBalance : yearData.cumulativeBalance;

              // Set text color based on positive/negative
              if (value >= 0) {
                data.cell.styles.textColor = [34, 197, 94]; // Green (green-500)
              } else {
                data.cell.styles.textColor = [239, 68, 68]; // Red (red-500)
              }
            }
          }
        }
      });

      // Save PDF
      pdf.save(`retirement-simulation-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(language === 'fr' ? 'Rapport PDF généré' : 'PDF report generated');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la génération du PDF' : 'Error generating PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Export to Excel
  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Can I Quit? - Retirement Simulation'],
        ['Generated:', new Date().toLocaleDateString()],
        [],
        ['Parameters'],
        ['Name:', `${userData?.firstName || ''} ${userData?.lastName || ''}`],
        ['Birth Date:', userData?.birthDate ? new Date(userData.birthDate).toLocaleDateString() : 'N/A'],
        ['Retirement Date:', new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate).toLocaleDateString()],
        ['Option:', scenarioData?.retirementOption || 'option1'],
        [],
        ['Results'],
        ['Final Balance (CHF):', Math.round(projection.finalBalance)],
        ['Status:', projection.canQuit ? 'Positive' : 'Negative']
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Projection Sheet
      const projectionData = projection.yearlyBreakdown.map(row => ({
        Year: row.year,
        Age: row.year - new Date(userData.birthDate).getFullYear(),
        'Total Income (CHF)': Math.round(row.income),
        'Total Costs (CHF)': Math.round(row.costs),
        'Net Result (CHF)': Math.round(row.annualBalance),
        'Cumulative Balance (CHF)': Math.round(row.cumulativeBalance)
      }));
      const wsProjection = XLSX.utils.json_to_sheet(projectionData);
      XLSX.utils.book_append_sheet(wb, wsProjection, 'Projection');

      // Incomes Sheet
      const activeIncomes = incomes.filter(i => activeFilters[`income-${i.id || i.name}`]);
      if (activeIncomes.length > 0) {
        const incomesData = activeIncomes.map(i => ({
          Name: i.name,
          'Amount (CHF)': Math.round(parseFloat(i.adjustedAmount || i.amount)),
          Frequency: i.frequency,
          'Start Date': i.startDate || '',
          'End Date': i.endDate || ''
        }));
        const wsIncomes = XLSX.utils.json_to_sheet(incomesData);
        XLSX.utils.book_append_sheet(wb, wsIncomes, 'Incomes');
      }

      // Costs Sheet
      const activeCosts = costs.filter(c => activeFilters[`cost-${c.id || c.name}`]);
      if (activeCosts.length > 0) {
        const costsData = activeCosts.map(c => ({
          Name: c.name,
          'Amount (CHF)': Math.round(parseFloat(c.adjustedAmount || c.amount)),
          Frequency: c.frequency,
          'Start Date': c.startDate || '',
          'End Date': c.endDate || ''
        }));
        const wsCosts = XLSX.utils.json_to_sheet(costsData);
        XLSX.utils.book_append_sheet(wb, wsCosts, 'Costs');
      }

      // Assets & Debts Sheet
      const activeAssets = assets.filter(a => activeFilters[`asset-${a.id || a.name}`]);
      const activeDebts = debts.filter(d => activeFilters[`debt-${d.id || d.name}`]);
      if (activeAssets.length > 0 || activeDebts.length > 0) {
        const assetsDebtsData = [
          ['Assets'],
          ['Name', 'Amount (CHF)', 'Category', 'Availability'],
          ...activeAssets.map(a => [
            a.name,
            Math.round(parseFloat(a.adjustedAmount || a.amount)),
            a.category || '',
            a.availabilityDate || a.availabilityTimeframe || ''
          ]),
          [],
          ['Debts'],
          ['Name', 'Amount (CHF)', 'Availability'],
          ...activeDebts.map(d => [
            d.name,
            Math.round(parseFloat(d.adjustedAmount || d.amount)),
            d.madeAvailableDate || d.madeAvailableTimeframe || ''
          ])
        ];
        const wsAssetsDebts = XLSX.utils.aoa_to_sheet(assetsDebtsData);
        XLSX.utils.book_append_sheet(wb, wsAssetsDebts, 'Assets & Debts');
      }

      // Write file
      XLSX.writeFile(wb, `retirement-simulation-${new Date().toISOString().split('T')[0]}.xlsx`);
      // toast.success(language === 'fr' ? 'Fichier Excel exporté' : 'Excel file exported'); // Assuming toast is defined elsewhere
    } catch (error) {
      console.error('Error exporting Excel:', error);
      // toast.error(language === 'fr' ? 'Erreur lors de l\'export Excel' : 'Error exporting Excel'); // Assuming toast is defined elsewhere
    }
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
      <div className="flex flex-col leading-tight w-full">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {item.strategy === 'Invested' && <LineChartIcon className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.5} />}
        </div>
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
        <div className="bg-gray-800 text-white p-3 rounded shadow-lg border border-gray-700 text-xs min-w-[600px]">
          {/* Header Row: Year left, Balances right */}
          <div className="flex justify-between items-center bg-gray-900/50 p-2 -mx-3 -mt-3 mb-2 border-b border-gray-700 rounded-t">
            <p className="font-bold text-sm text-gray-100 pl-1">{language === 'fr' ? `Année ${label}` : `Year ${label}`}</p>

            <div className="flex gap-4">
              <div className={`flex items-center gap-2 font-bold ${data.annualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span className="text-gray-400 font-normal">{language === 'fr' ? 'Annuel:' : 'Annual:'}</span>
                <span>{Math.round(data.annualBalance || (data.income - data.costs)).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-blue-300">
                <span className="text-gray-400 font-normal">{language === 'fr' ? 'Cumulé:' : 'Cumul:'}</span>
                <span>{Math.round(data.cumulativeBalance).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-2 mt-3">
            <div className="flex-1">
              <p className="font-semibold text-green-400 mb-1 border-b border-gray-600 pb-1">{language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)'}</p>
              {Object.entries(data.incomeBreakdown || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between gap-4">
                  <span>{name}</span>
                  <span>{Math.round(val).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{Math.round(data.income).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="font-semibold text-red-400 mb-1 border-b border-gray-600 pb-1">{language === 'fr' ? 'Dépenses (CHF)' : 'Costs (CHF)'}</p>
              {Object.entries(data.costBreakdown || {}).map(([name, val]) => (
                <div key={name} className="flex justify-between gap-4">
                  <span>{name}</span>
                  <span>{Math.round(val).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-gray-600 mt-1 pt-1 flex justify-between font-bold">
                <span>Total</span>
                <span>{Math.round(data.costs).toLocaleString()}</span>
              </div>
            </div>
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
    <div className="min-h-screen flex flex-col pt-6 pb-8 bg-background text-foreground" data-testid="scenario-result-page">
      <div className="w-full max-w-[95%] mx-auto mb-6 px-4">
      </div>

      <PageHeader
        title={language === 'fr' ? 'Résultats de la simulation' : 'Simulation results'}
        rightContent={
          <div className="flex gap-2">
            <Button
              onClick={generatePDF}
              variant="outline"
              size="sm"
              disabled={generatingPdf}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {language === 'fr' ? 'Générer rapport' : 'Generate report'}
            </Button>
            <Button
              onClick={exportExcel}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {language === 'fr' ? 'Exporter données' : 'Export data'}
            </Button>
          </div>
        }
      />

      <div className="max-w-[1600px] w-full mx-auto px-4">

        <div className="grid grid-cols-1 xl:grid-cols-[450px_1fr] gap-8">

          {/* LEFT COLUMN: Controls & Verdict */}
          <div className="space-y-6">

            {/* Verdict Card */}
            <Card className="overflow-hidden border-2 shadow-sm">
              <div className={`h-3 w-full ${projection.canQuit ? 'bg-green-500' : 'bg-red-500'}`} />
              <CardContent className="pt-6">
                {/* Simulation Description */}
                <div className="mb-4 text-sm text-gray-300 border-b border-gray-700 pb-4">
                  {(() => {
                    const option = scenarioData?.retirementOption || 'option1';
                    const retireDate = new Date(location.state?.wishedRetirementDate || scenarioData?.wishedRetirementDate);
                    // Calculates age based on birthday and retirement date
                    let age = '';
                    if (userData?.birthDate && retireDate) {
                      const birth = new Date(userData.birthDate);
                      const ageDate = new Date(retireDate - birth);
                      age = Math.abs(ageDate.getUTCFullYear() - 1970);
                    }

                    const dateStr = retireDate.toLocaleDateString('de-CH');

                    if (option === 'option0') { // Legal
                      return language === 'fr'
                        ? `Simulation à l'âge légal de la retraite le ${dateStr} (${age} ans)`
                        : `Simulation at legal retirement date ${dateStr} (${age} years old)`;
                    } else if (option === 'option2') { // Early
                      return language === 'fr'
                        ? `Simulation à la date de pré-retraite choisie le ${dateStr} (${age} ans)`
                        : `Simulation at chosen pre-retirement date ${dateStr} (${age} years old)`;
                    } else if (option === 'option1') { // Pick date
                      return language === 'fr'
                        ? `Simulation à la date choisie le ${dateStr} (${age} ans)`
                        : `Simulation at chosen date ${dateStr} (${age} years old)`;
                    } else if (option === 'option3') { // Earliest possible
                      return language === 'fr'
                        ? `Calcul de la date de retraite la plus tôt possible: ${dateStr} (${age} ans)`
                        : `Calculation of earliest retirement date possible: ${dateStr} (${age} years old)`;
                    }
                    return '';
                  })()}
                </div>

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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { toggleAll(incomes, 'income', true); toggleAll(retirementData?.rows || [], 'pillar', true); }} className="h-6 text-xs px-2">All</Button>
                      <Button variant="ghost" size="sm" onClick={() => { toggleAll(incomes, 'income', false); toggleAll(retirementData?.rows || [], 'pillar', false); }} className="h-6 text-xs px-2">None</Button>
                    </div>
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleAll(assets, 'asset', true)} className="h-6 text-xs px-2">All</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleAll(assets, 'asset', false)} className="h-6 text-xs px-2">None</Button>
                      </div>
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(costs, 'cost', true)} className="h-6 text-xs px-2">All</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(costs, 'cost', false)} className="h-6 text-xs px-2">None</Button>
                    </div>
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
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleAll(debts, 'debt', true)} className="h-6 text-xs px-2">All</Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleAll(debts, 'debt', false)} className="h-6 text-xs px-2">None</Button>
                      </div>
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
          <div className="space-y-6">

            {/* Graph */}
            <Card className="h-[615px]">
              <CardHeader>
                <CardTitle>{language === 'fr' ? 'Projection Financière en CHF' : 'Financial Projection in CHF'}</CardTitle>
              </CardHeader>
              <CardContent className="h-[545px]">
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
                    <YAxis
                      tick={({ x, y, payload }) => (
                        <text x={x} y={y} dy={4} textAnchor="end" fill={payload.value === 0 ? "#ffffff" : "#888888"} fontSize={12}>
                          {payload.value === 0 ? "0k" : `${(payload.value / 1000).toFixed(0)}k`}
                        </text>
                      )}
                    />
                    <ReferenceLine y={0} stroke="#FFFFFF" strokeWidth={2} />
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
