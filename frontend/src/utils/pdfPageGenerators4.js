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
    const title = language === 'fr' ? 'Graphique des Résultats de Simulation' : 'Simulation Results Graph';
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
        pdf.text(language === 'fr' ? 'SIMULATION MONTE-CARLO SUR INVESTISSEMENTS' : 'MONTE-CARLO SIMULATION ON INVESTMENTS', boxStartX + boxWidth / 2, yPos + 6, { align: 'center' });

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
        pdf.text(language === 'fr' ? 'Solde final projeté (5%)' : 'Projected Final Balance (5%)', boxStartX + boxWidth / 2, yPos + 17, { align: 'center' });


        // Box 2: Baseline (Cash Only)
        // Border only (Gray), No Fill
        pdf.setDrawColor(107, 114, 128); // border-gray-500
        pdf.roundedRect(boxStartX + boxWidth + spacing, yPos, boxWidth, boxHeight, 2, 2, 'S');

        // Title
        pdf.setTextColor(107, 114, 128); // text-gray-500
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'SIMULATION AVEC CASH SEULEMENT' : 'SIMULATION WITH ONLY CASH (NO INVESTMENT)', boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 6, { align: 'center' });

        // Value
        const valBase = Math.round(summaryData.finalBaselineBalance || 0);
        pdf.setTextColor(valBase >= 0 ? 22 : 163, valBase >= 0 ? 163 : 30, valBase >= 0 ? 74 : 30); // Green/Red
        pdf.setFontSize(12);
        pdf.text(formatCurrency(valBase), boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 12, { align: 'center' });

        // Subtitle
        pdf.setTextColor(107, 114, 128); // text-gray-500
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(language === 'fr' ? 'Solde final projeté' : 'Projected Final Balance', boxStartX + boxWidth + spacing + boxWidth / 2, yPos + 17, { align: 'center' });

    } else {
        // STANDARD LAYOUT

        // Box 1: Final Balance
        // pdf.setFillColor(summaryData.finalBalance >= 0 ? 34 : 239, summaryData.finalBalance >= 0 ? 197 : 68, summaryData.finalBalance >= 0 ? 94 : 68);
        // User screenshot shows simple Green box. Let's stick to standard colors but clean up.
        pdf.setFillColor(summaryData.finalBalance >= 0 ? 34 : 239, summaryData.finalBalance >= 0 ? 197 : 68, summaryData.finalBalance >= 0 ? 94 : 68);
        pdf.rect(startX, yPos, boxWidth, boxHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Solde Final' : 'Final Balance', startX + boxWidth / 2, yPos + 8, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(formatCurrency(summaryData.finalBalance), startX + boxWidth / 2, yPos + 15, { align: 'center' });

        // Box 2: Peak Wealth
        pdf.setFillColor(52, 152, 219);
        pdf.rect(startX + boxWidth + boxSpacing, yPos, boxWidth, boxHeight, 'F');
        pdf.text(language === 'fr' ? 'Richesse Max' : 'Peak Wealth', startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 8, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(formatCurrency(summaryData.peakWealth || 0), startX + boxWidth + boxSpacing + boxWidth / 2, yPos + 15, { align: 'center' });

        // Box 3: Years in Retirement
        pdf.setFillColor(142, 68, 173);
        pdf.rect(startX + (boxWidth + boxSpacing) * 2, yPos, boxWidth, boxHeight, 'F');
        pdf.setFontSize(8);
        pdf.text(language === 'fr' ? 'Années de Retraite' : 'Years in Retirement', startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 8, { align: 'center' });
        pdf.setFontSize(10);
        pdf.text(String(summaryData.yearsInRetirement || 0), startX + (boxWidth + boxSpacing) * 2 + boxWidth / 2, yPos + 15, { align: 'center' });
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
export const generateYearByYearBreakdown = (pdf, yearlyData, language, pageNum, totalPages) => {
    pdf.addPage('a4', 'landscape');

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Détail Année par Année' : 'Year-by-Year Breakdown',
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

    // Build header row with abbreviated names
    const headers = [
        language === 'fr' ? 'An' : 'Yr',
        language === 'fr' ? 'Âge' : 'Age'
    ];

    // Add income columns (abbreviated)
    const incomeColumns = Array.from(allIncomeColumns);
    incomeColumns.forEach(col => {
        // Abbreviate long names
        const abbrev = col.length > 12 ? col.substring(0, 10) + '.' : col;
        headers.push(abbrev);
    });

    // Add asset columns (abbreviated)
    const assetColumns = Array.from(allAssetColumns);
    assetColumns.forEach(col => {
        const abbrev = col.length > 12 ? col.substring(0, 10) + '.' : col;
        headers.push(abbrev);
    });

    // Add cost columns (abbreviated)
    const costColumns = Array.from(allCostColumns);
    costColumns.forEach(col => {
        const abbrev = col.length > 12 ? col.substring(0, 10) + '.' : col;
        headers.push(abbrev);
    });

    // Add summary columns
    headers.push(
        language === 'fr' ? 'Ann.Bal' : 'Ann.Bal',
        language === 'fr' ? 'Cum.Bal' : 'Cum.Bal'
    );

    // Build data rows
    const tableData = yearlyData.map(year => {
        const row = [
            String(year.year || ''),
            String(year.age || '')
        ];

        // Add income values (no CHF prefix to save space)
        incomeColumns.forEach(col => {
            const val = year.incomeBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(val));
        });

        // Add asset values (no CHF prefix to save space)
        assetColumns.forEach(col => {
            const val = year.activatedOwingsBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(val));
        });

        // Add cost values (negative, no CHF prefix to save space)
        costColumns.forEach(col => {
            const val = year.costBreakdown?.[col] || 0;
            row.push(val === 0 ? '' : formatNumber(-val));
        });

        // Add summary values (no CHF prefix to save space)
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

    // Year and Age get fixed small widths
    const yearColWidth = 15;
    const ageColWidth = 12;
    const remainingWidth = availableWidth - yearColWidth - ageColWidth;
    const dataColWidth = Math.max(12, remainingWidth / (totalColumns - 2));

    const columnStyles = {};
    headers.forEach((_, index) => {
        // Center-align all columns for better readability in compact layout
        if (index === 0) {
            columnStyles[index] = { halign: 'center', cellWidth: yearColWidth };
        } else if (index === 1) {
            columnStyles[index] = { halign: 'center', cellWidth: ageColWidth };
        } else {
            columnStyles[index] = { halign: 'center', cellWidth: dataColWidth };
        }
    });

    autoTable(pdf, {
        startY: yPos,
        head: [headers],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontSize: 5,
            fontStyle: 'bold',
            cellPadding: 0.5,
            minCellHeight: 8,
            halign: 'center'  // Center-align header text
        },
        styles: {
            fontSize: 4.5,
            cellPadding: 0.3,
            minCellHeight: 4,
            overflow: 'linebreak'
        },
        columnStyles,
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
                language === 'fr' ? `Annexe : Frais de Logement - Propriété ${index + 1}` : `Annex: Lodging Costs - Property ${index + 1}`,
                null,
                20
            );

            yPos += 5;

            // Property value
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(language === 'fr' ? 'Valeur du Bien' : 'Property Value', 15, yPos);
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
            pdf.text(language === 'fr' ? 'Frais d\'Entretien' : 'Maintenance Costs', 15, yPos);
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
                    theme: 'striped',
                    styles: { fontSize: 9 },
                    columnStyles: {
                        1: { halign: 'right' }
                    },
                    margin: { left: 20 }
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
                [language === 'fr' ? 'Valeur Totale du Bien' : 'Total Property Value', formatCurrency(totalAsset)],
                [language === 'fr' ? 'Total Hypothèques' : 'Total Mortgages', formatCurrency(totalMortgage)],
                [language === 'fr' ? 'Valeur Nette' : 'Net Value', formatCurrency(netValue)],
                [language === 'fr' ? 'Frais d\'Entretien Mensuels' : 'Monthly Maintenance Costs', formatCurrency(totalMaintenance)]
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
            language === 'fr' ? 'Annexe : Frais de Logement - Locataire' : 'Annex: Lodging Costs - Tenant',
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
        pdf.text(language === 'fr' ? 'Frais du Locataire' : 'Tenant Expenses', 15, yPos);
        yPos += 8;

        if (tenantExpenses.length > 0) {
            const expenseData = tenantExpenses.map(exp => [
                exp.name || 'N/A',
                formatCurrency(exp.amount || 0)
            ]);

            autoTable(pdf, {
                startY: yPos,
                body: expenseData,
                theme: 'striped',
                styles: { fontSize: 9 },
                columnStyles: {
                    1: { halign: 'right' }
                },
                margin: { left: 20 }
            });

            yPos = pdf.lastAutoTable.finalY + 10;
        }

        // Total
        const totalExpenses = tenantExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const totalMonthly = rentAmount + totalExpenses;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${language === 'fr' ? 'Total Mensuel' : 'Total Monthly'}: ${formatCurrency(totalMonthly)}`, 20, yPos);

        addPageNumber(pdf, pageNum, totalPages, language);
    }
};

/**
 * Page 13: Investment Information (Conditional)
 * Only included if user has defined investments in Capital Management
 */
export const generateInvestmentInfo = (pdf, instrumentData, language, pageNum, totalPages, monteCarloData, baselineProjection) => {
    // USE MONTE CARLO DATA IF AVAILABLE (It contains the specific product selections)
    // Structure: monteCarloData.details.portfolioAssets (because ScenarioResult wraps it)
    const simulationDetails = monteCarloData?.details;
    const assetsToDisplay = simulationDetails?.portfolioAssets || [];

    if (assetsToDisplay.length === 0 && instrumentData.length === 0) {
        return; // Skip if nothing to show
    }

    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations sur les Investissements' : 'Investment Information',
        language === 'fr' ? 'Détails de la gestion du capital' : 'Capital management details',
        20
    );

    yPos += 10;

    // 1. INVESTMENT DETAILS TABLE
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '1. Détail des Instruments' : '1. Instrument Details', 15, yPos);
    yPos += 8;

    const detailsHeaders = [
        language === 'fr' ? 'Actif' : 'Asset',
        language === 'fr' ? 'Produit Sélectionné' : 'Selected Product',
        language === 'fr' ? 'Montant' : 'Amount',
        language === 'fr' ? 'Début' : 'Start Date',
        language === 'fr' ? 'Stratégie' : 'Strategy'
    ];

    // If using MC data, we need to map back to original asset name if possible, or use product name
    const detailsData = [];

    if (assetsToDisplay.length > 0) {
        assetsToDisplay.forEach(item => {
            // item structure: { assetId, product: {...}, amount, availabilityDate, weight }
            // Find original asset name from instrumentData if possible
            const originalAsset = instrumentData.find(i => i.id === item.assetId);

            detailsData.push([
                originalAsset ? originalAsset.name : (language === 'fr' ? 'Investissement' : 'Investment'),
                item.product.name, // The SPECIFIC product name (e.g., UBS ETF...)
                formatCurrency(item.amount || 0),
                item.availabilityDate ? formatDate(item.availabilityDate) : 'N/A',
                'Invested'
            ]);
        });
    } else {
        // Fallback if no MC data (display generic info)
        instrumentData.forEach(inst => {
            detailsData.push([
                inst.name,
                language === 'fr' ? 'Non spécifié' : 'Not specified',
                formatCurrency(inst.adjustedAmount || inst.amount || 0),
                inst.startDate ? formatDate(inst.startDate) : 'N/A',
                inst.strategy || 'N/A'
            ]);
        });
    }

    autoTable(pdf, {
        startY: yPos,
        head: [detailsHeaders],
        body: detailsData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8 },
        columnStyles: { 2: { halign: 'right' } },
        margin: { left: 15, right: 15 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // 2. STATISTICAL INFORMATION (Specific to selected products)
    yPos = checkPageBreak(pdf, yPos, 60);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '2. Statistiques Historiques (25 ans)' : '2. Historical Statistics (25 Years)', 15, yPos);
    yPos += 8;

    const statsHeaders = [
        language === 'fr' ? 'Produit' : 'Product',
        language === 'fr' ? 'Rendement Moy.' : 'Avg Return',
        language === 'fr' ? 'Volatilité' : 'Volatility',
        language === 'fr' ? 'Max Perte 3 ans' : 'Max 3Y Loss',
        language === 'fr' ? 'Max Gain 3 ans' : 'Max 3Y Gain'
    ];

    const statsData = [];
    if (assetsToDisplay.length > 0) {
        assetsToDisplay.map(item => {
            const p = item.product;
            // Check if metrics exist
            if (!p || !p.metrics) return statsData.push([item.product?.name || 'N/A', '-', '-', '-', '-']);

            statsData.push([
                p.name, // Specific product name
                `${p.metrics.avgReturn}%`,
                `${p.metrics.avgVolatility}%`,
                { content: `${p.metrics.max3YLoss}%`, styles: { textColor: [220, 38, 38] } }, // Red
                { content: `${p.metrics.max3YGain}%`, styles: { textColor: [22, 163, 74] } }  // Green
            ]);
        });
    } else {
        statsData.push([language === 'fr' ? 'Aucun produit sélectionné' : 'No product selected', '-', '-', '-', '-']);
    }

    autoTable(pdf, {
        startY: yPos,
        head: [statsHeaders],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [142, 68, 173], textColor: 255, fontSize: 9 }, // Purple header
        styles: { fontSize: 8 },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // 3. MONTE CARLO AUDIT (Specific Matrix)
    yPos = checkPageBreak(pdf, yPos, 80);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '3. Audit de la Simulation Monte-Carlo' : '3. Monte-Carlo Simulation Audit', 15, yPos);
    yPos += 8;

    // Explanation Text
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(50, 50, 50);
    const explanation = language === 'fr'
        ? "Cette simulation utilise un modèle de Mouvement Brownien Géométrique (GBM) calibré sur 25 ans de données historiques. La matrice de corrélation ci-dessous représente les interdépendances réelles utilisées pour vos produits sélectionnés."
        : "This simulation uses a Geometric Brownian Motion (GBM) model calibrated on 25 years of historical data. The correlation matrix below represents the actual interdependencies used for your selected products.";

    const splitText = pdf.splitTextToSize(explanation, pdf.internal.pageSize.getWidth() - 30);
    pdf.text(splitText, 15, yPos);
    yPos += splitText.length * 4 + 8;

    // Correlation Matrix Display (Specific from Simulation)
    if (simulationDetails && simulationDetails.correlationMatrix && assetsToDisplay.length > 0) {
        yPos = checkPageBreak(pdf, yPos, 60);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Matrice de Corrélation (Produits Sélectionnés)' : 'Correlation Matrix (Selected Products)', 15, yPos);
        yPos += 5;

        // Use Product Names for headers (shortened if needed)
        const productNames = assetsToDisplay.map(a => a.product.ticker || a.product.name.substring(0, 10));
        const matrixHeaders = ['', ...productNames];

        // Map the raw matrix (which is NxN matching portfolioAssets)
        const matrixData = simulationDetails.correlationMatrix.map((row, i) => {
            const rowName = productNames[i];
            const rowData = [rowName];
            row.forEach(val => rowData.push(val.toFixed(2)));
            return rowData;
        });

        autoTable(pdf, {
            startY: yPos,
            head: [matrixHeaders],
            body: matrixData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 8, halign: 'center' },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
            styles: { fontSize: 7, halign: 'center' },
            margin: { left: 15, right: 15 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    }

    // Parameters Used
    if (simulationDetails && simulationDetails.metadata) {
        yPos = checkPageBreak(pdf, yPos, 40);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(language === 'fr' ? 'Paramètres de Simulation' : 'Simulation Parameters', 15, yPos);
        yPos += 5;

        const paramsData = [
            [language === 'fr' ? 'Itérations' : 'Iterations', simulationDetails.metadata.iterations || '10,000'],
            [language === 'fr' ? 'Distribution' : 'Distribution', 'Student-t (df=5) [Fat Tails]'],
            [language === 'fr' ? 'Confiance' : 'Confidence Level', '95%'],
            [language === 'fr' ? 'Méthode' : 'Method', 'Cholesky Decomposition (Multi-asset)']
        ];

        autoTable(pdf, {
            startY: yPos,
            body: paramsData,
            theme: 'plain',
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
            margin: { left: 15 }
        });
    }

    // 4. VALUE ANALYSIS (NEW)
    if (baselineProjection?.yearlyBreakdown && monteCarloData?.p5) {
        yPos = checkPageBreak(pdf, yPos, 60);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(41, 128, 185);
        pdf.text(language === 'fr' ? '4. Analyse de la Valeur Créée' : '4. Value Creation Analysis', 15, yPos);
        yPos += 8;

        // Calculate Delta
        const breakdown = baselineProjection.yearlyBreakdown;
        const lastRow = breakdown[breakdown.length - 1];
        const lastYear = lastRow.year;

        // Find matching MC year (P5 = Pessimistic)
        const mcRow = monteCarloData.p5.find(y => y.year === lastYear) || monteCarloData.p5[monteCarloData.p5.length - 1];

        if (mcRow && lastRow) {
            const baselineTotal = lastRow.total;
            const baselineInvested = lastRow.invested || 0;
            const investedTotal = (baselineTotal - baselineInvested) + mcRow.value;
            const delta = investedTotal - baselineTotal;

            const analysisHeaders = [
                language === 'fr' ? 'Scénario' : 'Scenario',
                language === 'fr' ? 'Résultat Final' : 'Final Result',
                language === 'fr' ? 'Différence' : 'Difference'
            ];

            const analysisData = [
                [
                    language === 'fr' ? 'Sans Investissement (Cash)' : 'Baseline (Cash Only)',
                    formatCurrency(baselineTotal),
                    '-'
                ],
                [
                    language === 'fr' ? 'Stratégie Investie (Pessimiste 5%)' : 'Invested Strategy (Pessimistic 5%)',
                    formatCurrency(investedTotal),
                    formatCurrency(delta)
                ]
            ];

            autoTable(pdf, {
                startY: yPos,
                head: [analysisHeaders],
                body: analysisData,
                theme: 'grid',
                headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 9 }, // Green header
                styles: { fontSize: 9, fontStyle: 'bold' },
                columnStyles: { 2: { textColor: delta > 0 ? [22, 163, 74] : [220, 38, 38] } }, // Green/Red text
                margin: { left: 15, right: 15 }
            });

            yPos = pdf.lastAutoTable.finalY + 8;

            // Explanation
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(80, 80, 80);

            const gapExpl = language === 'fr'
                ? `La différence de ${formatCurrency(delta)} s'explique par l'effet des intérêts composés sur la durée de la simulation. Même dans un scénario de marché pessimiste (5ème percentile), le rendement généré par vos actifs diversifiés permet de compenser l'érosion du capital et de couvrir les déficits de trésorerie qui, sans investissement, conduiraient à un solde négatif.`
                : `The difference of ${formatCurrency(delta)} is explained by the compound interest effect over the simulation duration. Even in a pessimistic market scenario (5th percentile), the returns generated by your diversified assets offset capital erosion and cover cash flow deficits that would otherwise lead to a negative balance in the cash-only scenario.`;

            const splitExpl = pdf.splitTextToSize(gapExpl, pdf.internal.pageSize.getWidth() - 30);
            pdf.text(splitExpl, 15, yPos);
            yPos += splitExpl.length * 4 + 5;
        }
    }

    addPageNumber(pdf, pageNum, totalPages, language);
};

export const generateLegalWarnings = (pdf, language, pageNum, totalPages) => {
    pdf.addPage();

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
export const generateFocusPage = (pdf, focusYears, chartData, language, pageNum, totalPages) => {
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

            // Truncate name if too long (Increased limit)
            const displayName = name.length > 35 ? name.substring(0, 35) + '...' : name;
            pdf.text(displayName, cardX + 5, leftY);

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);

            // Manual Right Align for Value
            const valStr = formatNumber(val);
            const valWidth = pdf.getStringUnitWidth(valStr) * 7.5 / pdf.internal.scaleFactor;
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

                const displayName = name.length > 35 ? name.substring(0, 35) + '...' : name;
                pdf.text(displayName, cardX + 5, leftY);

                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);

                // Manual Right Align for Value
                const valStr = formatNumber(val);
                const valWidth = pdf.getStringUnitWidth(valStr) * 7.5 / pdf.internal.scaleFactor;
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

            const displayName = name.length > 35 ? name.substring(0, 35) + '...' : name;
            pdf.text(displayName, rightColX, rightY);

            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);

            // Manual Right Align for Value
            const valStr = formatNumber(val);
            const valWidth = pdf.getStringUnitWidth(valStr) * 7.5 / pdf.internal.scaleFactor;
            pdf.text(valStr, cardX + cardWidth - 5 - valWidth, rightY);

            rightY += 5;
        });

        // Ensure totals don't overlap if list is long
        // (In a real app, we might need pagination or careful height calc. Assuming fits for now.)

    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

export default {
    generateLandscapeGraph,
    generateYearByYearBreakdown,
    generateLodgingAnnex,
    generateInvestmentInfo,
    generateLegalWarnings,
    generateFocusPage
};
