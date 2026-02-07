"""
Fix remaining projections reference in ScenarioResult.js line 1442
"""

file_path = r"d:\AI\retirenow\retirenow\frontend\src\pages\ScenarioResult.js"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific line
content = content.replace('yearlyData && projections.length > 0', 'yearlyData.length > 0')

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed remaining projections reference on line 1442")
