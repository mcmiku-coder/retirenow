/**
 * PDF Page Generators
 * Modular functions for generating each section of the comprehensive PDF report
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    getVerdictImage,
    getLogoImage,
    wrapText,
    addSeparatorLine,
    checkPageBreak,
    getValueColor
} from './pdfHelpers';

/**
 * Convert SVG data URI to PNG data URI using canvas
 * @param {string} svgDataUri - SVG data URI
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {Promise<string>} - PNG data URI
 */
const svgToPng = (svgDataUri, width, height) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = svgDataUri;
    });
};

/**
 * Page 1: Cover Page with Logo
 */
export const generateCoverPage = async (pdf, language, data) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    try {
        // Load the landing page cover image
        const logoPath = getLogoImage();

        // Convert to absolute URL for loading
        const logoUrl = window.location.origin + logoPath;

        // Load the image
        const logoImg = await loadImage(logoUrl);

        // Center logo - make it prominent to showcase the beautiful retro illustration
        const logoWidth = 160;
        const logoHeight = 100;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = 45;

        // Add as JPEG
        pdf.addImage(logoImg, 'JPEG', logoX, logoY, logoWidth, logoHeight);

        // Title logic (Sentence case and Dynamic Names)
        let title = '';
        const isCouple = data?.analysisType === 'couple' || data?.isCouple;
        
        if (language === 'fr') {
            const p1 = data?.firstName || 'Personne 1';
            if (isCouple) {
                const p2 = data?.firstName2 || 'Personne 2';
                title = `Rapport de simulation de retraite pour le couple ${p1} et ${p2}`;
            } else {
                title = `Rapport de simulation de retraite pour ${p1}`;
            }
        } else {
            const p1 = data?.firstName || 'Person 1';
            if (isCouple) {
                const p2 = data?.firstName2 || 'Person 2';
                title = `Retirement simulation report for ${p1} and ${p2}`;
            } else {
                title = `Retirement simulation report for ${p1}`;
            }
        }

        pdf.setFontSize(20); 
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, pageWidth / 2, 170, { align: 'center', maxWidth: pageWidth - 40 });

        // Generated date
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const dateLabel = language === 'fr' ? 'Généré le' : 'Generated on';
        const dateText = `${dateLabel}: ${formatDate(new Date())}`;
        pdf.text(dateText, pageWidth / 2, 185, { align: 'center' });

        // Footer text
        pdf.setFontSize(10);
        pdf.setTextColor(150, 150, 150);
        const footerText = language === 'fr'
            ? 'Document confidentiel - À usage personnel uniquement'
            : 'Confidential Document - For Personal Use Only';
        pdf.text(footerText, pageWidth / 2, pageHeight - 20, { align: 'center' });

    } catch (error) {
        console.error('Error loading cover image:', error);
        // Fallback: text-only cover
        pdf.setFontSize(28);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Can I Quit?', pageWidth / 2, 100, { align: 'center' });

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'normal');
        const title = language === 'fr' ? 'Rapport de simulation de retraite' : 'Retirement simulation report';
        pdf.text(title, pageWidth / 2, 120, { align: 'center' });
    }
};

/**
 * Page 2: Table of Contents
 */
export const generateTableOfContents = (pdf, pageNumbers, language) => {
    // Don't add a new page - we should already be on the correct page
    // pdf.addPage(); // REMOVED - page should already exist

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Table des matières' : 'Table of contents',
        null,
        20
    );

    const pageWidth = pdf.internal.pageSize.getWidth();
    yPos += 10;

    // Define TOC entries
    const tocEntries = [
        { key: 'summary', labelEn: 'Simulation summary', labelFr: 'Résumé de la simulation' },
        { key: 'personal', labelEn: 'Personal info & simulation choice', labelFr: 'Informations personnelles et choix de la simulation' },
        { key: 'incomeAssets', labelEn: 'Income & assets', labelFr: 'Revenus et actifs' },
        { key: 'costDebts', labelEn: 'Costs & debts', labelFr: 'Dépenses et dettes' },
        { key: 'benefits', labelEn: 'Retirement benefits', labelFr: 'Prestations de retraite' },
        { key: 'dataReview', labelEn: 'Data review', labelFr: 'Révision des données' },
        { key: 'graph', labelEn: 'Results graph', labelFr: 'Graphique des résultats' },
        { key: 'breakdown', labelEn: 'Year-by-year breakdown', labelFr: 'Détail année par année' },
        { key: 'lodging', labelEn: 'Lodging cost details', labelFr: 'Détails des frais de logement' },
        { key: 'investments', labelEn: 'Investment information', labelFr: 'Informations sur les investissements', conditional: true },
        { key: 'mcDetails', labelEn: 'Monte-Carlo engine details', labelFr: 'Détails du moteur Monte-Carlo', conditional: true },
        { key: 'warnings', labelEn: 'Legal warnings', labelFr: 'Avertissements légaux' }
    ];

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');

    tocEntries.forEach(entry => {
        // Skip conditional entries if not in pageNumbers
        if (entry.conditional && !pageNumbers[entry.key]) {
            return;
        }

        const label = language === 'fr' ? entry.labelFr : entry.labelEn;
        const pageNum = pageNumbers[entry.key] || '...';

        // Set black color for text
        pdf.setTextColor(0, 0, 0);

        // Draw label
        pdf.text(label, 20, yPos);

        const pageNumText = String(pageNum);
        const pageNumWidth = pdf.getTextWidth(pageNumText);
        const pageNumX = pageWidth - 20 - pageNumWidth;

        // Draw page number in black
        pdf.setTextColor(0, 0, 0);
        pdf.text(pageNumText, pageNumX, yPos);

        yPos += 8;
    });

    addPageNumber(pdf, 2, pageNumbers.total || 14, language);
};

