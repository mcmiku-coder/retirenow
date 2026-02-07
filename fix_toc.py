"""
Fix TOC generation - generate it at page 2 initially instead of creating placeholder
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the TOC placeholder section
old_code = """      // ===== PAGE 2: TABLE OF CONTENTS (placeholder, will update at end) =====
      // We'll generate this at the end when we know all page numbers
      const tocPageIndex = currentPage;
      currentPage++;"""

new_code = """      // ===== PAGE 2: TABLE OF CONTENTS (generate now, update page numbers later) =====
      generateTableOfContents(pdf, {}, language); // Empty pageNumbers initially
      currentPage++;"""

content = content.replace(old_code, new_code)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed TOC generation - now generates at page 2 initially")
