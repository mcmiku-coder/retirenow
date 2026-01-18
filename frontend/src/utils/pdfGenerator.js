import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Helper function to format numbers without special characters
const formatNumber = (num) => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

// Helper to format dates
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

export const generateComprehensivePDF = async ({
  userData,
  scenarioData,
  location,
  projection,
  incomes,
  costs,
  assets,
  debts,
  activeFilters,
  language
}) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

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
  pdf.text(lines, 15, yPosition);
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
      head: [['Name', 'Original Value', 'Adjusted Value', 'Frequency', 'Start Date', 'End Date', 'Cluster Tag']],
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
      styles: { fontSize: 7 }
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
      head: [['Name', 'Original Value', 'Adjusted Value', 'Category', 'Preserve', 'Availability Type', 'Availability Details', 'Strategy', 'Cluster Tag']],
      body: activeAssets.map(a => [
        a.name,
        formatNumber(parseFloat(a.amount)),
        formatNumber(parseFloat(a.adjustedAmount || a.amount)),
        a.category || '',
        a.preserve || '',
        a.availabilityType || '',
        a.availabilityDate || a.availabilityTimeframe || '',
        a.strategy || '',
        a.clusterTag || ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], fontSize: 7 },
      styles: { fontSize: 6 }
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
      head: [['Name', 'Original Value', 'Adjusted Value', 'Frequency', 'Start Date', 'End Date', 'Cluster Tag']],
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
      styles: { fontSize: 7 }
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
      head: [['Name', 'Original Value', 'Adjusted Value', 'Availability Type', 'Availability Details', 'Cluster Tag']],
      body: activeDebts.map(d => [
        d.name,
        formatNumber(parseFloat(d.amount)),
        formatNumber(parseFloat(d.adjustedAmount || d.amount)),
        d.madeAvailableType || '',
        d.madeAvailableDate || d.madeAvailableTimeframe || '',
        d.clusterTag || ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], fontSize: 8 },
      styles: { fontSize: 7 }
    });
  }

  // ===== LAST PAGE: LANDSCAPE YEAR-BY-YEAR BREAKDOWN =====

  pdf.addPage('a4', 'landscape');
  const landscapeWidth = pdf.internal.pageSize.getWidth();

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Year-by-Year Breakdown', 15, 15);

  // Build headers: Year + each income + each asset + each cost + each debt + Balance + Cumulative
  const headers = ['Year'];
  activeIncomes.forEach(i => headers.push(i.name));
  activeAssets.forEach(a => headers.push(a.name));
  activeCosts.forEach(c => headers.push(c.name));
  activeDebts.forEach(d => headers.push(d.name));
  headers.push('Annual Balance');
  headers.push('Cumulative Balance');

  // Build body data from projection
  const bodyData = projection.yearlyBreakdown.map(row => {
    const rowData = [row.year];

    // Add income values
    activeIncomes.forEach(i => {
      const val = row.incomeBreakdown?.[i.name] || 0;
      rowData.push(val > 0 ? formatNumber(val) : '');
    });

    // Add asset values (one-time inflows in that year)
    activeAssets.forEach(a => {
      // Assets appear as one-time in their availability year
      const assetYear = a.availabilityDate ? new Date(a.availabilityDate).getFullYear() : null;
      if (assetYear === row.year) {
        rowData.push(formatNumber(parseFloat(a.adjustedAmount || a.amount)));
      } else {
        rowData.push('');
      }
    });

    // Add cost values
    activeCosts.forEach(c => {
      const val = row.costBreakdown?.[c.name] || 0;
      rowData.push(val > 0 ? formatNumber(val) : '');
    });

    // Add debt values (one-time outflows in that year)
    activeDebts.forEach(d => {
      const debtYear = d.madeAvailableDate ? new Date(d.madeAvailableDate).getFullYear() : null;
      if (debtYear === row.year) {
        rowData.push(formatNumber(parseFloat(d.adjustedAmount || d.amount)));
      } else {
        rowData.push('');
      }
    });

    // Add balances
    rowData.push(formatNumber(row.annualBalance));
    rowData.push(formatNumber(row.cumulativeBalance));

    return rowData;
  });

  autoTable(pdf, {
    startY: 25,
    head: [headers],
    body: bodyData,
    theme: 'grid',
    headStyles: { fillColor: [60, 60, 60], fontSize: 6 },
    styles: { fontSize: 5, cellPadding: 1 },
    columnStyles: {
      0: { fontStyle: 'bold' }
    }
  });

  // Save PDF
  pdf.save(`retirement-simulation-${new Date().toISOString().split('T')[0]}.pdf`);
};
