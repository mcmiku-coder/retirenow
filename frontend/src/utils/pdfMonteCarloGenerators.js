/**
 * PDF Monte Carlo Generators
 * Specialized pages for Monte Carlo transparency and conservative outcomes.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    addPageNumber,
    addPageHeader,
    formatCurrency,
    formatNumber,
    formatDate,
    checkPageBreak
} from './pdfHelpers';
import { toUtcMonthStart, getSimulationStartDate, getYearStartMonthIndex, getYearEndMonthIndex, monthIndexToYearMonth } from './simulationDateUtils';
import {
    calculateRecomposedBaselineAtIndex,
    calculateRecomposedTotalAtIndex,
    getPrincipalAtIndex,
    calculateMonthlyDeterministicSeries
} from './projectionCalculator';


/**
 * Page B: Conservative Outcomes Only
 */
export const generateConservativeOutcomes = (pdf, simulationResult, projection, chartData, language, pageNum, totalPages) => {
    pdf.addPage();
    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'RÃ©sultats conservateurs (stress)' : 'Conservative portfolio outcomes',
        null,
        20
    );
    yPos += 15;
    const pageWidth = pdf.internal.pageSize.getWidth();

    // [Phase 9b] Normalize strictly to UTC Month Start
    const simStartDate = toUtcMonthStart(simulationResult.simulationStartDate);
    console.log("[PDF SIM START UTC CHECK]", { normalizedISO: simStartDate.toISOString() });
    const horizonMonths = simulationResult.horizonMonths;

    // RULE 2 & 3: Ensure detSeries is available
    const detSeries = simulationResult.detSeries || calculateMonthlyDeterministicSeries(projection, simStartDate, horizonMonths);

    // B1 - Prepare Recomposed Plot (P5 & P10 TOTALS)
    const chartHeight = 80;
    const chartWidth = pageWidth - 40;
    const chartX = 20;
    const chartY = yPos;

    pdf.setDrawColor(200, 200, 200);
    pdf.rect(chartX, chartY, chartWidth, chartHeight);

    // Build Plot Series at Monthly Granularity
    const plotP5 = [];
    const plotP10 = [];
    for (let m = 0; m <= horizonMonths; m++) {
        plotP5.push(calculateRecomposedTotalAtIndex(simulationResult, detSeries, m, 'p5'));
        plotP10.push(calculateRecomposedTotalAtIndex(simulationResult, detSeries, m, 'p10'));
    }

    if (plotP5.length > 0) {
        let minVal = Infinity;
        let maxVal = -Infinity;

        [...plotP5, ...plotP10].forEach(v => {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        });

        const range = maxVal - minVal;
        const yMin = Math.max(0, minVal - range * 0.1);
        const yMax = maxVal + range * 0.1;

        const getX = (m) => chartX + (m / horizonMonths) * chartWidth;
        const getY = (val) => chartY + chartHeight - ((val - yMin) / (yMax - yMin)) * chartHeight;

        pdf.setLineWidth(0.5);
        pdf.setDrawColor(255, 165, 0); // Orange P10
        for (let m = 1; m <= horizonMonths; m++) {
            pdf.line(getX(m - 1), getY(plotP10[m - 1]), getX(m), getY(plotP10[m]));
        }

        pdf.setDrawColor(220, 20, 60); // Red P5
        for (let m = 1; m <= horizonMonths; m++) {
            pdf.line(getX(m - 1), getY(plotP5[m - 1]), getX(m), getY(plotP5[m]));
        }

        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(255, 165, 0);
        pdf.circle(chartX + 10, chartY + 10, 2, 'F');
        pdf.text('p10 (conservative total)', chartX + 15, chartY + 11);

        pdf.setFillColor(220, 20, 60);
        pdf.circle(chartX + 10, chartY + 20, 2, 'F');
        pdf.text('p5 (extreme stress total)', chartX + 15, chartY + 21);
    }
    yPos += chartHeight + 15;

    // B2 - Year-by-Year Table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'D\u00e9tail annuel (stress)' : 'Annual breakdown (stress)', 20, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    const methodNote = language === 'fr'
        ? "Note: 'Libre' = Cash-only baseline B(t). 'Totaux' = B(t) + Ã©volution boursiÃ¨re."
        : "Note: 'Cash-only' = Baseline B(t). 'Totals' = B(t) + portfolio performance.";
    pdf.text(methodNote, 20, yPos);
    yPos += 12;
    pdf.setTextColor(0, 0, 0);

    const startYear = simulationResult.startYear;
    const endYear = startYear + Math.ceil(horizonMonths / 12);
    const tableRows = [];

    const getInvVal = (pKey, idx) => {
        const arr = (simulationResult.percentiles && simulationResult.percentiles[pKey]) ? simulationResult.percentiles[pKey] : [];
        const safeIdx = Math.min(Math.max(0, idx), arr.length - 1);
        return arr[safeIdx] || 0;
    };

    const investedCashflows = simulationResult.investedCashflows || [];

    for (let year = startYear; year <= endYear; year++) {
        const yearStartIdx = getYearStartMonthIndex(simStartDate, year);
        const yearEndIdx = getYearEndMonthIndex(simStartDate, year);

        const yearFlows = investedCashflows
            .filter(f => f.monthIndex >= yearStartIdx && f.monthIndex < yearEndIdx);

        // ROW 1: OPTIONAL INJECTION (Start of Year event)
        if (yearFlows.length > 0) {
            const firstFlow = yearFlows[0];
            const idx = firstFlow.monthIndex;

            const B = calculateRecomposedBaselineAtIndex(simulationResult, detSeries, idx);
            const T5 = calculateRecomposedTotalAtIndex(simulationResult, detSeries, idx, 'p5');
            const T10 = calculateRecomposedTotalAtIndex(simulationResult, detSeries, idx, 'p10');

            const label = language === 'fr'
                ? `> D\u00e9but (Apr\u00e8s apport ${formatCurrency(firstFlow.amount)})`
                : `> Start (After injection ${formatCurrency(firstFlow.amount)})`;

            tableRows.push([
                year.toString(),
                `${label} | ${language === 'fr' ? 'Libre' : 'Cash'}: ${formatCurrency(B)}`,
                formatCurrency(getInvVal('p10', idx)),
                formatCurrency(getInvVal('p5', idx)),
                formatCurrency(T10),
                formatCurrency(T5)
            ]);
        }

        // ROW 2: YEAR END
        const B_end = calculateRecomposedBaselineAtIndex(simulationResult, detSeries, yearEndIdx);
        const T5_end = calculateRecomposedTotalAtIndex(simulationResult, detSeries, yearEndIdx, 'p5');
        const T10_end = calculateRecomposedTotalAtIndex(simulationResult, detSeries, yearEndIdx, 'p10');

        const yearEndYM = monthIndexToYearMonth(simStartDate, yearEndIdx);

        // [Phase 8] PDF TOTAL SEMANTICS - Fixed arithmetic (T5_end already includes B_end)
        if (year <= startYear + 2 || yearFlows.length > 0) {
            console.log("[PDF TOTAL SEMANTICS]", {
                year,
                yearEndIdx,
                yearEndYM,
                B: Math.round(B_end),
                mc5Total: Math.round(T5_end)
            });
        }

        tableRows.push([
            yearFlows.length > 0 ? "" : year.toString(),
            language === 'fr' ? `Fin (Libre/Cash: ${formatCurrency(B_end)})` : `End (Cash-Only: ${formatCurrency(B_end)})`,
            formatCurrency(getInvVal('p10', yearEndIdx)),
            formatCurrency(getInvVal('p5', yearEndIdx)),
            formatCurrency(T10_end),
            formatCurrency(T5_end)
        ]);
    }

    autoTable(pdf, {
        startY: yPos,
        head: [[
            language === 'fr' ? 'Ann\u00e9e' : 'Year',
            language === 'fr' ? 'Type / situation cash' : 'Event / cash-only base',
            'Invested (p10)',
            'Invested (p5)',
            'Total (p10)',
            'Total (p5)'
        ]],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, halign: 'right' },
        columnStyles: { 0: { halign: 'left', cellWidth: 15 }, 1: { halign: 'left', cellWidth: 60 } },
        margin: { left: 20, right: 20 }
    });

    yPos = pdf.lastAutoTable.finalY + 15;

    // B3 - Metrics
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(language === 'fr' ? 'MÃ©triques finales de stress' : 'Final stress metrics', 20, yPos);
    yPos += 8;

    const finalIdx = horizonMonths;
    const T5_final = calculateRecomposedTotalAtIndex(simulationResult, detSeries, finalIdx, 'p5');
    const T10_final = calculateRecomposedTotalAtIndex(simulationResult, detSeries, finalIdx, 'p10');

    // Drawdown stays on invested components for risk visibility
    const computeDD = (arr) => {
        let maxDD = 0, peak = -Infinity;
        arr.forEach(v => {
            if (v > peak) peak = v;
            if (peak > 0) {
                const dd = (peak - v) / peak;
                if (dd > maxDD) maxDD = dd;
            }
        });
        return maxDD;
    };

    const metrics = [
        [`Final wealth (p10 conservative)`, formatCurrency(T10_final)],
        [`Final wealth (p5 extreme)`, formatCurrency(T5_final)],
        [`Max drawdown (p10 portfolio)`, `-${(computeDD(simulationResult.percentiles?.p10 || []) * 100).toFixed(1)}%`],
        [`Max drawdown (p5 portfolio)`, `-${(computeDD(simulationResult.percentiles?.p5 || []) * 100).toFixed(1)}%`]
    ];

    metrics.forEach(([label, val]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${label}:`, 25, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.text(val, 100, yPos);
        yPos += 6;
    });

    addPageNumber(pdf, pageNum, totalPages, language);
};

/**
 * MC Details Page: Full Engine Transparency (Compact â€” 1-2 portrait pages)
 * Mirrors the MonteCarloDetails.js page content.
 * Data source: monteCarloProjections.details.stats
 */
export const generateMCDetailsPage = (pdf, monteCarloProjections, language, pageNum, totalPages) => {
    const stats = monteCarloProjections?.details?.stats || monteCarloProjections?.stats;
    if (!stats) return;

    const { assetStats, historyInfo, settings, covMatrix, corrMatrix } = stats;

    pdf.addPage('a4', 'portrait');
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = addPageHeader(
        pdf,
        language === 'fr' ? 'D\u00e9tails du moteur Monte-Carlo' : 'Monte-Carlo engine details',
        language === 'fr' ? 'Param\u00e8tres, statistiques et corr\u00e9lations' : 'Parameters, stats & correlations',
        20
    );
    yPos += 5;

    // ===== 1. SETTINGS (single compact row) =====
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(language === 'fr' ? '1. Param\u00e8tres de simulation' : '1. Simulation parameters', 15, yPos);
    yPos += 5;

    autoTable(pdf, {
        startY: yPos,
        head: [[
            language === 'fr' ? 'It\u00e9rations' : 'Iterations',
            language === 'fr' ? 'Pas de temps' : 'Time step',
            language === 'fr' ? 'Historique' : 'History',
            language === 'fr' ? 'Horizon' : 'Horizon'
        ]],
        body: [[
            String(settings?.iterations || 0).replace(/\B(?=(\d{3})+(?!\d))/g, "'"),
            language === 'fr' ? 'Mensuel' : (settings?.step || 'Monthly'),
            `${historyInfo?.sampleSize || 0} ${language === 'fr' ? 'mois' : 'mo.'}`,
            `${Math.round((settings?.horizonMonths || 0) / 12)} ${language === 'fr' ? 'ans' : 'yrs'} (${settings?.horizonMonths || 0} ${language === 'fr' ? 'mois' : 'mo.'})`
        ]],
        theme: 'plain',
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 6, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
        styles: { fontSize: 7, halign: 'center', valign: 'middle', fontStyle: 'bold', cellPadding: 2 },
        margin: { left: 15, right: 15 }
    });
    yPos = pdf.lastAutoTable.finalY + 6;

    // ===== 2. INSTRUMENT DETAILS (Merged History & Specs) =====
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(46, 204, 113);
    pdf.text(language === 'fr' ? '2. Caract\u00e9ristiques et historique des instruments' : '2. Instrument characteristics & history', 15, yPos);
    yPos += 5;

    if (assetStats && assetStats.length > 0) {
        autoTable(pdf, {
            startY: yPos,
            head: [[
                language === 'fr' ? 'Instrument' : 'Instrument',
                language === 'fr' ? 'D\u00e9but' : 'Start',
                language === 'fr' ? 'Fin' : 'End',
                'Rend. moy.',
                'Volatilit\u00e9',
                'Max DD'
            ]],
            body: assetStats.map(a => [
                a.name || 'N/A',
                a.startDate || 'N/A',
                a.endDate || 'N/A',
                `${(a.meanReturnAnnual || 0).toFixed(2)}%`,
                `${(a.volatilityAnnual || 0).toFixed(2)}%`,
                `${(a.maxDrawdown || 0).toFixed(2)}%`
            ]),
            theme: 'plain',
            headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 6, fontStyle: 'bold', valign: 'middle', cellPadding: 2 },
            styles: { fontSize: 6, valign: 'middle', cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 22 },
                2: { cellWidth: 22 },
                3: { cellWidth: 22, textColor: [34, 197, 94] },
                4: { cellWidth: 22, textColor: [239, 68, 68] },
                5: { cellWidth: 22, textColor: [245, 158, 11] }
            },
            didParseCell: function(data) {
                if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'center';
                if (data.column.index >= 3) data.cell.styles.halign = 'right';
            },
            margin: { left: 15, right: 15 }
        });
        yPos = pdf.lastAutoTable.finalY + 6;
    }


    // Short labels for matrices
    const shortLabels = assetStats?.map(a => a.name || a.portfolioName || a.id || '?') || [];

    // ===== 4. CORRELATION MATRIX =====
    if (corrMatrix && corrMatrix.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(language === 'fr' ? '4. Matrice de corr\u00e9lation' : '4. Correlation matrix', 15, yPos);
        yPos += 5;

        autoTable(pdf, {
            startY: yPos,
            head: [['', ...shortLabels]],
            body: corrMatrix.map((row, i) => [shortLabels[i] || '', ...row.map(v => v.toFixed(3))]),
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 5, valign: 'middle', cellPadding: 1.5 },
            styles: { fontSize: 5, valign: 'middle', cellPadding: 1.5 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 70 } },
            didParseCell: function(data) {
                if (data.column.index === 0) data.cell.styles.halign = 'left';
                else data.cell.styles.halign = 'center';
            },
            margin: { left: 15, right: 15 }
        });
        yPos = pdf.lastAutoTable.finalY + 6;
    }

    // ===== 5. COVARIANCE MATRIX =====
    if (covMatrix && covMatrix.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(99, 102, 241);
        pdf.text(language === 'fr' ? '5. Matrice de covariance' : '5. Covariance matrix', 15, yPos);
        yPos += 5;

        autoTable(pdf, {
            startY: yPos,
            head: [['', ...shortLabels]],
            body: covMatrix.map((row, i) => [shortLabels[i] || '', ...row.map(v => (v * 12 * 10000).toFixed(1))]),
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: 255, fontSize: 5, valign: 'middle', cellPadding: 1.5 },
            styles: { fontSize: 5, valign: 'middle', cellPadding: 1.5 },
            columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 70 } },
            didParseCell: function(data) {
                if (data.column.index === 0) data.cell.styles.halign = 'left';
                else data.cell.styles.halign = 'center';
            },
            margin: { left: 15, right: 15 }
        });
        yPos = pdf.lastAutoTable.finalY + 3;

        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(130, 130, 130);
        pdf.text(
            language === 'fr'
                ? '* Covariance annualis\u00e9e x10 000. Diagonale = volatilit\u00e9 au carr\u00e9 annuelle.'
                : '* Annualized covariance x10,000. Diagonal = squared annual volatility.',
            15, yPos
        );
        yPos += 6;
    }

    // ===== 6. INTERPRETATION NOTE (one-line compact) =====
    const noteText = language === 'fr'
        ? "Statistiques bas\u00e9es sur les Log Returns historiques. Mod\u00e8le GBM avec r\u00e9\u00e9quilibrage annuel. La matrice de corr\u00e9lation synchronise les mouvements d'actifs."
        : "Stats based on historical Log Returns. GBM model with annual rebalancing. Correlation matrix ensures realistic asset co-movement.";
    
    const noteBoxHeight = 6; // Fixed single line height

    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(15, yPos, pageWidth - 30, noteBoxHeight, 1.5, 1.5, 'FD');

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text(language === 'fr' ? 'Note' : 'Note', 19, yPos + 4.2);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(50, 50, 50);
    pdf.text(noteText, 30, yPos + 4.2);

    addPageNumber(pdf, pageNum, totalPages, language);
};

