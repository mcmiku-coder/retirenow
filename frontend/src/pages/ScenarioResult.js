import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getIncomeData, getCostData, getUserData, getScenarioData } from '../utils/database';
import { calculateYearlyAmount } from '../utils/calculations';
import { toast } from 'sonner';
import { NavigationButtons } from '../components/NavigationButtons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ScenarioResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, password, logout } = useAuth();
  const { t, language } = useLanguage();
  const [result, setResult] = useState(null);
  const [yearlyBreakdown, setYearlyBreakdown] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [userData, setUserData] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const loadAdditionalData = async () => {
      const uData = await getUserData(user.email, password);
      const sData = await getScenarioData(user.email, password);
      setUserData(uData);
      setScenarioData(sData);
    };
    loadAdditionalData();
  }, [user, password, navigate]);

  useEffect(() => {
    if (!user || !password) {
      navigate('/');
      return;
    }

    const determineResult = async () => {
      try {
        // Check if we have simulation data from Scenario page
        if (location.state && location.state.yearlyBreakdown) {
          // Use the breakdown data directly from simulation
          setYearlyBreakdown(location.state.yearlyBreakdown);
          setResult({
            canQuit: location.state.finalBalance >= 0,
            balance: location.state.finalBalance,
            balanceBeforeTransmission: location.state.balanceBeforeTransmission,
            transmissionAmount: location.state.transmissionAmount || 0,
            wishedRetirementDate: location.state.wishedRetirementDate,
            fromSimulation: true
          });
        } else {
          // Fallback: calculate from original data if accessed directly
          const userData = await getUserData(user.email, password);
          const incomeData = await getIncomeData(user.email, password) || [];
          const costData = await getCostData(user.email, password) || [];

          if (!userData) {
            navigate('/personal-info');
            return;
          }

          const currentYear = new Date().getFullYear();
          const birthDate = new Date(userData.birthDate);
          
          // Use the theoretical death date from API
          let deathYear;
          if (userData.theoreticalDeathDate) {
            deathYear = new Date(userData.theoreticalDeathDate).getFullYear();
          } else {
            // Fallback to approximation if not available
            const approximateLifeExpectancy = userData.gender === 'male' ? 80 : 85;
            deathYear = birthDate.getFullYear() + approximateLifeExpectancy;
          }

          const breakdown = [];
          let cumulativeBalance = 0;

          for (let year = currentYear; year <= deathYear; year++) {
            let yearIncome = 0;
            let yearCosts = 0;
            const incomeBreakdown = {};
            const costBreakdown = {};

            incomeData.filter(row => row.amount).forEach(row => {
              const amount = parseFloat(row.amount) || 0;
              const yearlyAmount = calculateYearlyAmount(
                amount,
                row.frequency,
                row.startDate,
                row.endDate,
                year
              );
              
              if (yearlyAmount > 0) {
                yearIncome += yearlyAmount;
                incomeBreakdown[row.name] = yearlyAmount;
              }
            });

            costData.filter(row => row.amount).forEach(row => {
              const amount = parseFloat(row.amount) || 0;
              const yearlyAmount = calculateYearlyAmount(
                amount,
                row.frequency,
                row.startDate,
                row.endDate,
                year
              );
              
              if (yearlyAmount > 0) {
                yearCosts += yearlyAmount;
                const category = row.category || row.name || 'Other';
                costBreakdown[category] = (costBreakdown[category] || 0) + yearlyAmount;
              }
            });

            const annualBalance = yearIncome - yearCosts;
            cumulativeBalance += annualBalance;

            breakdown.push({
              year,
              income: yearIncome,
              costs: yearCosts,
              annualBalance,
              cumulativeBalance,
              incomeBreakdown,
              costBreakdown
            });
          }

          setYearlyBreakdown(breakdown);
          
          setResult({
            canQuit: cumulativeBalance >= 0,
            balance: cumulativeBalance,
            fromSimulation: false
          });
        }
      } catch (error) {
        toast.error(t('common.error'));
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    determineResult();
  }, [user, password, navigate, location, t]);

  const handleReset = () => {
    // Navigate to personal info to start over (keep user logged in)
    navigate('/personal-info');
  };

  // PDF Generation Function - Light/Clear Mode
  const generatePDF = async () => {
    setGeneratingPdf(true);
    toast.info(language === 'fr' ? 'Génération du PDF...' : 'Generating PDF...');
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = 20;
      
      // Helper function for formatting currency
      const formatCurrency = (val) => `CHF ${Math.round(val || 0).toLocaleString()}`;
      
      // Helper function to check page break
      const checkPageBreak = (needed = 30) => {
        if (yPos + needed > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      };
      
      // ============================
      // PAGE 1: Title & Personal Info
      // ============================
      
      // Title
      doc.setFontSize(28);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text('quit?', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(language === 'fr' ? 'Rapport de planification de retraite' : 'Retirement Planning Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      doc.setFontSize(10);
      doc.text(`${language === 'fr' ? 'Généré le' : 'Generated on'}: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 18;
      
      // Personal Information Section
      doc.setFontSize(16);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Informations personnelles' : 'Personal Information', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.setFont('helvetica', 'normal');
      if (userData) {
        doc.text(`${language === 'fr' ? 'Date de naissance' : 'Birth Date'}: ${userData.birthDate || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`${language === 'fr' ? 'Genre' : 'Gender'}: ${userData.gender === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female')}`, margin, yPos);
        yPos += 6;
        doc.text(`${language === 'fr' ? 'Pays' : 'Country'}: ${userData.residence || 'N/A'}`, margin, yPos);
        yPos += 14;
      }
      
      // Retirement Overview Section
      doc.setFontSize(16);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Aperçu de la retraite' : 'Retirement Overview', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.setFont('helvetica', 'normal');
      if (userData) {
        doc.text(`${language === 'fr' ? 'Date de retraite légale' : 'Legal Retirement Date'}: ${userData.retirementLegalDate || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`${language === 'fr' ? 'Espérance de vie' : 'Life Expectancy'}: ${userData.lifeExpectancyYears ? Math.round(userData.lifeExpectancyYears) + (language === 'fr' ? ' ans' : ' years') : 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`${language === 'fr' ? 'Date de fin théorique' : 'Theoretical End Date'}: ${userData.theoreticalDeathDate || 'N/A'}`, margin, yPos);
        yPos += 14;
      }
      
      // Scenario Parameters Section
      doc.setFontSize(16);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Paramètres du scénario' : 'Scenario Parameters', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.setFont('helvetica', 'normal');
      const wishedDate = scenarioData?.wishedRetirementDate || result?.wishedRetirementDate;
      const liquidAssets = scenarioData?.liquidAssets || location.state?.liquidAssets || 0;
      const nonLiquidAssets = scenarioData?.nonLiquidAssets || location.state?.nonLiquidAssets || 0;
      const transmissionAmt = scenarioData?.transmissionAmount || result?.transmissionAmount || 0;
      
      doc.text(`${language === 'fr' ? 'Date de retraite souhaitée' : 'Wished Retirement Date'}: ${wishedDate || 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`${language === 'fr' ? 'Actifs liquides' : 'Liquid Assets'}: ${formatCurrency(liquidAssets)}`, margin, yPos);
      yPos += 6;
      doc.text(`${language === 'fr' ? 'Actifs non liquides' : 'Non-Liquid Assets'}: ${formatCurrency(nonLiquidAssets)}`, margin, yPos);
      yPos += 6;
      doc.text(`${language === 'fr' ? 'Transmission/Héritage' : 'Transmission/Inheritance'}: ${formatCurrency(transmissionAmt)}`, margin, yPos);
      yPos += 14;
      
      // Income Sources Table
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Sources de revenus' : 'Income Sources', margin, yPos);
      yPos += 8;
      
      const adjustedIncomes = location.state?.adjustedIncomes || [];
      if (adjustedIncomes.length > 0) {
        const incomeHeaders = [
          language === 'fr' ? 'Nom' : 'Name',
          language === 'fr' ? 'Montant' : 'Amount',
          language === 'fr' ? 'Fréquence' : 'Frequency'
        ];
        const incomeRows = adjustedIncomes.map(inc => [
          inc.name,
          formatCurrency(inc.adjustedAmount || inc.amount),
          inc.frequency === 'Monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') :
          inc.frequency === 'Yearly' ? (language === 'fr' ? 'Annuel' : 'Yearly') :
          (language === 'fr' ? 'Unique' : 'One-time')
        ]);
        
        doc.autoTable({
          head: [incomeHeaders],
          body: incomeRows,
          startY: yPos,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { textColor: [33, 33, 33], fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 249, 250] }
        });
        yPos = doc.lastAutoTable.finalY + 12;
      }
      
      // Costs Table
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Dépenses' : 'Costs', margin, yPos);
      yPos += 8;
      
      const adjustedCosts = location.state?.adjustedCosts || [];
      if (adjustedCosts.length > 0) {
        const costHeaders = [
          language === 'fr' ? 'Nom' : 'Name',
          language === 'fr' ? 'Catégorie' : 'Category',
          language === 'fr' ? 'Montant' : 'Amount',
          language === 'fr' ? 'Fréquence' : 'Frequency'
        ];
        const costRows = adjustedCosts.map(cost => [
          cost.name,
          cost.category || '-',
          formatCurrency(cost.adjustedAmount || cost.amount),
          cost.frequency === 'Monthly' ? (language === 'fr' ? 'Mensuel' : 'Monthly') :
          cost.frequency === 'Yearly' ? (language === 'fr' ? 'Annuel' : 'Yearly') :
          (language === 'fr' ? 'Unique' : 'One-time')
        ]);
        
        doc.autoTable({
          head: [costHeaders],
          body: costRows,
          startY: yPos,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { textColor: [33, 33, 33], fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 249, 250] }
        });
        yPos = doc.lastAutoTable.finalY + 12;
      }
      
      // ============================
      // VERDICT PAGE
      // ============================
      doc.addPage();
      yPos = 25;
      
      doc.setFontSize(18);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Verdict' : 'Verdict', margin, yPos);
      yPos += 15;
      
      // Verdict box
      const canQuit = result?.canQuit;
      doc.setFillColor(canQuit ? 40 : 220, canQuit ? 167 : 53, canQuit ? 69 : 69);
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      const verdictText = canQuit 
        ? (language === 'fr' ? 'OUI VOUS POUVEZ ! PARTEZ !' : 'YES YOU CAN! QUIT!')
        : (language === 'fr' ? 'NON VOUS NE POUVEZ PAS ENCORE PARTIR !' : 'NO YOU CANNOT QUIT YET!');
      doc.text(verdictText, pageWidth / 2, yPos + 10, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`${language === 'fr' ? 'Solde final' : 'Final Balance'}: ${formatCurrency(result?.balance)}`, pageWidth / 2, yPos + 18, { align: 'center' });
      yPos += 40;
      
      // Transmission info
      if (result?.transmissionAmount > 0) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`${language === 'fr' ? 'Solde avant transmission' : 'Balance before transmission'}: ${formatCurrency(result.balanceBeforeTransmission)}`, margin, yPos);
        yPos += 6;
        doc.text(`${language === 'fr' ? 'Montant à transmettre' : 'Amount to transmit'}: ${formatCurrency(result.transmissionAmount)}`, margin, yPos);
        yPos += 12;
      }
      
      doc.setFontSize(11);
      doc.setTextColor(33, 33, 33);
      doc.setFont('helvetica', 'normal');
      const message = canQuit
        ? (language === 'fr' ? 'Votre solde projeté est positif ! Vous avez les bases financières pour envisager la retraite.' : 'Your projected balance is positive! You have the financial foundation to consider retirement.')
        : (language === 'fr' ? 'Votre solde projeté est négatif. Envisagez d\'ajuster votre plan financier ou votre date de retraite.' : 'Your projected balance is negative. Consider adjusting your financial plan or retirement date.');
      const splitMessage = doc.splitTextToSize(message, pageWidth - 2 * margin);
      doc.text(splitMessage, margin, yPos);
      
      // ============================
      // ANNEX PAGE: Landscape Year-by-Year Table
      // ============================
      doc.addPage('a4', 'landscape');
      const landscapeWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(16);
      doc.setTextColor(220, 53, 69);
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'fr' ? 'Annexe: Projection financière détaillée' : 'Annex: Detailed Financial Projection', margin, 20);
      
      // Collect all unique income and cost categories
      const allIncomeCategories = new Set();
      const allCostCategories = new Set();
      
      yearlyBreakdown.forEach(year => {
        Object.keys(year.incomeBreakdown || {}).forEach(cat => allIncomeCategories.add(cat));
        Object.keys(year.costBreakdown || {}).forEach(cat => allCostCategories.add(cat));
      });
      
      const incomeColumns = Array.from(allIncomeCategories);
      const costColumns = Array.from(allCostCategories);
      
      // Build table headers with categories
      const headers = [
        ...incomeColumns.map(c => (language === 'fr' ? 'Rev. ' : 'Inc. ') + c.substring(0, 8)),
        ...costColumns.map(c => (language === 'fr' ? 'Dép. ' : 'Cost ') + c.substring(0, 8)),
        language === 'fr' ? 'Année' : 'Year',
        language === 'fr' ? 'Solde cumulé' : 'Running Balance'
      ];
      
      // Build table rows
      const tableData = yearlyBreakdown.map(year => {
        const row = [
          ...incomeColumns.map(cat => {
            const val = year.incomeBreakdown?.[cat];
            return val ? Math.round(val).toLocaleString() : '-';
          }),
          ...costColumns.map(cat => {
            const val = year.costBreakdown?.[cat];
            return val ? Math.round(val).toLocaleString() : '-';
          }),
          year.year,
          Math.round(year.cumulativeBalance).toLocaleString()
        ];
        return row;
      });
      
      // Add table using autoTable
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 30,
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [220, 53, 69], textColor: 255, fontSize: 6, fontStyle: 'bold' },
        bodyStyles: { textColor: [33, 33, 33] },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          [headers.length - 2]: { cellWidth: 12, fontStyle: 'bold' }, // Year column
          [headers.length - 1]: { cellWidth: 25, fontStyle: 'bold' }  // Running balance column
        },
        didParseCell: function(data) {
          // Color negative running balance red
          if (data.section === 'body' && data.column.index === headers.length - 1) {
            const cellText = String(data.cell.raw);
            if (cellText.startsWith('-')) {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        },
        didDrawPage: function(data) {
          // Footer with page number
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, landscapeWidth - 20, doc.internal.pageSize.getHeight() - 10);
        }
      });
      
      // Save PDF
      const fileName = language === 'fr' ? `rapport_retraite_quit_${new Date().toISOString().split('T')[0]}.pdf` : `retirement_report_quit_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success(language === 'fr' ? 'Rapport PDF généré avec succès!' : 'PDF Report generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la génération du PDF' : 'Error generating PDF');
    } finally {
      setGeneratingPdf(false);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4" data-testid="scenario-result-page">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" data-testid="page-title">{t('result.title')}</h1>
            <p className="text-muted-foreground" data-testid="page-subtitle">
              {t('result.subtitle')}
            </p>
          </div>
          <NavigationButtons backPath="/scenario" />
        </div>

        {result && (
          <div className="space-y-6">
            <Card className="mb-8 overflow-hidden">
              <div className="max-w-[200px] mx-auto p-4">
                <img
                  src={result.canQuit ? '/yes_quit.png' : '/no_quit.png'}
                  alt={result.canQuit ? 'Yes you can quit!' : 'No you cannot quit yet!'}
                  className="w-full h-auto object-cover rounded-lg"
                  data-testid="result-image"
                />
              </div>
              <div className="p-8 text-center">
                <p className={`text-xl mb-4 ${result.canQuit ? 'text-green-500 font-bold text-3xl' : 'text-muted-foreground'}`} data-testid="result-message">
                  {result.canQuit ? t('result.yesCanQuit') : t('result.noCannotQuit')}
                </p>
                <p className="text-xl text-muted-foreground mb-2">
                  {result.fromSimulation ? t('result.projectedBalance') : t('result.annualBalance')}
                  <span className={`font-bold ml-2 ${result.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="result-balance">
                    {result.balance >= 0 ? '+' : ''}
                    CHF {result.balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
                {result.transmissionAmount > 0 && (
                  <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <p className="text-amber-400 text-sm font-medium">
                      {t('result.transmissionPlanned')}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {t('result.balanceBeforeTransmission')}: CHF {result.balanceBeforeTransmission?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-amber-400 text-sm">
                      {t('result.amountToTransmit')}: CHF {result.transmissionAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
                {result.wishedRetirementDate && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {t('result.basedOnRetirement')}: {new Date(result.wishedRetirementDate).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-6">
                  {result.canQuit 
                    ? t('result.positiveMessage')
                    : t('result.negativeMessage')}
                </p>
              </div>
            </Card>

            {yearlyBreakdown.length > 0 && (
              <>
                {/* Financial Projection Graph */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('result.projectionGraph')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={yearlyBreakdown}>
                        <defs>
                          <linearGradient id="colorCumulativeResult" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="year" 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                        />
                        <YAxis 
                          stroke="#9ca3af"
                          tick={{ fill: '#9ca3af' }}
                          tickFormatter={(value) => `CHF ${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}
                          labelStyle={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length > 0) {
                              const data = payload[0].payload;
                              return (
                                <div style={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px' }}>
                                  <div style={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '8px' }}>Year {data.year}</div>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <div style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>
                                      Annual Balance: CHF {data.annualBalance.toLocaleString()}
                                    </div>
                                    <div style={{ color: '#10b981', fontWeight: '600' }}>
                                      Cumulative Balance: CHF {Math.round(data.cumulativeBalance).toLocaleString()}
                                    </div>
                                  </div>
                                  
                                  <div style={{ marginBottom: '6px', paddingTop: '8px', borderTop: '1px solid #374151' }}>
                                    <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
                                      Income: CHF {data.income.toLocaleString()}
                                    </div>
                                    {data.incomeBreakdown && Object.entries(data.incomeBreakdown).map(([name, value]) => (
                                      <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                        • {name}: CHF {value.toLocaleString()}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div style={{ paddingTop: '6px', borderTop: '1px solid #374151' }}>
                                    <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                                      Costs: CHF {data.costs.toLocaleString()}
                                    </div>
                                    {data.costBreakdown && Object.entries(data.costBreakdown).map(([name, value]) => (
                                      <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                        • {name}: CHF {value.toLocaleString()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="cumulativeBalance" 
                          stroke="#10b981" 
                          fillOpacity={1} 
                          fill="url(#colorCumulativeResult)"
                          name="Cumulative Balance"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="annualBalance" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Annual Balance"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Year-by-Year Breakdown Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('result.yearlyBreakdown')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-semibold">{t('result.year')}</th>
                            <th className="text-right p-3 font-semibold">{t('result.income')}</th>
                            <th className="text-right p-3 font-semibold">{t('result.costs')}</th>
                            <th className="text-right p-3 font-semibold">{t('result.annualBalance')}</th>
                            <th className="text-right p-3 font-semibold">{t('result.cumulativeBalance')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {yearlyBreakdown.map((row, index) => (
                            <tr 
                              key={row.year} 
                              className={`border-b ${row.annualBalance < 0 ? 'bg-red-500/5' : ''} hover:bg-muted/30 cursor-pointer relative`}
                              onMouseEnter={() => setHoveredRow(index)}
                              onMouseLeave={() => setHoveredRow(null)}
                            >
                              <td className="p-3 font-medium">{row.year}</td>
                              <td className="text-right p-3 text-green-500">
                                CHF {row.income.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="text-right p-3 text-red-500">
                                CHF {row.costs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className={`text-right p-3 font-semibold ${row.annualBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {row.annualBalance >= 0 ? '+' : ''}CHF {row.annualBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className={`text-right p-3 font-bold ${row.cumulativeBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {row.cumulativeBalance >= 0 ? '+' : ''}CHF {row.cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              
                              {/* Hover Tooltip */}
                              {hoveredRow === index && (
                                <td className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 z-50">
                                  <div style={{ 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151', 
                                    borderRadius: '8px', 
                                    padding: '12px',
                                    minWidth: '300px',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                  }}>
                                    <div style={{ color: '#f3f4f6', fontWeight: 'bold', marginBottom: '8px' }}>Year {row.year}</div>
                                    
                                    <div style={{ marginBottom: '8px' }}>
                                      <div style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>
                                        Annual Balance: CHF {row.annualBalance.toLocaleString()}
                                      </div>
                                      <div style={{ color: '#10b981', fontWeight: '600' }}>
                                        Cumulative Balance: CHF {Math.round(row.cumulativeBalance).toLocaleString()}
                                      </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: '6px', paddingTop: '8px', borderTop: '1px solid #374151' }}>
                                      <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
                                        Income: CHF {row.income.toLocaleString()}
                                      </div>
                                      {row.incomeBreakdown && Object.entries(row.incomeBreakdown).map(([name, value]) => (
                                        <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                          • {name}: CHF {value.toLocaleString()}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    <div style={{ paddingTop: '6px', borderTop: '1px solid #374151' }}>
                                      <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                                        Costs: CHF {row.costs.toLocaleString()}
                                      </div>
                                      {row.costBreakdown && Object.entries(row.costBreakdown).map(([name, value]) => (
                                        <div key={name} style={{ color: '#9ca3af', fontSize: '11px', marginLeft: '8px' }}>
                                          • {name}: CHF {value.toLocaleString()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <Button
            data-testid="generate-pdf-btn"
            onClick={generatePDF}
            variant="outline"
            className="flex-1"
            disabled={generatingPdf}
          >
            {generatingPdf 
              ? (language === 'fr' ? 'Génération en cours...' : 'Generating...') 
              : (language === 'fr' ? 'Générer le rapport PDF' : 'Generate PDF Report')}
          </Button>
          <Button
            data-testid="start-over-btn"
            onClick={handleReset}
            className="flex-1"
          >
            {t('result.startOver')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScenarioResult;
