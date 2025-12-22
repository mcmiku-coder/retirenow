import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate PDF Report for Retirement Planning
 * Light mode, with landscape annex table
 */
export const generatePDFReport = (data, t, language) => {
  const {
    userData,
    retirementData,
    scenarioData,
    resultData,
    yearlyBreakdown
  } = data;

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors for light mode
  const primaryColor = [220, 53, 69]; // Red accent
  const textColor = [33, 33, 33];
  const grayColor = [100, 100, 100];
  const greenColor = [40, 167, 69];
  const redColor = [220, 53, 69];

  // Helper functions
  const addTitle = (text, size = 18) => {
    doc.setFontSize(size);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, yPos);
    yPos += size * 0.5;
  };

  const addSubtitle = (text, size = 14) => {
    doc.setFontSize(size);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, yPos);
    yPos += size * 0.4;
  };

  const addText = (label, value, indent = 0) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(label + ':', margin + indent, yPos);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 60 + indent, yPos);
    yPos += 6;
  };

  const addSpacer = (height = 10) => {
    yPos += height;
  };

  const checkPageBreak = (neededSpace = 30) => {
    if (yPos + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'CHF 0';
    return `CHF ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // ==========================================
  // PAGE 1: Title & Personal Information
  // ==========================================
  
  // Title
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('quit?', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  
  doc.setFontSize(14);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  const subtitle = language === 'fr' ? 'Rapport de planification de retraite' : 'Retirement Planning Report';
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  doc.setFontSize(10);
  const generatedText = language === 'fr' ? 'Généré le' : 'Generated on';
  doc.text(`${generatedText}: ${formatDate(new Date().toISOString())}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Personal Information Section
  addTitle(language === 'fr' ? 'Informations personnelles' : 'Personal Information');
  addSpacer(5);
  
  if (userData) {
    addText(language === 'fr' ? 'Date de naissance' : 'Birth Date', formatDate(userData.birthDate));
    addText(language === 'fr' ? 'Genre' : 'Gender', 
      userData.gender === 'male' ? (language === 'fr' ? 'Homme' : 'Male') : (language === 'fr' ? 'Femme' : 'Female'));
    addText(language === 'fr' ? 'Pays' : 'Country', 
      userData.residence === 'Switzerland' ? (language === 'fr' ? 'Suisse' : 'Switzerland') : 'France');
  }
  addSpacer(15);

  // ==========================================
  // Retirement Overview Section
  // ==========================================
  addTitle(language === 'fr' ? 'Aperçu de la retraite' : 'Retirement Overview');
  addSpacer(5);
  
  if (retirementData || userData) {
    const retirementLegalDate = retirementData?.retirement_legal_date || userData?.retirementLegalDate;
    const theoreticalDeathDate = retirementData?.theoretical_death_date || userData?.theoreticalDeathDate;
    const lifeExpectancy = retirementData?.life_expectancy_years || userData?.lifeExpectancyYears;
    
    addText(language === 'fr' ? 'Date de retraite légale' : 'Legal Retirement Date', formatDate(retirementLegalDate));
    addText(language === 'fr' ? 'Espérance de vie' : 'Life Expectancy', 
      `${Math.round(lifeExpectancy || 0)} ${language === 'fr' ? 'ans' : 'years'}`);
    addText(language === 'fr' ? 'Date de fin théorique' : 'Theoretical End Date', formatDate(theoreticalDeathDate));
  }
  addSpacer(15);

  // ==========================================
  // Scenario Simulator Section
  // ==========================================
  checkPageBreak(60);
  addTitle(language === 'fr' ? 'Paramètres du scénario' : 'Scenario Parameters');
  addSpacer(5);
  
  if (scenarioData || resultData) {
    addText(language === 'fr' ? 'Date de retraite souhaitée' : 'Wished Retirement Date', 
      formatDate(scenarioData?.wishedRetirementDate || resultData?.wishedRetirementDate));
    addText(language === 'fr' ? 'Actifs liquides' : 'Liquid Assets', 
      formatCurrency(scenarioData?.liquidAssets || resultData?.liquidAssets || 0));
    addText(language === 'fr' ? 'Actifs non liquides' : 'Non-Liquid Assets', 
      formatCurrency(scenarioData?.nonLiquidAssets || resultData?.nonLiquidAssets || 0));
    addText(language === 'fr' ? 'Transmission/Héritage' : 'Transmission/Inheritance', 
      formatCurrency(scenarioData?.transmissionAmount || resultData?.transmissionAmount || 0));
  }
  addSpacer(15);

  // ==========================================
  // Income Sources Table
  // ==========================================
  checkPageBreak(50);
  addSubtitle(language === 'fr' ? 'Sources de revenus' : 'Income Sources');
  addSpacer(5);
  
  if (resultData?.adjustedIncomes && resultData.adjustedIncomes.length > 0) {
    const incomeHeaders = [
      language === 'fr' ? 'Nom' : 'Name',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Fréquence' : 'Frequency'
    ];
    
    const incomeRows = resultData.adjustedIncomes.map(inc => [
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
      headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [33, 33, 33] },
      alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // ==========================================
  // Costs Table
  // ==========================================
  checkPageBreak(50);
  addSubtitle(language === 'fr' ? 'Dépenses' : 'Costs');
  addSpacer(5);
  
  if (resultData?.adjustedCosts && resultData.adjustedCosts.length > 0) {
    const costHeaders = [
      language === 'fr' ? 'Nom' : 'Name',
      language === 'fr' ? 'Catégorie' : 'Category',
      language === 'fr' ? 'Montant' : 'Amount',
      language === 'fr' ? 'Fréquence' : 'Frequency'
    ];
    
    const costRows = resultData.adjustedCosts.map(cost => [
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
      headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: [33, 33, 33] },
      alternateRowStyles: { fillColor: [248, 249, 250] }
    });
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // ==========================================
  // VERDICT PAGE
  // ==========================================
  doc.addPage();
  yPos = margin;
  
  addTitle(language === 'fr' ? 'Verdict' : 'Verdict', 22);
  addSpacer(10);
  
  const canQuit = resultData?.canQuit || (resultData?.finalBalance >= 0);
  const finalBalance = resultData?.finalBalance || resultData?.balance || 0;
  
  // Verdict box
  doc.setFillColor(canQuit ? 40 : 220, canQuit ? 167 : 53, canQuit ? 69 : 69);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  const verdictText = canQuit 
    ? (language === 'fr' ? 'OUI VOUS POUVEZ ! PARTEZ !' : 'YES YOU CAN! QUIT!')
    : (language === 'fr' ? 'NON VOUS NE POUVEZ PAS ENCORE PARTIR !' : 'NO YOU CANNOT QUIT YET!');
  doc.text(verdictText, pageWidth / 2, yPos + 12, { align: 'center' });
  
  doc.setFontSize(14);
  const balanceText = `${language === 'fr' ? 'Solde final' : 'Final Balance'}: ${formatCurrency(finalBalance)}`;
  doc.text(balanceText, pageWidth / 2, yPos + 22, { align: 'center' });
  yPos += 45;
  
  // Transmission info if applicable
  if (resultData?.transmissionAmount > 0) {
    doc.setFontSize(11);
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    const beforeText = language === 'fr' ? 'Solde avant transmission' : 'Balance before transmission';
    const afterText = language === 'fr' ? 'Montant à transmettre' : 'Amount to transmit';
    doc.text(`${beforeText}: ${formatCurrency(resultData.balanceBeforeTransmission)}`, margin, yPos);
    yPos += 6;
    doc.text(`${afterText}: ${formatCurrency(resultData.transmissionAmount)}`, margin, yPos);
    yPos += 15;
  }

  // ==========================================
  // ANNEX: Landscape Year-by-Year Table
  // ==========================================
  doc.addPage('landscape');
  yPos = margin;
  
  const landscapeWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  const annexTitle = language === 'fr' ? 'Annexe: Projection financière détaillée' : 'Annex: Detailed Financial Projection';
  doc.text(annexTitle, margin, yPos);
  yPos += 12;
  
  if (yearlyBreakdown && yearlyBreakdown.length > 0) {
    // Collect all unique income and cost categories
    const incomeCategories = new Set();
    const costCategories = new Set();
    
    yearlyBreakdown.forEach(year => {
      if (year.incomeBreakdown) {
        Object.keys(year.incomeBreakdown).forEach(cat => incomeCategories.add(cat));
      }
      if (year.costBreakdown) {
        Object.keys(year.costBreakdown).forEach(cat => costCategories.add(cat));
      }
    });
    
    const incomeCatArray = Array.from(incomeCategories);
    const costCatArray = Array.from(costCategories);
    
    // Build headers: Year | Income Categories... | Cost Categories... | Annual Balance | Cumulative Balance
    const headers = [
      language === 'fr' ? 'Année' : 'Year',
      ...incomeCatArray.map(cat => `${language === 'fr' ? 'Rev.' : 'Inc.'} ${cat}`),
      ...costCatArray.map(cat => `${language === 'fr' ? 'Dép.' : 'Cost'} ${cat}`),
      language === 'fr' ? 'Solde annuel' : 'Annual Balance',
      language === 'fr' ? 'Solde cumulé' : 'Running Balance'
    ];
    
    // Build rows
    const rows = yearlyBreakdown.map(year => {
      const row = [year.year.toString()];
      
      // Income by category
      incomeCatArray.forEach(cat => {
        const value = year.incomeBreakdown?.[cat] || 0;
        row.push(value > 0 ? formatCurrency(value) : '-');
      });
      
      // Cost by category
      costCatArray.forEach(cat => {
        const value = year.costBreakdown?.[cat] || 0;
        row.push(value > 0 ? formatCurrency(value) : '-');
      });
      
      // Annual and cumulative balance
      row.push(formatCurrency(year.annualBalance));
      row.push(formatCurrency(year.cumulativeBalance));
      
      return row;
    });
    
    // Calculate column widths
    const availableWidth = landscapeWidth - 2 * margin;
    const numCols = headers.length;
    const colWidth = Math.min(availableWidth / numCols, 35);
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 53, 69], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 2
      },
      bodyStyles: { 
        textColor: [33, 33, 33],
        fontSize: 7,
        cellPadding: 2
      },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { cellWidth: 15 }, // Year column
      },
      didParseCell: function(data) {
        // Color negative balances red
        if (data.section === 'body') {
          const colIndex = data.column.index;
          const isBalanceCol = colIndex === headers.length - 1 || colIndex === headers.length - 2;
          if (isBalanceCol) {
            const cellText = data.cell.raw;
            if (cellText && cellText.includes('-')) {
              data.cell.styles.textColor = [220, 53, 69];
            }
          }
        }
      }
    });
  }
  
  // Save the PDF
  const fileName = language === 'fr' ? 'rapport_retraite_quit.pdf' : 'retirement_report_quit.pdf';
  doc.save(fileName);
  
  return true;
};

export default generatePDFReport;
