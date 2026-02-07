"""
Fix undefined projections variable in ScenarioResult.js
Replace 'projections' with 'yearlyData' derived from projection.yearlyBreakdown
"""

import re

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the problematic section
# We need to add yearlyData definition and replace projections references

# Pattern 1: Add yearlyData definition after pageNumbers.summary
pattern1 = r'(pageNumbers\.summary = currentPage;)\s*\n\s*(const finalBalance = projections)'
replacement1 = r'\1\n      const yearlyData = projection?.yearlyBreakdown || [];\n      const finalBalance = yearlyData'

content = re.sub(pattern1, replacement1, content)

# Pattern 2: Replace projections.length with yearlyData.length
content = content.replace('projections && projections.length > 0', 'yearlyData.length > 0')
content = content.replace('projections[projections.length - 1]', 'yearlyData[yearlyData.length - 1]')
content = content.replace('yearsInRetirement: projections?.length', 'yearsInRetirement: yearlyData.length')
content = content.replace('projections?.map(p => p.cumulativeBalance)', 'yearlyData.map(p => p.cumulativeBalance)')

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed projections variable references")
print("- Added yearlyData definition")
print("- Replaced all projections references with yearlyData")
