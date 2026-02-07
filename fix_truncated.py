"""
Fix the truncated ScenarioResult.js file - add back the missing closing code
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if the file ends abruptly
if content.strip().endswith('generateTableOfContents(pdf, pageNumbers, language);'):
    # Add the missing closing code
    content += """

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

  // Export to Excel
  const exportExcel = () => {
"""
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed truncated file - added back missing closing code")
else:
    print("File doesn't appear to be truncated in the expected way")
    print("Last 100 characters:", content[-100:])