/**
 * Page 3: Simulation Summary with Verdict
 */
export const generateSimulationSummary = async (pdf, data, language, pageNum) => {
    pdf.addPage();

    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'Résumé de la simulation' : 'Simulation summary',
        null,
        20
    );

    yPos += 10;

    const pageWidth = pdf.internal.pageSize.getWidth();

    // Verdict
    // Verdict: If invested, use Monte Carlo 5% balance. If not, use Baseline balance.
    const canQuit = data.isInvested ? (data.final5Balance >= 0) : (data.finalBaselineBalance >= 0);

    // Add verdict image/poster
    try {
        const verdictPath = getVerdictImage(canQuit);
        const verdictUrl = window.location.origin + verdictPath;
        const verdictImg = await loadImage(verdictUrl);

        // Make the poster span 70% of the page width and keep aspect ratio
        const posterWidth = pageWidth * 0.7; 
        const posterHeight = posterWidth * (verdictImg.height / verdictImg.width); 
        const posterX = (pageWidth - posterWidth) / 2;
        const posterY = yPos;

        // Add as JPEG
        pdf.addImage(verdictImg, 'JPEG', posterX, posterY, posterWidth, posterHeight);
        yPos += posterHeight + 15;
    } catch (error) {
        console.error('Error loading verdict image:', error);
        // Fallback: just show text verdict without image
        yPos += 5;
    }

    // --- Financial Balance Section (Reordered: MC first bold, Baseline second normal) ---
    const financialData = [];

    if (data.isInvested && data.final5Balance !== null) {
        financialData.push([
            { 
                content: language === 'fr' ? 'Solde projeté au décès (Monte Carlo 5%)' : 'Projected balance at death (Monte Carlo 5%)',
                styles: { fontStyle: 'bold' } 
            },
            { 
                content: formatCurrency(data.final5Balance),
                styles: { fontStyle: 'bold', halign: 'right' } 
            }
        ]);
    }

    financialData.push([
        { 
            content: language === 'fr' ? 'Solde projeté au décès (baseline)' : 'Projected balance at death (baseline)',
            styles: { fontStyle: 'normal' } 
        },
        { 
            content: formatCurrency(data.finalBaselineBalance !== undefined ? data.finalBaselineBalance : data.finalBalance),
            styles: { fontStyle: 'normal', halign: 'right' } 
        }
    ]);

    const tableWidth = 140; // Fixed width for centering
    const leftMargin = (pageWidth - tableWidth) / 2;

    autoTable(pdf, {
        startY: yPos,
        body: financialData,
        theme: 'plain',
        tableWidth: tableWidth,
        styles: { fontSize: 12, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 40 } // Give enough space for right align
        },
        margin: { left: leftMargin },
        didParseCell: function(cellData) {
            // Apply conditional coloring based on the baseline or MC values
            let val = 0;
            const hasMC = data.isInvested && data.final5Balance !== null;
            
            if (hasMC) {
                if (cellData.row.index === 0) {
                    val = data.final5Balance;
                } else {
                    val = data.finalBaselineBalance !== undefined ? data.finalBaselineBalance : data.finalBalance;
                }
            } else {
                val = data.finalBaselineBalance !== undefined ? data.finalBaselineBalance : data.finalBalance;
            }

            if (val >= 0) {
                cellData.cell.styles.textColor = [34, 197, 94]; // Green (34, 197, 94)
            } else {
                cellData.cell.styles.textColor = [239, 68, 68]; // Red (239, 68, 68)
            }
        }
    });

    yPos = pdf.lastAutoTable.finalY + 8;

    // Reference to detailed view
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const refText = language === 'fr'
        ? 'Pour plus de détails, consultez le graphique détaillé à la page 10'
        : 'For detailed breakdown, see the results graph on page 10';
    
    const refTextWidth = pdf.getTextWidth(refText);
    const refTextX = (pageWidth - refTextWidth) / 2;
    yPos += 5;

    // --- Key Metrics Section (Restored & Refined) ---
    // NO TITLE RENDERED HERE

    const isCouple = data.isCouple;
    const p1Fallback = language === 'fr' ? 'Personne 1' : 'Person 1';
    const p2Fallback = language === 'fr' ? 'Personne 2' : 'Person 2';
    const p1Name = data.firstName || p1Fallback;
    const p2Name = data.firstName2 || p2Fallback;

    const metricsHead = isCouple
        ? [['', p1Name, p2Name]]
        : [['', p1Name]];

    const metricsData = [
        [
            language === 'fr' ? 'Âge de retraite' : 'Retirement age',
            data.retirementAge || 'N/A'
        ],
        [
            language === 'fr' ? 'Années de retraite' : 'Years in retirement',
            data.yearsInRetirement || 'N/A'
        ]
        // [REMOVED] Theoretical Death Date row as per user request
    ];

    if (isCouple) {
        metricsData[0].push(data.retirementAge2 || 'N/A');
        metricsData[1].push(data.yearsInRetirement2 || 'N/A');
    }

    const headerHooks = {
        didParseCell: function(data) {
            if (data.section === 'head' && data.column.index > 0) {
                data.cell.styles.halign = 'center';
                // Make text match background so it disappears, we draw badge on top
                data.cell.styles.textColor = data.cell.styles.fillColor || [255, 255, 255];
            }
        },
        didDrawCell: function(data) {
            if (data.section === 'head' && data.column.index > 0 && data.cell.raw) {
                const pdf = data.doc;
                const textStr = String(data.cell.raw);
                
                let isP1 = false, isP2 = false;
                if (textStr === p1Name || textStr === 'Person 1' || textStr === 'Personne 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'Person 2' || textStr === 'Personne 2') isP2 = true;

                if (!isP1 && !isP2) return;

                let bgColor = [219, 234, 254]; // blue-100
                let textColor = [30, 64, 175]; // blue-800
                if (isP2) {
                    bgColor = [243, 232, 255]; // purple-100
                    textColor = [107, 33, 168]; // purple-800
                }

                // Re-paint cell background slightly inset to clear text remnants
                const resolvedBg = data.cell.styles.fillColor || [255, 255, 255];
                pdf.setFillColor(resolvedBg[0], resolvedBg[1], resolvedBg[2]);
                pdf.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                pdf.setFont('helvetica', 'bold');
                const fontSize = (data.cell.styles.fontSize || 10) - 1.5;
                pdf.setFontSize(fontSize);
                const textWidth = pdf.getTextWidth(textStr);
                
                const badgePaddingX = 2; 
                const badgePaddingY = 0.8; 
                const rectWidth = textWidth + badgePaddingX * 2; 
                const rectHeight = fontSize * 0.4 + badgePaddingY * 2; 
                const badgeX = data.cell.x + (data.cell.width - rectWidth) / 2;
                const badgeY = data.cell.y + (data.cell.height - rectHeight) / 2;

                pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                pdf.roundedRect(badgeX, badgeY, rectWidth, rectHeight, 1, 1, 'F');

                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                pdf.text(textStr, badgeX + badgePaddingX, badgeY + badgePaddingY + fontSize * 0.35);
            }
        }
    };

    autoTable(pdf, {
        startY: yPos,
        head: metricsHead,
        body: metricsData,
        theme: 'plain',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: isCouple ? 60 : 90 },
            1: { halign: 'center' },
            2: { halign: 'center' }
        },
        ...headerHooks,
        didDrawCell: function(data) {
            if (headerHooks.didDrawCell) headerHooks.didDrawCell(data);
            const pdf = data.doc;
            pdf.saveGraphicsState();
            pdf.setLineWidth(0.1);
            pdf.setDrawColor(180, 180, 180);
            pdf.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
            pdf.restoreGraphicsState();
        }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    addPageNumber(pdf, pageNum, data.totalPages || 14, language);
};

/**
 * Helper function to load image from URL
 */
const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
};

export default {
    generateCoverPage,
    generateTableOfContents,
    generateSimulationSummary
};
