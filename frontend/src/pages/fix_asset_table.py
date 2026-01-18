import re

# Read the file
with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Identify the Assets Table Section
start_marker = 'currentAssets.map'
end_marker = 'desiredOutflows.map'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not locate sections properly.")
    exit(1)

# Extract sections
pre_assets = content[:start_idx]
assets_section = content[start_idx:end_idx]
post_assets = content[end_idx:]

# 2. Fix the Assets Section
# Replace debt usages with asset references
# Replace updateDebt with updateAsset
# Replace madeAvailable... with availability...

# Fix variable references
assets_section = assets_section.replace('debt.id', 'asset.id')
# Note: I saw `value={asset.category}` was correct, so `debt.` might only be used in some places.
# But `debt.madeAvailableType` was definitely there.
assets_section = assets_section.replace('debt.madeAvailableType', 'asset.availabilityType')
assets_section = assets_section.replace('debt.madeAvailableTimeframe', 'asset.availabilityTimeframe')
assets_section = assets_section.replace('debt.madeAvailableDate', 'asset.availabilityDate')

# Fix function calls
assets_section = assets_section.replace('updateDebt', 'updateAsset')

# Fix string literals
assets_section = assets_section.replace("'madeAvailableType'", "'availabilityType'")
assets_section = assets_section.replace("'madeAvailableTimeframe'", "'availabilityTimeframe'")
assets_section = assets_section.replace("'madeAvailableDate'", "'availabilityDate'")

# Safeguard: existing `asset.` references should remain touched by `debt.` replacements? 
# No, `debt.` replacements only target `debt.`.

# What about `asset.availabilityType` being replaced? 
# My logic: replace `debt.madeAvailableType` -> `asset.availabilityType`.
# If the code already had `asset.availabilityType` (which it shouldn't if I messed it up, but if it did), it won't match `debt.`.

# However, earlier I saw line 1528: `value={debt.madeAvailableType ...`
# So I need to fix that.

# Also saw line 1501: `updateDebt(debt.id, 'category', value)`
# Replaces `debt.id` -> `asset.id`.
# Replaces `updateDebt` -> `updateAsset`.
# Result: `updateAsset(asset.id, 'category', value)` -> Correct.

# Recombine content
new_content = pre_assets + assets_section + post_assets

with open('d:/AI/retirenow/retirenow/frontend/src/pages/DataReview.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed variable references in Assets table!")
