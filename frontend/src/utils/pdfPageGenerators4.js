/**
 * PDF Page Generators - Part 4
 * Pages 10-14: Landscape Graph, Year-by-Year Breakdown, Lodging Annex, Investments, Legal Warnings
 */

import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    checkPageBreak,

    getValueColor
} from './pdfHelpers';
import { investmentProducts, assetClassCorrelations } from '../data/investmentProducts';

/**
 * Page 10: Landscape Results Graph
 * Captures the simulation graph from the UI at high quality
 */
export const generateLandscapeGraph = async (pdf, graphElement, summaryData, language, pageNum, totalPages) => {
    // Add landscape page
    pdf.addPage('a4', 'landscape');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let yPos = 15;

    // Title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const title = language === 'fr' ? 'Graphique des résultats de simulation' : 'Simulation results graph';
    pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Summary boxes (similar to UI)
    const boxWidth = 60;
    const boxHeight = 20;
    const boxSpacing = 10;
    const startX = (pageWidth - (boxWidth * 3 + boxSpacing * 2)) / 2;

    if (summaryData.isInvested) {
        // REFINED LAYOUT: 2 Boxes, Full Width, No Background
        const margin = 15;
        const spacing = 10;
        const fullWidth = pageWidth - (margin * 2);
        const boxWidth = (fullWidth - spacing) / 2;
        const boxStartX = margin;

        // Box 1: Monte Carlo (Investment 5%)
        // Border only (Blue), No Fill
        pdf.setDrawColor(59, 130, 246); // border-blue-500
        pdf.setLineWidth(0.5);
        pdf.setFillColor(255, 255, 255); // White background ensuring no overlap
        pdf.roundedRect(boxStartX, yPos, boxWidth, boxHeight, 2, 2, 'S'); // Stroke only

        // Title
        pdf.setTextColor(59, 130, 246); // text-blue-500 (matching border)
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Simulation Monte-Carlo sur investissements' : 'Monte-Carlo simulation on investments', boxStartX + boxWidth / 2, yPos + 6, { align: 'center' });

        // Value
        const val5 = Math.round(summaryData.final5Balance || 0);
        // Use Green for positive, Red for negative
        pdf.setTextColor(val5 >= 0 ? 22 : 163, val5 >= 0 ? 163 : 30, val5 >= 0 ? 74 : 30); // Darker Green/Red for visibility on white
        pdf.setFontSize(12);
        pdf.text(formatCurrency(val5), boxStartX + boxWidth / 2, yPos + 12, { align: 'center' });

        // Subtitle
        pdf.setTextColor(107, 114, 128); // text-gray-500
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(language === 'fr' ? 'Solde final projeté (5%)' : 'Projected final balance (5%)', boxStartX + boxWidth / 2, yPos + 17, { align: 'center' });


        // Box 2: Baseline (Cash Only)
        // Border only (Gray), No Fill
        pdf.setDrawColor(107, 114, 128); // border-gray-500
        pdf.roundedRect(boxStartX + boxWidth + spacing, yPos, boxWidth, boxHeight, 2, 2, 'S');

        // Title
        pdf.setTextColor(107, 114, 128); // text-gray-500
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Simulation sans investissements' : 'Simulation without investments', boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 6, { align: 'center' });

        // Value
        const valBase = Math.round(summaryData.finalBaselineBalance || 0);
        pdf.setTextColor(valBase >= 0 ? 22 : 163, valBase >= 0 ? 163 : 30, valBase >= 0 ? 74 : 30); // Green/Red
        pdf.setFontSize(12);
        pdf.text(formatCurrency(valBase), boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 12, { align: 'center' });

        // Subtitle
        pdf.setTextColor(107, 114, 128); // text-gray-500
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(language === 'fr' ? 'Solde final projeté' : 'Projected final balance', boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 17, { align: 'center' });

    } else {
        // STANDARD LAYOUT

        // Box 1: Final Balance
        // pdf.setFillColor(summaryData.finalBalance >= 0 ? 34 : 239, summaryData.finalBalance >= 0 ? 197 : 68, summaryData.finalBalance >= 0 ? 94 : 68);
        // User screenshot shows simple Green box. Let's stick to standard colors but clean up.
        pdf.setFillColor(summaryData.finalBalance >= 0 ? 34 : 239, summaryData.finalBalance >= 0 ? 197 : 68, summaryData.finalBalance >= 0 ? 94 : 68);
        pdf.rect(startX, yPos, boxWidth, boxHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text(language === 'fr' ? 'Solde final' : 'Final balance', startX + boxWidth / 2, yPos + 8, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(formatCurrency(summaryData.finalBalance), startX + boxWidth / 2, yPos + 15, { align: 'center' });

        // Box 2: Peak Wealth
        pdf.setFillColor(41, 128, 185);
        pdf.rect(startX + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'F');
        pdf.setFontSize(8);
        pdf.text(language === 'fr' ? 'Richesse max' : 'Peak wealth', startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 8, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(formatCurrency(summaryData.peakWealth || 0), startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 15, { align: 'center' });

        // Box 3: Years in Retirement
        pdf.setFillColor(142, 68, 173);
        pdf.rect(startX + (boxWidth + boxSpacing) * 2, yPos, boxWidth, boxHeight, 'F');
        pdf.setFontSize(8);
        pdf.text(language === 'fr' ? 'Années de retraite' : 'Years in retirement', startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 8, { align: 'center' });
        
        pdf.setFontSize(10);
        if (summaryData.isCouple && summaryData.yearsInRetirement2) {
            const p1Name = summaryData.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
            const p2Name = summaryData.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
            
            pdf.text(`${p1Name}: ${summaryData.yearsInRetirement} ${language === 'fr' ? 'ans' : 'years'}`, startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 15, { align: 'center' });
            pdf.text(`${p2Name}: ${summaryData.yearsInRetirement2} ${language === 'fr' ? 'ans' : 'years'}`, startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 22, { align: 'center' });
        } else {
            pdf.text(String(summaryData.yearsInRetirement || 0), startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 15, { align: 'center' });
        }
    }

    yPos += boxHeight + 10;

    // Capture graph at high quality
    if (graphElement) {
        try {
            const canvas = await html2canvas(graphElement, {
                backgroundColor: '#ffffff',
                scale: 3,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const availableHeight = pageHeight - yPos - 15;
            const imgWidth = pageWidth - 30;
            const imgHeight = availableHeight;

            pdf.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);

        } catch (error) {
            console.error('Error capturing graph:', error);
            pdf.setFontSize(10);
            pdf.setTextColor(200, 0, 0);
            pdf.text(language === 'fr' ? 'Erreur lors de la capture du graphique' : 'Error capturing graph', 20, yPos);
        }
    } else {
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Graphique non disponible' : 'Graph not available', 20, yPos);
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 11: Year-by-Year Breakdown (Landscape)
 * Detailed table showing all yearly calculations
 */
export const generateYearByYearBreakdown = (pdf, yearlyData, language, pageNum, totalPages, isCouple, userData) => {
    pdf.addPage('a4', 'landscape');

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Détail année par année' : 'Year-by-year breakdown',
        null,
        15
    );

    if (!yearlyData || yearlyData.length === 0) {
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        pdf.text(language === 'fr' ? 'Aucune donnée disponible' : 'No data available', 20, yPos);
        addPageNumber(pdf, pageNum, totalPages, language);
        return;
    }

    // Collect all unique column names from all years
    const allIncomeColumns = new Set();
    const allAssetColumns = new Set();
    const allCostColumns = new Set();

    yearlyData.forEach(year => {
        if (year.incomeBreakdown) {
            Object.keys(year.incomeBreakdown).forEach(key => allIncomeColumns.add(key));
        }
        if (year.activatedOwingsBreakdown) {
            Object.keys(year.activatedOwingsBreakdown).forEach(key => allAssetColumns.add(key));
        }
        if (year.costBreakdown) {
            Object.keys(year.costBreakdown).forEach(key => allCostColumns.add(key));
        }
    });

    // Build header configs with categories (@@p1, @@p2, etc.)
    const incomeCols = Array.from(allIncomeColumns);
    const assetCols = Array.from(allAssetColumns);
    const costCols = Array.from(allCostColumns);
    
    const rawKeys = ['An', ...incomeCols, ...assetCols, ...costCols, 'Ann.Bal', 'Cum.Bal'];
    
    const headerConfigs = rawKeys.map(key => {
        const parts = key.split('@@');
        const name = parts[0];
        const category = parts[1] || 'none';
        
        let label = name;
        if (key === 'Ann.Bal') label = language === 'fr' ? 'Solde Ann.' : 'Ann. Bal';
        if (key === 'Cum.Bal') label = language === 'fr' ? 'Solde Cum.' : 'Cum. Bal';
        if (key === 'An') label = language === 'fr' ? 'Année' : 'Yr';

        // Custom abbreviations for common long terms
        label = label.replace('Salary', 'Sal.');
        label = label.replace('Investment', 'Inv.');
        label = label.replace('Balance', 'Bal.');

        return { key, label, category };
    });

    const headers = headerConfigs.map(c => c.label);

    // Build data rows
    const tableData = yearlyData.map(year => {
        const row = [String(year.year || '')];

        // Add income values
        incomeCols.forEach(col => {
            const val = year.incomeBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(val));
        });

        // Add asset values
        assetCols.forEach(col => {
            const val = year.activatedOwingsBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(val));
        });

        // Add cost values
        costCols.forEach(col => {
            const val = year.costBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(-val));
        });

        // Add summary values
        row.push(
            formatNumber(year.annualBalance || 0),
            formatNumber(year.cumulativeBalance || 0)
        );

        return row;
    });

    // Calculate ultra-compact column widths
    const totalColumns = headers.length;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const availableWidth = pageWidth - 20; // Minimal margins

    // Year gets same width as others now that it's vertical
    const dataColWidth = availableWidth / totalColumns;

    const columnStyles = {};
    headers.forEach((_, index) => {
        columnStyles[index] = { halign: 'center', cellWidth: dataColWidth };
    });

    autoTable(pdf, {
        startY: yPos,
        head: [headers],
        body: tableData,
        theme: 'grid', // Grid for vertical lines
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 5.5,
            fontStyle: 'bold',
            cellPadding: 0.5,
            minCellHeight: 35, // Increased further for separate-line layout
            halign: 'center',
            valign: 'middle'
        },
        styles: {
            fontSize: 4.5,
            cellPadding: 0.3,
            minCellHeight: 4,
            overflow: 'linebreak',
            lineWidth: 0.1, // Very fine lines
            lineColor: [200, 200, 200] // Light gray lines
        },
        columnStyles,
        willDrawCell: function (data) {
            // Empty the header text for all columns so it's drawn vertically manually
            if (data.section === 'head') {
                data.cell.text = ['']; 
            }
        },
        didDrawCell: function (data) {
            // Draw rotated text for all headers
            if (data.section === 'head') {
                const doc = data.doc;
                const cell = data.cell;
                const config = headerConfigs[data.column.index];
                const text = config.label;
                const category = config.category;

                doc.saveGraphicsState();
                
                // We split the cell width into two vertical lanes
                // Lane 1: Title (left side of cell when rotated)
                // Lane 2: Badge (right side of cell when rotated)
                const lane1CenterX = cell.x + (cell.width * 0.35); // For Title
                const lane2CenterX = cell.x + (cell.width * 0.75); // For Badge

                // 1. Draw Main Title (in Lane 1, Bottom-aligned)
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(5); 
                doc.setFont('helvetica', 'bold');
                doc.text(text, lane1CenterX, cell.y + cell.height - 2, { angle: 90 });

                // 2. Draw Badge (Category) in Lane 2, Bottom-aligned
                if (isCouple && category !== 'none' && category !== 'An') {
                    let badgeColor = [156, 163, 175]; // Gray-400
                    let badgeLabel = category.toUpperCase();
                    
                    if (category === 'p1') {
                        badgeColor = [59, 130, 246]; // Blue-500
                        badgeLabel = (userData?.firstName || 'Personne 1');
                    } else if (category === 'p2') {
                        badgeColor = [168, 85, 247]; // Purple-500
                        badgeLabel = (userData?.firstName2 || 'Personne 2');
                    } else if (category === 'consolidated' || category === 'con') {
                        badgeColor = [245, 158, 11]; // Amber-500
                        badgeLabel = language === 'fr' ? 'Consolidé' : 'Consolidated';
                    } else if (category === 'shared' || category === 'sho') {
                        badgeColor = [107, 114, 128]; // Gray-500
                        badgeLabel = language === 'fr' ? 'Partagé' : 'Shared';
                    }

                    doc.setFontSize(3); // Small but readable font for full text
                    const labelWidth = doc.getTextWidth(badgeLabel);
                    const rectHeight = labelWidth + 2; 
                    const rectWidth = (cell.width * 0.3); // Very thin strip

                    // Position badge just above the bottom padding
                    const badgeBottomY = cell.y + cell.height - 2;
                    const badgeTopY = badgeBottomY - rectHeight;

                    // Draw badge background
                    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
                    doc.roundedRect(cell.x + (cell.width * 0.6), badgeTopY, rectWidth, rectHeight, 0.2, 0.2, 'F');

                    // Draw badge text (vertical)
                    doc.setTextColor(255, 255, 255);
                    doc.text(badgeLabel, lane2CenterX, badgeBottomY - 1, { angle: 90 });
                }
                
                doc.restoreGraphicsState();
            }
        },
        didParseCell: function (data) {
            // Color code the balance columns (last 2 columns)
            if (data.section === 'body' && data.column.index >= totalColumns - 2) {
                const value = parseFloat(yearlyData[data.row.index][data.column.index === totalColumns - 2 ? 'annualBalance' : 'cumulativeBalance']) || 0;
                if (value < 0) {
                    data.cell.styles.textColor = [239, 68, 68]; // Red
                } else {
                    data.cell.styles.textColor = [34, 197, 94]; // Green
                }
            }
        },
        margin: { left: 10, right: 10 }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 12: Lodging Cost Annex
 * For owners: one page per property
 * For tenants: one page with rent details
 */
export const generateLodgingAnnex = (pdf, realEstateData, language, pageNum, totalPages) => {
    if (!realEstateData) return;

    const isOwner = realEstateData?.lodgingSituation === 'owner';

    // Normalize Data: If raw flat arrays are passed, structure them into 'properties' or 'tenantExpenses'
    let properties = realEstateData.properties || [];
    let tenantExpenses = realEstateData.tenantExpenses || [];

    if (!realEstateData.properties && !realEstateData.tenantExpenses) {
        if (isOwner) {
            const count = parseInt(realEstateData.propertyCount || "1");
            for (let i = 1; i <= count; i++) {
                properties.push({
                    assetRows: (realEstateData.assetRows || []).filter(r => (r.propertyId ?? 1) === i),
                    mortgageRows: (realEstateData.mortgageRows || []).filter(r => (r.propertyId ?? 1) === i),
                    maintenanceRows: (realEstateData.maintenanceRows || []).filter(r => (r.propertyId ?? 1) === i)
                });
            }
        } else {
            // Tenant (Property ID 0)
            tenantExpenses = (realEstateData.maintenanceRows || []).filter(r => (r.propertyId ?? 1) === 0);
        }
    }

    if (isOwner) {
        // Generate a page for each property
        properties.forEach((property, index) => {
            pdf.addPage('a4', 'portrait');

            let yPos = addPageHeader(
                pdf,
                language === 'fr' ? `Annexe : frais de logement - propriété ${index + 1}` : `Annex: lodging costs - property ${index + 1}`,
                null,
                20
            );

            yPos += 5;

            // Property value
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(language === 'fr' ? 'Valeur du bien' : 'Property value', 15, yPos);
            yPos += 8;

            const assetRows = property.assetRows || [];
            if (assetRows.length > 0) {
                const assetData = assetRows.map(row => [
                    row.name || `${language === 'fr' ? 'Propriété' : 'Property'} ${index + 1}`,
                    formatCurrency(row.amount || 0)
                ]);

                autoTable(pdf, {
                    startY: yPos,
                    body: assetData,
                    theme: 'plain',
                    styles: { fontSize: 10 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'right' }
                    },
                    margin: { left: 20 }
                });

                yPos = pdf.lastAutoTable.finalY + 10;
            }

            // Mortgages
            yPos = checkPageBreak(pdf, yPos, 40);

            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(language === 'fr' ? 'Hypothèques' : 'Mortgages', 15, yPos);
            yPos += 8;

            const mortgageRows = property.mortgageRows || [];
            if (mortgageRows.length > 0) {
                const mortgageData = mortgageRows.map(row => [
                    row.name || 'Mortgage',
                    formatCurrency(row.amount || 0)
                ]);

                autoTable(pdf, {
                    startY: yPos,
                    body: mortgageData,
                    theme: 'plain',
                    styles: { fontSize: 10 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'right' }
                    },
                    margin: { left: 20 }
                });

                yPos = pdf.lastAutoTable.finalY + 10;
            } else {
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.setTextColor(150, 150, 150);
                pdf.text(language === 'fr' ? 'Aucune hypothèque' : 'No mortgages', 20, yPos);
                yPos += 10;
            }

            // Maintenance costs
            yPos = checkPageBreak(pdf, yPos, 40);

            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(language === 'fr' ? 'Frais d\'entretien' : 'Maintenance costs', 15, yPos);
            yPos += 8;

            const maintenanceRows = property.maintenanceRows || [];
            if (maintenanceRows.length > 0) {
                const maintenanceData = maintenanceRows.map(row => [
                    row.name || 'N/A',
                    formatCurrency(row.amount || 0)
                ]);

                autoTable(pdf, {
                    startY: yPos,
                    body: maintenanceData,
                    theme: 'plain',
                    styles: { fontSize: 9 },
                    columnStyles: {
                        1: { halign: 'right' }
                    },
                    margin: { left: 20 },
                    didDrawCell: function(data) {
                        const pdf = data.doc;
                        pdf.saveGraphicsState();
                        pdf.setLineWidth(0.1);
                        pdf.setDrawColor(180, 180, 180);
                        pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                        pdf.restoreGraphicsState();
                    }
                });

                yPos = pdf.lastAutoTable.finalY + 10;
            }

            // Totals
            yPos = checkPageBreak(pdf, yPos, 30);

            const totalAsset = assetRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
            const totalMortgage = mortgageRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
            const totalMaintenance = maintenanceRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
            const netValue = totalAsset - totalMortgage;

            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(language === 'fr' ? 'Totaux' : 'Totals', 15, yPos);
            yPos += 8;

            const totalsData = [
                [language === 'fr' ? 'Valeur totale du bien' : 'Total property value', formatCurrency(totalAsset)],
                [language === 'fr' ? 'Total hypothèques' : 'Total mortgages', formatCurrency(totalMortgage)],
                [language === 'fr' ? 'Valeur nette' : 'Net value', formatCurrency(netValue)],
                [language === 'fr' ? 'Frais d\'entretien mensuels' : 'Monthly maintenance costs', formatCurrency(totalMaintenance)]
            ];

            autoTable(pdf, {
                startY: yPos,
                body: totalsData,
                theme: 'plain',
                styles: { fontSize: 10, fontStyle: 'bold' },
                columnStyles: {
                    1: { halign: 'right' }
                },
                margin: { left: 20 }
            });

            addPageNumber(pdf, pageNum + index, totalPages, language);
        });

    } else {
        // Tenant page
        pdf.addPage('a4', 'portrait');

        let yPos = addPageHeader(
            pdf,
            language === 'fr' ? 'Annexe : frais de logement - locataire' : 'Annex: lodging costs - tenant',
            null,
            20
        );

        yPos += 5;

        // Rent
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Loyer' : 'Rent', 15, yPos);
        yPos += 8;

        const rentAmount = realEstateData?.rent || 0;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${language === 'fr' ? 'Loyer Mensuel' : 'Monthly Rent'}: ${formatCurrency(rentAmount)}`, 20, yPos);
        yPos += 15;

        // Tenant expenses
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Frais du locataire' : 'Tenant expenses', 15, yPos);
        yPos += 8;

        if (tenantExpenses.length > 0) {
            const expenseData = tenantExpenses.map(exp => [
                exp.name || 'N/A',
                formatCurrency(exp.amount || 0)
            ]);

            autoTable(pdf, {
                startY: yPos,
                body: expenseData,
                theme: 'plain',
                styles: { fontSize: 9 },
                columnStyles: {
                    1: { halign: 'right' }
                },
                margin: { left: 20 },
                didDrawCell: function(data) {
                    const pdf = data.doc;
                    pdf.saveGraphicsState();
                    pdf.setLineWidth(0.1);
                    pdf.setDrawColor(180, 180, 180);
                    pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                    pdf.restoreGraphicsState();
                }
            });

            yPos = pdf.lastAutoTable.finalY + 10;
        }

        // Total
        const totalExpenses = tenantExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const totalMonthly = rentAmount + totalExpenses;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${language === 'fr' ? 'Total mensuel' : 'Total monthly'}: ${formatCurrency(totalMonthly)}`, 20, yPos);

        addPageNumber(pdf, pageNum, totalPages, language);
    }
};

/**
 * Page 13: Investment Information (Conditional)
 * Only included if user has defined investments in Capital Management
 */
export const generateInvestmentInfo = async (pdf, investedAssets, language, pageNum, totalPages, monteCarloData, baselineProjection, extraData = {}) => {
    const { 
        mcChartElement, 
        histChartElement, 
        histData, 
        metricsArr, 
        investmentProductsList,
        startingAmount,
        injections,
        exits
    } = extraData;

    if (!investedAssets || investedAssets.length === 0) return;

    pdf.addPage('a4', 'portrait');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations sur les investissements' : 'Investment information',
        language === 'fr' ? 'Détails de la gestion du capital' : 'Capital management details',
        pageNum
    );

    yPos += 10;

    // 1. INVESTISSEMENTS INDIVIDUELS
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '1. Investissements individuels' : '1. Individual Investments', 15, yPos);
    yPos += 6;

    const tableHeaders = [
        language === 'fr' ? 'Nom du Cluster' : 'Cluster Name',
        { content: language === 'fr' ? 'Montant' : 'Amount', styles: { halign: 'right' } },
        language === 'fr' ? 'Date dispo.' : 'Avail. Date',
        language === 'fr' ? 'Date fin' : 'End Date',
        language === 'fr' ? 'Produit' : 'Product',
        language === 'fr' ? 'Groupé avec' : 'Grouped with',
        language === 'fr' ? 'Nom Invest/Groupe' : 'Invest/Group name'
    ];

    const tableData = investedAssets.map(row => {
        const product = investmentProducts.find(p => p.id === row.productId || p.id === row.selectedProduct);
        const parent = investedAssets.find(p => p.id === row.groupedWith);
        
        return [
            row.name || '-',
            formatCurrency(row.amount || 0),
            row.availabilityDate ? formatDate(row.availabilityDate) : row.startDate ? formatDate(row.startDate) : '-',
            row.endDate ? formatDate(row.endDate) : '-',
            product ? product.ticker : '-',
            parent ? parent.name : (row.groupedWith === 'not grouped' || !row.groupedWith) ? (language === 'fr' ? 'Non groupé' : 'not grouped') : '-',
            row.investGroupName !== undefined ? row.investGroupName : row.name
        ];
    });

    autoTable(pdf, {
        startY: yPos,
        head: [tableHeaders],
        body: tableData,
        theme: 'plain',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8, valign: 'middle' },
        styles: { fontSize: 7, valign: 'middle' },
        columnStyles: { 
            0: { cellWidth: 35 },
            1: { halign: 'right', cellWidth: 25 },
            2: { cellWidth: 22 },
            3: { cellWidth: 22 },
            4: { cellWidth: 20 },
            5: { cellWidth: 25 },
            6: { cellWidth: 35 }
        },
        margin: { left: 15, right: 15 },
        didDrawCell: function(data) {
            const pdf = data.doc;
            pdf.saveGraphicsState();
            pdf.setLineWidth(0.1);
            pdf.setDrawColor(180, 180, 180);
            pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            pdf.restoreGraphicsState();
        }
    });

    yPos = pdf.lastAutoTable.finalY + 12;

    // 2. APERÇU DU RENDEMENT COMBINÉ (Monte Carlo)
    yPos = checkPageBreak(pdf, yPos, 80);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '2. Aperçu du rendement combiné' : '2. Combined Return Preview', 15, yPos);
    yPos += 6;

    // Capture and add MC Chart
    if (mcChartElement) {
        try {
            const mcCanvas = await html2canvas(mcChartElement, { scale: 2, backgroundColor: '#ffffff' });
            const mcImg = mcCanvas.toDataURL('image/png');
            const metricsBoxWidth = 55;
            const chartWidth = pageWidth - 30 - metricsBoxWidth - 5;
            const chartHeight = 70;
            pdf.addImage(mcImg, 'PNG', 15, yPos, chartWidth, chartHeight);
            
            // Metrics Box for MC (Side Table)
            const mcResult = monteCarloData?.details?.percentiles || monteCarloData?.percentiles;
            const mcMetrics = [
                [{ content: language === 'fr' ? 'Simulation Monte Carlo' : 'Monte Carlo Simulation', colSpan: 2, styles: { fontStyle: 'bold', textColor: [100, 100, 100], fontSize: 6, halign: 'left' } }],
                [language === 'fr' ? '1. Cap. départ' : '1. Start. cap.', { content: formatCurrency(startingAmount), styles: { fontStyle: 'bold' } }]
            ];

            // 2. Injections
            if (injections && injections.length > 0) {
                mcMetrics.push([{ content: language === 'fr' ? '2. Injections' : '2. Injections', colSpan: 2, styles: { fontSize: 6, fontStyle: 'bold', textColor: [100, 100, 100] } }]);
                injections.forEach(inj => {
                    mcMetrics.push([
                        { content: `${inj.date} · ${inj.ticker || ''}`, styles: { fontSize: 6 } },
                        { content: `+${formatCurrency(inj.amount)}`, styles: { fontSize: 7, textColor: [34, 197, 94], fontStyle: 'bold' } }
                    ]);
                });
            }

            // 3. Exits
            if (exits && exits.length > 0) {
                mcMetrics.push([{ content: language === 'fr' ? '3. Sorties' : '3. Exits', colSpan: 2, styles: { fontSize: 6, fontStyle: 'bold', textColor: [100, 100, 100] } }]);
                exits.forEach(ex => {
                    mcMetrics.push([
                        { content: `${ex.date} · ${ex.ticker || ''}`, styles: { fontSize: 6 } },
                        { content: `-${formatCurrency(ex.amount)}`, styles: { fontSize: 7, textColor: [220, 38, 38], fontStyle: 'bold' } }
                    ]);
                });
            }

            // Percentiles
            mcMetrics.push([{ content: '', colSpan: 2, styles: { cellPadding: 0.5 } }]); // Spacer
            const p5 = mcResult?.p5?.[mcResult.p5.length-1] || 0;
            const p10 = mcResult?.p10?.[mcResult.p10.length-1] || 0;
            const p25 = mcResult?.p25?.[mcResult.p25.length-1] || 0;
            
            mcMetrics.push([
                { content: 'P5 final', styles: { textColor: [220, 38, 38] } },
                { content: formatCurrency(p5), styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }
            ]);
            mcMetrics.push([
                { content: 'P10 final', styles: { textColor: [249, 115, 22] } },
                { content: formatCurrency(p10), styles: { textColor: [249, 115, 22], fontStyle: 'bold' } }
            ]);
            mcMetrics.push([
                { content: 'P25 final', styles: { textColor: [37, 99, 235] } },
                { content: formatCurrency(p25), styles: { textColor: [37, 99, 235], fontStyle: 'bold' } }
            ]);

            
            autoTable(pdf, {
                startY: yPos,
                margin: { left: 15 + chartWidth + 5 },
                tableWidth: metricsBoxWidth,
                body: mcMetrics,
                theme: 'plain',
                styles: { fontSize: 7, cellPadding: 1, valign: 'middle' },
                columnStyles: { 0: { cellWidth: 25 }, 1: { halign: 'right' } }
            });

            // 2.5 Monte Carlo Legends (Below chart)
            const legendY = yPos + chartHeight + 2;
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            
            // P5 (Red dashed)
            const p5X = 15;
            pdf.setDrawColor(239, 68, 68); // #ef4444
            pdf.setLineWidth(0.5);
            pdf.setLineDash([1, 1], 0);
            pdf.line(p5X, legendY + 1.5, p5X + 5, legendY + 1.5);
            pdf.setLineDash([], 0);
            pdf.setTextColor(100, 100, 100);
            pdf.text(language === 'fr' ? 'P5 (Très pessimiste)' : 'P5 (Extreme)', p5X + 6, legendY + 2.5);

            // P10 (Orange dashed)
            const p10X = p5X + 30;
            pdf.setDrawColor(249, 115, 22); // #f97316
            pdf.setLineDash([1, 1], 0);
            pdf.line(p10X, legendY + 1.5, p10X + 5, legendY + 1.5);
            pdf.setLineDash([], 0);
            pdf.text(language === 'fr' ? 'P10 (Pessimiste)' : 'P10 (Conservative)', p10X + 6, legendY + 2.5);

            // P25 (Blue solid)
            const p25X = p10X + 40;
            pdf.setDrawColor(59, 130, 246); // #3b82f6
            pdf.setLineWidth(0.8);
            pdf.line(p25X, legendY + 1.5, p25X + 5, legendY + 1.5);
            pdf.text('P25 (Optimiste)', p25X + 6, legendY + 2.5);
            
            yPos += chartHeight + 12;
        } catch (err) {
            console.error('MC Chart capture failed:', err);
            yPos += 10;
        }
    }

    // 3. HISTORIQUE NORMALISÉ
    yPos = checkPageBreak(pdf, yPos, 80);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '3. Historique normalisé (base 100)' : '3. Normalized History (base 100)', 15, yPos);
    yPos += 6;

    if (histChartElement) {
        try {
            const histCanvas = await html2canvas(histChartElement, { scale: 2, backgroundColor: '#ffffff' });
            const histImg = histCanvas.toDataURL('image/png');
            const metricsBoxWidth = 55;
            const chartWidth = pageWidth - 30 - metricsBoxWidth - 5;
            const chartHeight = 70;
            pdf.addImage(histImg, 'PNG', 15, yPos, chartWidth, chartHeight);
            
            // 3.5 Historical Overlay Legends (Below chart)
            if (investmentProductsList && investmentProductsList.length > 0) {
                const histLegendY = yPos + chartHeight + 2;
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'normal');
                let currentLegendX = 15;

                investmentProductsList.forEach((p, i) => {
                    const color = colors[i % colors.length];
                    const rgb = hexToRgb(color);
                    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
                    pdf.setLineWidth(0.8);
                    pdf.line(currentLegendX, histLegendY + 1.5, currentLegendX + 5, histLegendY + 1.5);
                    pdf.setTextColor(100, 100, 100);
                    const name = p.name.length > 30 ? p.name.substring(0, 27) + '...' : p.name;
                    pdf.text(name, currentLegendX + 6, histLegendY + 2.5);
                    currentLegendX += 50; // Simple fixed spacing for now
                });
            }

            // 3.6 Detailed Historical Metrics (Vertical Boxes)
            if (metricsArr && metricsArr.length > 0) {
                let boxY = yPos;
                const boxWidth = metricsBoxWidth;
                
                metricsArr.forEach((m, mi) => {
                    // Check for page break if we have multiple products
                    if (boxY > 240) {
                        pdf.addPage('a4', 'portrait');
                        boxY = 20; // Start fresh on new page
                    }

                    const metricsRows = [
                        [{ content: m.name, colSpan: 2, styles: { fontStyle: 'bold', textColor: [59, 130, 246], fontSize: 7, halign: 'left' } }],
                        [language === 'fr' ? 'Rend. total' : 'Total Ret.', { content: `${(m.totalReturn * 100).toFixed(1)}%`, styles: { textColor: [22, 163, 74], fontStyle: 'bold' } }],
                        [language === 'fr' ? 'Rend. ann.' : 'Ann. Ret.', { content: `+${(m.meanReturn * 100).toFixed(1)}%`, styles: { textColor: [22, 163, 74], fontStyle: 'bold' } }],
                        [language === 'fr' ? 'Volatilité' : 'Volatility', { content: `+${(m.volatility * 100).toFixed(1)}%`, styles: { textColor: [37, 99, 235], fontStyle: 'bold' } }],
                        [language === 'fr' ? 'Max DD' : 'Max DD', { content: `${(m.maxDrawdown * 100).toFixed(1)}%`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }],
                        [language === 'fr' ? 'Perte 3a' : '3y Loss', { content: `${(m.max3yLoss * 100).toFixed(1)}%`, styles: { textColor: [220, 38, 38], fontStyle: 'bold' } }],
                        [language === 'fr' ? 'Gain 3a' : '3y Gain', { content: `+${(m.max3yGain * 100).toFixed(1)}%`, styles: { textColor: [22, 163, 74], fontStyle: 'bold' } }]
                    ];

                    autoTable(pdf, {
                        startY: boxY,
                        margin: { left: 15 + chartWidth + 5 },
                        tableWidth: boxWidth,
                        body: metricsRows,
                        theme: 'plain',
                        styles: { fontSize: 6.5, cellPadding: 0.8, valign: 'middle' },
                        columnStyles: { 0: { cellWidth: 30 }, 1: { halign: 'right' } },
                        didDrawPage: (data) => {
                            // Draw a light border around each box
                            const finalY = data.cursor.y;
                            pdf.setDrawColor(226, 232, 240); // #e2e8f0
                            pdf.setLineWidth(0.1);
                            pdf.rect(15 + chartWidth + 5, boxY, boxWidth, finalY - boxY);
                        }
                    });

                    boxY = pdf.lastAutoTable.finalY + 4;
                });
            }
            
            yPos += chartHeight + 20;
        } catch (err) {
            console.error('Hist Chart capture failed:', err);
            yPos += 10;
        }
    }

    addPageNumber(pdf, pageNum, totalPages);
};

