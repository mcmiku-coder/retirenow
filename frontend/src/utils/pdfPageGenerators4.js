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

    // Box 1: Final Balance
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
export const generateInvestmentInfo = (pdf, instrumentData, language, pageNum, totalPages) => {
    if (!instrumentData || instrumentData.length === 0) {
        return; // Skip this page if no investments
    }

    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Informations sur les Investissements' : 'Investment Information',
        language === 'fr' ? 'Détails de la gestion du capital' : 'Capital management details',
        20
    );

    yPos += 5;

    instrumentData.forEach((instrument, index) => {
        yPos = checkPageBreak(pdf, yPos, 50);

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${index + 1}. ${instrument.name || 'N/A'}`, 15, yPos);
        yPos += 8;

        const investmentDetails = [
            [language === 'fr' ? 'Montant' : 'Amount', formatCurrency(instrument.amount || 0)],
            [language === 'fr' ? 'Classe d\'Actifs' : 'Asset Class', instrument.assetClass || 'N/A'],
            [language === 'fr' ? 'Rendement Attendu' : 'Expected Return', `${((instrument.expectedReturn || 0) * 100).toFixed(2)}%`],
            [language === 'fr' ? 'Volatilité' : 'Volatility', `${((instrument.volatility || 0) * 100).toFixed(2)}%`]
        ];

        autoTable(pdf, {
            startY: yPos,
            body: investmentDetails,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 60 },
                1: { halign: 'left' }
            },
            margin: { left: 20 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * Page 14: Legal Warnings
 * Key disclaimers and legal information
 */
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

export default {
    generateLandscapeGraph,
    generateYearByYearBreakdown,
    generateLodgingAnnex,
    generateInvestmentInfo,
    generateLegalWarnings
};
