import re

file_path = 'd:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Use rfind to get the LAST occurrences (likely the JSX render part)
start_idx = content.rfind("currentAssets.map")
end_idx = content.rfind("desiredOutflows.map")

print(f"Last currentAssets.map index: {start_idx}")
print(f"Last desiredOutflows.map index: {end_idx}")

if start_idx == -1 or end_idx == -1:
    print("Could not locate sections.")
    exit(1)

if start_idx > end_idx:
    print("WARNING: currAssets appears AFTER desiredOutflows? Strange.")
    # Maybe check context. 
    # But usually Assets table is before Debts table.
    pass

# Extract the target section (Assets Table Render)
pre_assets = content[:start_idx]
assets_section = content[start_idx:end_idx]
post_assets = content[end_idx:]

print(f"Processing Assets section ({len(assets_section)} chars)...")

# Debug what we found
print("Occurrences of 'debt.id':", assets_section.count('debt.id'))
print("Occurrences of 'updateDebt':", assets_section.count('updateDebt'))

if assets_section.count('debt.id') == 0:
    print("No 'debt.id' found. Maybe incorrect section?")
    # Let's print a small snippet to see what this section is
    print("Snippet:", assets_section[:200])
    # If this is the render section, it should have the broken code.
    # If the broken code is missing, maybe I already fixed it and view_file is lying?
    # Or maybe the broken code uses `asset` but `updateDebt`?
    pass

# Perform Replacements
# 1. Variable references
assets_section = assets_section.replace('debt.id', 'asset.id')

# 2. Function calls
assets_section = assets_section.replace('updateDebt', 'updateAsset')

# 3. Field names
assets_section = assets_section.replace('debt.madeAvailableType', 'asset.availabilityType')
assets_section = assets_section.replace('debt.madeAvailableTimeframe', 'asset.availabilityTimeframe')
assets_section = assets_section.replace('debt.madeAvailableDate', 'asset.availabilityDate')

# 4. String literals
assets_section = assets_section.replace("'madeAvailableType'", "'availabilityType'")
assets_section = assets_section.replace("'madeAvailableTimeframe'", "'availabilityTimeframe'")
assets_section = assets_section.replace("'madeAvailableDate'", "'availabilityDate'")

# 5. Fix any remaining `debt` references that might be `value={debt...`
# If we replaced `debt.id`, `debt.madeAvailable...`, what else?
# `value={debt.amount}` -> Correct is `asset.amount`.
# `value={debt.name}` -> Correct is `asset.name`.
assets_section = assets_section.replace('debt.amount', 'asset.amount')
assets_section = assets_section.replace('debt.name', 'asset.name')
assets_section = assets_section.replace('debt.adjustedAmount', 'asset.adjustedAmount')

# 6. Generic safeguard for strict `debt.` usage in this block
assets_section = assets_section.replace('debt.', 'asset.')

new_content = pre_assets + assets_section + post_assets

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed Assets table render section using rfind strategy.")
