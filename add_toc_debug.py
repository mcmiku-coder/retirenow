"""
Add console logging to debug TOC page movement
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and add logging
old_code = """      // Move the TOC page from last position to position 2
      // jsPDF stores pages in internal.pages array
      const pages = pdf.internal.pages;
      const tocPage = pages.pop(); // Remove last page (TOC)
      pages.splice(2, 0, tocPage); // Insert at position 2 (after cover page)"""

new_code = """      // Move the TOC page from last position to position 2
      // jsPDF stores pages in internal.pages array (1-indexed, pages[0] is undefined)
      const pages = pdf.internal.pages;
      console.log('Pages array before move:', pages.length, 'pages');
      console.log('Page numbers object:', pageNumbers);
      const tocPage = pages.pop(); // Remove last page (TOC)
      console.log('TOC page content length:', tocPage ? tocPage.length : 'null');
      pages.splice(2, 0, tocPage); // Insert at index 2 (which is page 2)
      console.log('Pages array after move:', pages.length, 'pages');"""

content = content.replace(old_code, new_code)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added debugging logs for TOC page movement")
