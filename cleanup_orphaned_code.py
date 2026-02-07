"""
Script to remove orphaned PDF generation code from ScenarioResult.js
This removes lines 1559-2305 which contain old PDF code outside function scope
"""

import os

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines before: {len(lines)}")

# Find the start and end of orphaned code
# Start: line 1559 (index 1558) - should contain "pdf.setFont"
# End: line 2305 (index 2304) - just before "// Export to Excel"

# Verify we're deleting the right content
start_idx = 1558  # Line 1559 (0-indexed)
end_idx = 2304    # Line 2305 (0-indexed)

print(f"\nLine {start_idx + 1} (start): {lines[start_idx].strip()[:50]}")
print(f"Line {end_idx + 1} (end): {lines[end_idx].strip()[:50]}")

# Check if we can find the markers
if 'pdf.setFont' in lines[start_idx]:
    print("\nFound correct start marker, proceeding with deletion...")
    
    # Remove the orphaned code
    new_lines = lines[:start_idx] + lines[end_idx:]
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Successfully removed {end_idx - start_idx} lines")
    print(f"Total lines after: {len(new_lines)}")
    print("\nFile cleaned successfully!")
else:
    print("\nERROR: Markers not found at expected positions")
    print("Please check the file manually")
