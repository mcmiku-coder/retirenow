/**
 * New Comprehensive PDF Generation Function
 * This file contains the refactored generatePDF function that uses modular page generators
 * 
 * To integrate: Replace the existing generatePDF function in ScenarioResult.js (lines 1392-2174)
 * with the function below, and add the necessary imports at the top of the file.
 */

// Add these imports at the top of ScenarioResult.js:
/*
import {
  generateCoverPage,
  generateTableOfContents,
  generateSimulationSummary
} from '../utils/pdfPageGenerators';

import {
  generatePersonalInfo,
  generateIncomeAssets,
  generateCostDebts
} from '../utils/pdfPageGenerators2';

import {
  generateSimulationChoice,
  generateRetirementBenefits,
  generateDataReview
} from '../utils/pdfPageGenerators3';

import {
  generateLandscapeGraph,
  generateYearByYearBreakdown,
  generateLodgingAnnex,
  generateInvestmentInfo,
  generateLegalWarnings
} from '../utils/pdfPageGenerators4';
*/

// Replace the existing generatePDF function with this:
const generatePDF = async () => {
    try {
        setGeneratingPdf(true);

        const pdf = new jsPDF('p', 'mm', 'a4');

        // Page tracking object
        const pageNumbers = {};
        let currentPage = 1;

        // ===== PAGE 1: COVER PAGE =====
        await generateCoverPage(pdf, language);
        currentPage++;

        // ===== PAGE 2: TABLE OF CONTENTS (placeholder, will update at end) =====
        // We'll generate this at the end when we know all page numbers
        const tocPageIndex = currentPage;
        currentPage++;

        // ===== PAGE 3: SIMULATION SUMMARY =====
        pageNumbers.summary = currentPage;
        const finalBalance = projections && projections.length > 0
            ? projections[projections.length - 1].cumulativeBalance
            : 0;

        const summaryData = {
            finalBalance,
            retirementAge: scenarioData?.retirementAge || 65,
            yearsInRetirement: projections?.length || 0,
            deathDate: userData?.theoreticalDeathDate,
            peakWealth: Math.max(...(projections?.map(p => p.cumulativeBalance) || [0])),
            totalPages: 14 // Will be updated
        };

        await generateSimulationSummary(pdf, summaryData, language, currentPage);
        currentPage++;

        // ===== PAGE 4: PERSONAL INFO =====
        pageNumbers.personal = currentPage;
        generatePersonalInfo(pdf, userData, scenarioData, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 5: INCOME & ASSETS =====
        pageNumbers.incomeAssets = currentPage;
        generateIncomeAssets(pdf, income, assets, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 6: COSTS & DEBTS =====
        pageNumbers.costDebts = currentPage;
        generateCostDebts(pdf, costs, debts, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 7: SIMULATION CHOICE =====
        pageNumbers.simChoice = currentPage;
        generateSimulationChoice(pdf, scenarioData, userData, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 8: RETIREMENT BENEFITS =====
        pageNumbers.benefits = currentPage;
        generateRetirementBenefits(pdf, scenarioData, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 9: DATA REVIEW =====
        pageNumbers.dataReview = currentPage;
        const allData = {
            income: income.filter(i => activeFilters[`income-${i.id || i.name}`]),
            assets: assets.filter(a => activeFilters[`asset-${a.id || a.name}`]),
            costs: costs.filter(c => activeFilters[`cost-${c.id || c.name}`]),
            debts: debts.filter(d => activeFilters[`debt-${d.id || d.name}`])
        };
        generateDataReview(pdf, allData, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 10: LANDSCAPE GRAPH =====
        pageNumbers.graph = currentPage;
        const graphElement = document.querySelector('.recharts-wrapper'); // Adjust selector as needed
        await generateLandscapeGraph(pdf, graphElement, summaryData, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 11: YEAR-BY-YEAR BREAKDOWN =====
        pageNumbers.breakdown = currentPage;
        generateYearByYearBreakdown(pdf, projections, language, currentPage, summaryData.totalPages);
        currentPage++;

        // ===== PAGE 12: LODGING ANNEX =====
        pageNumbers.lodging = currentPage;
        generateLodgingAnnex(pdf, realEstateData, language, currentPage, summaryData.totalPages);

        // Lodging annex may add multiple pages for owners with multiple properties
        const propertiesCount = realEstateData?.lodgingSituation === 'owner'
            ? (realEstateData?.properties?.length || 1)
            : 1;
        currentPage += propertiesCount;

        // ===== PAGE 13: INVESTMENT INFO (CONDITIONAL) =====
        if (instrumentData && instrumentData.length > 0) {
            pageNumbers.investments = currentPage;
            generateInvestmentInfo(pdf, instrumentData, language, currentPage, summaryData.totalPages);
            currentPage++;
        }

        // ===== PAGE 14: LEGAL WARNINGS =====
        pageNumbers.warnings = currentPage;
        generateLegalWarnings(pdf, language, currentPage, summaryData.totalPages);
        currentPage++;

        // Update total pages
        pageNumbers.total = currentPage - 1;
        summaryData.totalPages = pageNumbers.total;

        // ===== NOW GENERATE TABLE OF CONTENTS =====
        // Remove the placeholder TOC page and insert the real one
        pdf.deletePage(tocPageIndex);
        pdf.insertPage(tocPageIndex);
        pdf.setPage(tocPageIndex);
        generateTableOfContents(pdf, pageNumbers, language);

        // Save PDF
        pdf.save(`retirement-simulation-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success(language === 'fr' ? 'Rapport PDF généré avec succès' : 'PDF report generated successfully');

    } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error(language === 'fr' ? 'Erreur lors de la génération du PDF' : 'Error generating PDF');
    } finally {
        setGeneratingPdf(false);
    }
};
