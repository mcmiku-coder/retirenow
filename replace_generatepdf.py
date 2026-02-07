"""
Replace old generatePDF function with new modular version
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start and end of the old generatePDF function
start_line = None
end_line = None

for i, line in enumerate(lines):
    if '// Generate Comprehensive PDF Report' in line or 'const generatePDF = async () =>' in line:
        if start_line is None:
            start_line = i
    if start_line is not None and i > start_line and line.strip() == '};' and 'generatePDF' in ''.join(lines[start_line:i+1]):
        # Check if this is the closing brace of generatePDF
        # Count opening and closing braces
        func_text = ''.join(lines[start_line:i+1])
        if func_text.count('{') == func_text.count('}'):
            end_line = i
            break

if start_line is None or end_line is None:
    print(f"Could not find generatePDF function boundaries. Start: {start_line}, End: {end_line}")
    exit(1)

print(f"Found generatePDF function from line {start_line+1} to {end_line+1}")

# New generatePDF function
new_function = '''  // Generate PDF Report
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
      
      // ===== PAGE 2: TABLE OF CONTENTS (blank for now, will populate at end) =====
      pdf.addPage(); // Add blank page 2
      currentPage++;
      
      // ===== PAGE 3: SIMULATION SUMMARY =====
      pageNumbers.summary = currentPage;
      const yearlyData = projection?.yearlyBreakdown || [];
      const finalBalance = yearlyData.length > 0 
        ? yearlyData[yearlyData.length - 1].cumulativeBalance 
        : projection?.finalBalance || 0;
      
      const summaryData = {
        finalBalance,
        retirementAge: scenarioData?.retirementAge || 65,
        yearsInRetirement: yearlyData.length || 0,
        deathDate: userData?.theoreticalDeathDate,
        peakWealth: Math.max(...(yearlyData.map(p => p.cumulativeBalance) || [0])),
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
      generateIncomeAssets(pdf, incomes, assets, language, currentPage, summaryData.totalPages);
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
        income: incomes.filter(i => activeFilters[`income-${i.id || i.name}`]),
        assets: assets.filter(a => activeFilters[`asset-${a.id || a.name}`]),
        costs: costs.filter(c => activeFilters[`cost-${c.id || c.name}`]),
        debts: debts.filter(d => activeFilters[`debt-${d.id || d.name}`])
      };
      generateDataReview(pdf, allData, language, currentPage, summaryData.totalPages);
      currentPage++;
      
      // ===== PAGE 10: LANDSCAPE GRAPH =====
      pageNumbers.graph = currentPage;
      const graphElement = document.querySelector('.recharts-wrapper');
      await generateLandscapeGraph(pdf, graphElement, summaryData, language, currentPage, summaryData.totalPages);
      currentPage++;
      
      // ===== PAGE 11: YEAR-BY-YEAR BREAKDOWN =====
      pageNumbers.breakdown = currentPage;
      generateYearByYearBreakdown(pdf, yearlyData, language, currentPage, summaryData.totalPages);
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
      // Get investment data from assets or a separate state if available
      const investmentAssets = assets.filter(a => a.category === 'investment' || a.strategy);
      if (investmentAssets && investmentAssets.length > 0) {
        pageNumbers.investments = currentPage;
        generateInvestmentInfo(pdf, investmentAssets, language, currentPage, summaryData.totalPages);
        currentPage++;
      }
      
      // ===== PAGE 14: LEGAL WARNINGS =====
      pageNumbers.warnings = currentPage;
      generateLegalWarnings(pdf, language, currentPage, summaryData.totalPages);
      currentPage++;
      
      // Update total pages
      pageNumbers.total = currentPage - 1;
      summaryData.totalPages = pageNumbers.total;
      
      // ===== UPDATE TABLE OF CONTENTS ON PAGE 2 =====
      // Navigate to page 2 and generate TOC with actual page numbers
      pdf.setPage(2);
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
'''

# Replace the old function with the new one
new_lines = lines[:start_line] + [new_function + '\n'] + lines[end_line+1:]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Successfully replaced generatePDF function")
print(f"Old function: {end_line - start_line + 1} lines")
print(f"New function: {len(new_function.split(chr(10)))} lines")
