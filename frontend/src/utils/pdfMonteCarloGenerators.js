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
        language === 'fr' ? 'Résultats Conservateurs (Stress)' : 'Conservative Portfolio Outcomes',
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
        pdf.text('P10 (Conservative Total)', chartX + 15, chartY + 11);

        pdf.setFillColor(220, 20, 60);
        pdf.circle(chartX + 10, chartY + 20, 2, 'F');
        pdf.text('P5 (Extreme Stress Total)', chartX + 15, chartY + 21);
    }
    yPos += chartHeight + 15;

    // B2 - Year-by-Year Table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(language === 'fr' ? 'Détail Annuel (Stress)' : 'Annual Breakdown (Stress)', 20, yPos);
    yPos += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    const methodNote = language === 'fr'
        ? "Note: 'Libre' = Cash-Only Baseline B(t). 'Totaux' = B(t) + Evolution Boursière."
        : "Note: 'Cash-Only' = Baseline B(t). 'Totals' = B(t) + Portfolio Performance.";
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
                ? `> Début (Après apport ${formatCurrency(firstFlow.amount)})`
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
            language === 'fr' ? 'Année' : 'Year',
            language === 'fr' ? 'Type / Situation Cash' : 'Event / Cash-Only Base',
            'Invested (P10)',
            'Invested (P5)',
            'Total (P10)',
            'Total (P5)'
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
    pdf.text(language === 'fr' ? 'Métriques Finales de Stress' : 'Final Stress Metrics', 20, yPos);
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
        [`Final Wealth (P10 Conservative)`, formatCurrency(T10_final)],
        [`Final Wealth (P5 Extreme)`, formatCurrency(T5_final)],
        [`Max Drawdown (P10 Portfolio)`, `-${(computeDD(simulationResult.percentiles?.p10 || []) * 100).toFixed(1)}%`],
        [`Max Drawdown (P5 Portfolio)`, `-${(computeDD(simulationResult.percentiles?.p5 || []) * 100).toFixed(1)}%`]
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
