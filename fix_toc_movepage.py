"""
Fix TOC by using jsPDF's movePage method or alternative approach
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the page movement code with movePage method
old_code = """      // ===== GENERATE FINAL TABLE OF CONTENTS =====
      // Generate TOC with actual page numbers (this adds it as the last page)
      generateTableOfContents(pdf, pageNumbers, language);
      
      // Move the TOC page from last position to position 2
      // jsPDF stores pages in internal.pages array (1-indexed, pages[0] is undefined)
      const pages = pdf.internal.pages;
      console.log('Pages array before move:', pages.length, 'pages');
      console.log('Page numbers object:', pageNumbers);
      const tocPage = pages.pop(); // Remove last page (TOC)
      console.log('TOC page content length:', tocPage ? tocPage.length : 'null');
      pages.splice(2, 0, tocPage); // Insert at index 2 (which is page 2)
      console.log('Pages array after move:', pages.length, 'pages');"""

new_code = """      // ===== GENERATE FINAL TABLE OF CONTENTS =====
      // Generate TOC with actual page numbers (this adds it as the last page)
      generateTableOfContents(pdf, pageNumbers, language);
      
      // Move the TOC page from last position to position 2
      // Use jsPDF's movePage method
      const totalPages = pdf.internal.pages.length - 1; // -1 because index 0 is undefined
      console.log('Moving TOC from page', totalPages, 'to page 2');
      console.log('Page numbers:', pageNumbers);
      pdf.movePage(totalPages, 2); // Move last page to position 2"""

content = content.replace(old_code, new_code)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated to use movePage method")