export const generateLegalWarnings = (pdf, language, pageNum, totalPages) => {
    pdf.addPage('a4', 'portrait');

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Avertissements Légaux' : 'Legal Warnings',
        null,
        20
    );

    yPos += 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    const warnings = language === 'fr' ? [
        'AVERTISSEMENT IMPORTANT',
        '',
        '1. Nature de l\'Outil',
        'Cette application est un outil de planification financière personnelle destiné à des fins d\'information et d\'estimation uniquement. Elle ne constitue pas un conseil financier, juridique ou fiscal professionnel.',
        '',
        '2. Limitations',
        '• Les projections sont basées sur les données que vous fournissez et des hypothèses simplifiées',
        '• Les résultats réels peuvent différer significativement des projections',
        '• L\'outil ne prend pas en compte tous les facteurs personnels, fiscaux ou légaux',
        '• Les calculs sont des estimations et peuvent contenir des erreurs',
        '',
        '3. Confidentialité des Données',
        '• Vos données financières sont stockées localement dans votre navigateur',
        '• Aucune donnée financière n\'est transmise à nos serveurs',
        '• Vous êtes responsable de la sauvegarde de vos données',
        '',
        '4. Responsabilité',
        '• Nous ne garantissons pas l\'exactitude, l\'exhaustivité ou l\'actualité des informations',
        '• Nous déclinons toute responsabilité pour les décisions prises sur la base de cet outil',
        '• Consultez toujours un conseiller financier professionnel avant de prendre des décisions importantes',
        '',
        '5. Utilisation',
        'En utilisant cet outil, vous reconnaissez avoir lu et compris ces avertissements et acceptez de les respecter.',
        '',
        'Pour plus d\'informations, consultez nos Conditions d\'Utilisation et notre Politique de Confidentialité sur notre site web.'
    ] : [
        'IMPORTANT WARNING',
        '',
        '1. Nature of the Tool',
        'This application is a personal financial planning tool intended for informational and estimation purposes only. It does not constitute professional financial, legal, or tax advice.',
        '',
        '2. Limitations',
        '• Projections are based on data you provide and simplified assumptions',
        '• Actual results may differ significantly from projections',
        '• The tool does not account for all personal, tax, or legal factors',
        '• Calculations are estimates and may contain errors',
        '',
        '3. Data Privacy',
        '• Your financial data is stored locally in your browser',
        '• No financial data is transmitted to our servers',
        '• You are responsible for backing up your data',
        '',
        '4. Liability',
        '• We do not guarantee the accuracy, completeness, or timeliness of information',
        '• We disclaim all liability for decisions made based on this tool',
        '• Always consult a professional financial advisor before making important decisions',
        '',
        '5. Usage',
        'By using this tool, you acknowledge that you have read and understood these warnings and agree to comply with them.',
        '',
        'For more information, please refer to our Terms of Service and Privacy Policy on our website.'
    ];

    warnings.forEach(line => {
        if (line === '') {
            yPos += 5;
        } else if (line.startsWith('•')) {
            pdf.text(line, 25, yPos);
            yPos += 5;
        } else if (line.match(/^\d+\./)) {
            pdf.setFont('helvetica', 'bold');
            pdf.text(line, 15, yPos);
            pdf.setFont('helvetica', 'normal');
            yPos += 6;
        } else if (line.includes('IMPORTANT') || line.includes('AVERTISSEMENT')) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text(line, 15, yPos);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            yPos += 8;
        } else {
            const lines = pdf.splitTextToSize(line, 170);
            lines.forEach(l => {
                pdf.text(l, 15, yPos);
                yPos += 5;
            });
        }

        // Check for page break
        if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
        }
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 15 (Optional): Focus Years Details
 * Displays detailed cards for selected focus years (up to 4)
 */
