"""
Complete rewrite of TOC approach - don't move pages, generate in correct order
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the section where we skip page 2 (around line 1432-1437)
# Replace it to actually generate a placeholder page
for i, line in enumerate(lines):
    if '// ===== PAGE 2: TABLE OF CONTENTS (will be generated at end and moved here) =====' in line:
        # Found the start, replace the next few lines
        lines[i] = '      // ===== PAGE 2: TABLE OF CONTENTS (placeholder, will update later) =====\n'
        lines[i+1] = '      pdf.addPage(); // Add blank page 2 for TOC\n'
        lines[i+2] = '      currentPage++;\n'
        lines[i+3] = '\n'
        break

# Find the section where we generate and move TOC (around line 1533-1540)
# Replace it to use setPage to update page 2
for i, line in enumerate(lines):
    if '// ===== GENERATE FINAL TABLE OF CONTENTS =====' in line:
        # Replace the entire TOC generation and movement section
        end_idx = i
        while end_idx < len(lines) and 'pdf.movePage' not in lines[end_idx]:
            end_idx += 1
        end_idx += 1  # Include the movePage line
        
        # Replace with new approach
        new_lines = [
            '      // ===== UPDATE TABLE OF CONTENTS ON PAGE 2 =====\n',
            '      // Navigate to page 2 and generate TOC with actual page numbers\n',
            '      pdf.setPage(2);\n',
            '      generateTableOfContents(pdf, pageNumbers, language);\n',
            '\n'
        ]
        
        lines[i:end_idx+1] = new_lines
        break

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Rewrote TOC generation to use setPage on blank page 2")
