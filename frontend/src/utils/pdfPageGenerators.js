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
export const generateCoverPage = async (pdf, language) => {
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

        // Title
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const title = language === 'fr' ? 'Rapport de Simulation de Retraite' : 'Retirement Simulation Report';
        pdf.text(title, pageWidth / 2, 170, { align: 'center' });

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
        const title = language === 'fr' ? 'Rapport de Simulation de Retraite' : 'Retirement Simulation Report';
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
        language === 'fr' ? 'Table des Matières' : 'Table of Contents',
        null,
        20
    );

    const pageWidth = pdf.internal.pageSize.getWidth();
    yPos += 10;

    // Define TOC entries
    const tocEntries = [
        { key: 'summary', labelEn: 'Simulation Summary', labelFr: 'Résumé de la Simulation' },
        { key: 'personal', labelEn: 'Personal Info & Simulation Choice', labelFr: 'Informations personnelles et choix de la simulation' },
        { key: 'incomeAssets', labelEn: 'Income & Assets', labelFr: 'Revenus et Actifs' },
        { key: 'costDebts', labelEn: 'Costs & Debts', labelFr: 'Dépenses et Dettes' },
        { key: 'benefits', labelEn: 'Retirement Benefits', labelFr: 'Prestations de Retraite' },
        { key: 'dataReview', labelEn: 'Data Review', labelFr: 'Révision des Données' },
        { key: 'graph', labelEn: 'Results Graph (Landscape)', labelFr: 'Graphique des Résultats (Paysage)' },
        { key: 'breakdown', labelEn: 'Year-by-Year Breakdown (Landscape)', labelFr: 'Détail Année par Année (Paysage)' },
        { key: 'lodging', labelEn: 'Lodging Cost Details', labelFr: 'Détails des Frais de Logement' },
        { key: 'investments', labelEn: 'Investment Information', labelFr: 'Informations sur les Investissements', conditional: true },
        { key: 'warnings', labelEn: 'Legal Warnings', labelFr: 'Avertissements Légaux' }
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

        // Calculate positions
        const labelWidth = pdf.getTextWidth(label);
        const pageNumText = String(pageNum);
        const pageNumWidth = pdf.getTextWidth(pageNumText);
        const pageNumX = pageWidth - 20 - pageNumWidth;

        // Draw dots in gray
        const dotsStartX = 20 + labelWidth + 5;
        const dotsEndX = pageNumX - 5;
        const dotsWidth = dotsEndX - dotsStartX;
        const dotCount = Math.max(0, Math.floor(dotsWidth / 3));
        const dots = '.'.repeat(dotCount);

        pdf.setTextColor(150, 150, 150);
        pdf.text(dots, dotsStartX, yPos);

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
        language === 'fr' ? 'Résumé de la Simulation' : 'Simulation Summary',
        null,
        20
    );

    yPos += 10;

    const pageWidth = pdf.internal.pageSize.getWidth();

    // Verdict
    const canQuit = data.finalBalance >= 0;
    const verdictText = canQuit
        ? (language === 'fr' ? 'OUI, VOUS POUVEZ PRENDRE VOTRE RETRAITE' : 'YES, YOU CAN QUIT')
        : (language === 'fr' ? 'NON, PAS ENCORE PRÊT POUR LA RETRAITE' : 'NO, NOT READY TO QUIT YET');

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(canQuit ? 34 : 239, canQuit ? 197 : 68, canQuit ? 94 : 68);
    pdf.text(verdictText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

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
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    const metricsTitle = language === 'fr' ? 'Métriques Clés' : 'Key Metrics';
    pdf.text(metricsTitle, 20, yPos);
    yPos += 5;

    const isCouple = data.isCouple;
    const p1Name = (data.firstName || 'Person 1').toUpperCase();
    const p2Name = (data.firstName2 || 'Person 2').toUpperCase();

    const metricsHead = isCouple
        ? [[language === 'fr' ? 'Champ' : 'Field', p1Name, p2Name]]
        : [[language === 'fr' ? 'Champ' : 'Field', p1Name]];

    const metricsData = [
        [
            language === 'fr' ? 'Âge de Retraite' : 'Retirement Age',
            data.retirementAge || 'N/A'
        ],
        [
            language === 'fr' ? 'Années de Retraite' : 'Years in Retirement',
            data.yearsInRetirement || 'N/A'
        ],
        [
            language === 'fr' ? 'Date de Décès Théorique' : 'Theoretical Death Date',
            formatDate(data.deathDate)
        ]
    ];

    if (isCouple) {
        metricsData[0].push(data.retirementAge2 || 'N/A');
        metricsData[1].push(data.yearsInRetirement2 || 'N/A');
        metricsData[2].push(formatDate(data.deathDate2));
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
                const textStr = String(data.cell.raw).toUpperCase();
                
                let isP1 = false, isP2 = false;
                if (textStr === p1Name || textStr === 'PERSON 1' || textStr === 'PERSONNE 1') isP1 = true;
                else if (textStr === p2Name || textStr === 'PERSON 2' || textStr === 'PERSONNE 2') isP2 = true;

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

    // Add Balance as a separate section below the person-specific metrics
    autoTable(pdf, {
        startY: yPos,
        head: metricsHead,
        body: metricsData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: isCouple ? 60 : 90 },
            1: { halign: 'center' },
            2: { halign: 'center' }
        },
        ...headerHooks
    });

    yPos = pdf.lastAutoTable.finalY + 10;

    // Financial Balance Section
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'Solde Financier' : 'Financial Balance', 20, yPos);
    yPos += 5;

    const financialData = [
        [
            language === 'fr' ? 'Solde Projeté au Décès (Baseline)' : 'Projected Balance at Death (Baseline)',
            formatCurrency(data.finalBaselineBalance !== undefined ? data.finalBaselineBalance : data.finalBalance)
        ]
    ];

    if (data.isInvested && data.final5Balance !== null) {
        financialData.push([
            language === 'fr' ? 'Solde Projeté au Décès (Monte Carlo 5%)' : 'Projected Balance at Death (Monte Carlo 5%)',
            formatCurrency(data.final5Balance)
        ]);
    }

    autoTable(pdf, {
        startY: yPos,
        body: financialData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 100 }
        },
        margin: { left: 20 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // Reference to detailed view
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const refText = language === 'fr'
        ? 'Pour plus de détails, consultez le graphique détaillé à la page 10'
        : 'For detailed breakdown, see the results graph on page 10';
    pdf.text(refText, 20, yPos);

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