export const generateFocusPage = (pdf, focusYears, chartData, language, pageNum, totalPages, userData) => {
    const isCouple = userData?.analysisType === 'couple' || userData?.isCouple;
    // Filter active focus years
    const activeFocusYears = focusYears?.filter(f => f.active && f.year) || [];

    if (activeFocusYears.length === 0) {
        return;
    }

    pdf.addPage('a4', 'landscape');

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Détails des années focus' : 'Focus Years Details',
        null,
        15
    );

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const availableWidth = pageWidth - (margin * 2);
    // Adjusted height calculation
    const availableHeight = pageHeight - yPos - 20;

    const gap = 10;
    // 2x2 grid logic
    const cardWidth = (availableWidth - gap) / 2;
    const cardHeight = (availableHeight - gap) / 2;

    activeFocusYears.forEach((focus, index) => {
        if (index >= 4) return; // Max 4 cards per page

        const yearData = chartData.find(d => String(d.year) === String(focus.year));
        if (!yearData) return;

        // Calculate card position
        const col = index % 2;
        const row = Math.floor(index / 2);

        const cardX = margin + (col * (cardWidth + gap));
        const cardY = yPos + (row * (cardHeight + gap));

        // Draw Card Background
        pdf.setFillColor(248, 250, 252); // Very light gray/blue
        pdf.setDrawColor(226, 232, 240); // Border color
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

        // Header Section (Dark Blue)
        pdf.setFillColor(30, 41, 59); // slate-800
        // Draw top part as rect
        pdf.rect(cardX, cardY, cardWidth, 12, 'F');

        // Header Text
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        const focusTitle = `FOCUS ${focus.id} - ${language === 'fr' ? 'Année' : 'Year'} ${focus.year}`;
        pdf.text(focusTitle, cardX + 5, cardY + 8);

        // Annual/Cumulative Summary in Header
        const p1Name = (userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1'));
        const p2Name = (userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2'));
        const annualLabel = language === 'fr' ? 'Solde annuel:' : 'Annual balance:';
        const cumulLabel = language === 'fr' ? 'Solde cumulé:' : 'Cumulative balance:';
        const annualVal = yearData.annualBalance || 0;
        const cumulVal = yearData.cumulativeBalance || 0;

        let cursorX = cardX + cardWidth - 5;

        // 1. Cumulative Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        if (cumulVal >= 0) pdf.setTextColor(34, 197, 94); // Green
        else pdf.setTextColor(239, 68, 68); // Red

        const cumulValStr = formatNumber(cumulVal);
        const cumulValWidth = pdf.getStringUnitWidth(cumulValStr) * 9 / pdf.internal.scaleFactor;

        pdf.text(cumulValStr, cursorX - cumulValWidth, cardY + 8);
        cursorX -= (cumulValWidth + 2); // Spacing

        // 2. Cumulative Label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255); // White

        const cumulLabelWidth = pdf.getStringUnitWidth(cumulLabel) * 8 / pdf.internal.scaleFactor;
        pdf.text(cumulLabel, cursorX - cumulLabelWidth, cardY + 8);
        cursorX -= (cumulLabelWidth + 6); // More spacing between groups

        // 3. Annual Value
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        if (annualVal >= 0) pdf.setTextColor(34, 197, 94); // Green
        else pdf.setTextColor(239, 68, 68); // Red

        const annualValStr = formatNumber(annualVal);
        const annualValWidth = pdf.getStringUnitWidth(annualValStr) * 9 / pdf.internal.scaleFactor;

        pdf.text(annualValStr, cursorX - annualValWidth, cardY + 8);
        cursorX -= (annualValWidth + 2);

        // 4. Annual Label
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255); // White

        const annualLabelWidth = pdf.getStringUnitWidth(annualLabel) * 8 / pdf.internal.scaleFactor;
        pdf.text(annualLabel, cursorX - annualLabelWidth, cardY + 8);

        // Content Position setup
        let contentY = cardY + 18;
        const contentWidth = cardWidth - 10;
        const colWidth = (contentWidth - 10) / 2; // Divide space for two columns

        pdf.setTextColor(0, 0, 0);

        // --- LEFT COLUMN: INCOME ---
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94); // Green
        const incomeHeader = language === 'fr' ? 'Revenus (CHF)' : 'Income (CHF)';
        pdf.text(incomeHeader, cardX + 5, contentY);

        let leftY = contentY + 6;

        // Income Items
        const incomeItems = Object.entries(yearData.incomeBreakdown || {})
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1]); // Descending

        incomeItems.forEach(([name, val]) => {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5); // Slightly smaller to fit more text
            pdf.setTextColor(71, 85, 105); // Slate 600

            // Parse name and badge
            const parts = name.split('@@');
            const label = parts[0];
            const category = parts[1] || 'none';

            // Truncate name if too long
            const displayName = label.length > 35 ? label.substring(0, 35) + '...' : label;
            pdf.text(displayName, cardX + 5, leftY);

            // Draw Badge if applicable
            if (isCouple && category !== 'none') {
                const labelWidth = pdf.getTextWidth(displayName);
                const badgeX = cardX + 5 + labelWidth + 2;
                
                let badgeColor = [156, 163, 175]; // Gray-400
                let badgeText = category.toUpperCase();
                let textColor = [255, 255, 255];

                if (category === 'p1') {
                    badgeColor = [219, 234, 254]; // blue-100
                    textColor = [30, 64, 175]; // blue-800
                    badgeText = userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
                } else if (category === 'p2') {
                    badgeColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                    badgeText = userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
                } else if (category === 'consolidated' || category === 'con') {
                    badgeColor = [254, 243, 199]; // amber-100
                    textColor = [146, 64, 14]; // amber-800
                    badgeText = language === 'fr' ? 'Consolidé' : 'Consolidated';
                } else if (category === 'shared' || category === 'sho') {
                    badgeColor = [243, 244, 246]; // gray-100
                    textColor = [75, 85, 99]; // gray-600
                    badgeText = language === 'fr' ? 'Partagé' : 'Shared';
                }

                pdf.setFontSize(5);
                const badgeLabelWidth = pdf.getTextWidth(badgeText);
                const badgePaddingX = 1.5;
                const badgePaddingY = 0.5;
                const rectWidth = badgeLabelWidth + badgePaddingX * 2;
                const rectHeight = 4; // Fixed small height

                pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
                pdf.roundedRect(badgeX, leftY - 3, rectWidth, rectHeight, 0.5, 0.5, 'F');
                
                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.text(badgeText, badgeX + badgePaddingX, leftY - 3 + 2.8);
            }

            pdf.setFont('helvetica', 'normal'); // Changed from bold per user request
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9); // 10% smaller than previous 10

            // Manual Right Align for Value
            const valStr = formatNumber(val);
            const valWidth = pdf.getStringUnitWidth(valStr) * 9 / pdf.internal.scaleFactor;
            pdf.text(valStr, cardX + 5 + colWidth - valWidth, leftY);

            leftY += 5;
        });

        // Activated Ownings (Assets)
        const assetItems = Object.entries(yearData.activatedOwingsBreakdown || {})
            .filter(([_, val]) => val > 0);

        if (assetItems.length > 0) {
            assetItems.forEach(([name, val]) => {
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(7.5);
                pdf.setTextColor(236, 72, 153); // Pink

                // Parse name and badge
                const parts = name.split('@@');
                const label = parts[0];
                const category = parts[1] || 'none';

                const displayName = label.length > 35 ? label.substring(0, 35) + '...' : label;
                pdf.text(displayName, cardX + 5, leftY);

                // Draw Badge if applicable
                if (isCouple && category !== 'none') {
                    const labelWidth = pdf.getTextWidth(displayName);
                    const badgeX = cardX + 5 + labelWidth + 2;
                    
                    let badgeColor = [156, 163, 175]; // Gray-400
                    let badgeText = category.toUpperCase();
                    let textColor = [255, 255, 255];

                    if (category === 'p1') {
                        badgeColor = [219, 234, 254]; // blue-100
                        textColor = [30, 64, 175]; // blue-800
                        badgeText = userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
                    } else if (category === 'p2') {
                        badgeColor = [243, 232, 255]; // purple-100
                        textColor = [107, 33, 168]; // purple-800
                        badgeText = userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
                    } else if (category === 'consolidated' || category === 'con') {
                        badgeColor = [254, 243, 199]; // amber-100
                        textColor = [146, 64, 14]; // amber-800
                        badgeText = language === 'fr' ? 'Consolidé' : 'Consolidated';
                    } else if (category === 'shared' || category === 'sho') {
                        badgeColor = [243, 244, 246]; // gray-100
                        textColor = [75, 85, 99]; // gray-600
                        badgeText = language === 'fr' ? 'Partagé' : 'Shared';
                    }

                    pdf.setFontSize(5);
                    const badgeLabelWidth = pdf.getTextWidth(badgeText);
                    const badgePaddingX = 1.5;
                    const badgePaddingY = 0.5;
                    const rectWidth = badgeLabelWidth + badgePaddingX * 2;
                    const rectHeight = 4; // Fixed small height

                    pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
                    pdf.roundedRect(badgeX, leftY - 3, rectWidth, rectHeight, 0.5, 0.5, 'F');
                    
                    pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                    pdf.text(badgeText, badgeX + badgePaddingX, leftY - 3 + 2.8);
                }

                pdf.setFont('helvetica', 'normal'); // Changed from bold per user request
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(9); // 10% smaller than previous 10

                // Manual Right Align for Value
                const valStr = formatNumber(val);
                const valWidth = pdf.getStringUnitWidth(valStr) * 9 / pdf.internal.scaleFactor;
                pdf.text(valStr, cardX + 5 + colWidth - valWidth, leftY);

                leftY += 5;
            });
        }

        // --- RIGHT COLUMN: COSTS ---
        const rightColX = cardX + 5 + colWidth + 5; // Start position for right column

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(239, 68, 68); // Red
        const costsHeader = language === 'fr' ? 'Dépenses (CHF)' : 'Expenses (CHF)';
        pdf.text(costsHeader, rightColX, contentY);

        let rightY = contentY + 6;
        const costItems = Object.entries(yearData.costBreakdown || {})
            .filter(([_, val]) => val > 0)
            .sort((a, b) => b[1] - a[1]);

        costItems.forEach(([name, val]) => {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(71, 85, 105);

            // Parse name and badge
            const parts = name.split('@@');
            const label = parts[0];
            const category = parts[1] || 'none';

            const displayName = label.length > 35 ? label.substring(0, 35) + '...' : label;
            pdf.text(displayName, rightColX, rightY);

            // Draw Badge if applicable
            if (isCouple && category !== 'none') {
                const labelWidth = pdf.getTextWidth(displayName);
                const badgeX = rightColX + labelWidth + 2;
                
                let badgeColor = [156, 163, 175]; // Gray-400
                let badgeText = category.toUpperCase();
                let textColor = [255, 255, 255];

                if (category === 'p1') {
                    badgeColor = [219, 234, 254]; // blue-100
                    textColor = [30, 64, 175]; // blue-800
                    badgeText = userData?.firstName || (language === 'fr' ? 'Personne 1' : 'Person 1');
                } else if (category === 'p2') {
                    badgeColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                    badgeText = userData?.firstName2 || (language === 'fr' ? 'Personne 2' : 'Person 2');
                } else if (category === 'consolidated' || category === 'con') {
                    badgeColor = [254, 243, 199]; // amber-100
                    textColor = [146, 64, 14]; // amber-800
                    badgeText = language === 'fr' ? 'Consolidé' : 'Consolidated';
                } else if (category === 'shared' || category === 'sho') {
                    badgeColor = [243, 244, 246]; // gray-100
                    textColor = [75, 85, 99]; // gray-600
                    badgeText = language === 'fr' ? 'Partagé' : 'Shared';
                }

                pdf.setFontSize(5);
                const badgeLabelWidth = pdf.getTextWidth(badgeText);
                const badgePaddingX = 1.5;
                const badgePaddingY = 0.5;
                const rectWidth = badgeLabelWidth + badgePaddingX * 2;
                const rectHeight = 4; // Fixed small height

                pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
                pdf.roundedRect(badgeX, rightY - 3, rectWidth, rectHeight, 0.5, 0.5, 'F');
                
                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.text(badgeText, badgeX + badgePaddingX, rightY - 3 + 2.8);
            }

            pdf.setFont('helvetica', 'normal'); // Changed from bold per user request
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9); // 10% smaller than previous 10

            // Manual Right Align for Value
            const valStr = formatNumber(val);
            const valWidth = pdf.getStringUnitWidth(valStr) * 9 / pdf.internal.scaleFactor;
            pdf.text(valStr, cardX + cardWidth - 5 - valWidth, rightY);

            rightY += 5;
        });

        // Ensure totals don't overlap if list is long
        // (In a real app, we might need pagination or careful height calc. Assuming fits for now.)

    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

export default {
    generateLandscapeGraph,
    generateYearByYearBreakdown,
    generateLodgingAnnex,
    generateInvestmentInfo,
    generateLegalWarnings,
    generateFocusPage
};
